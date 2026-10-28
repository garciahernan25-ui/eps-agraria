// Publicaciones con fotos y videos: lista pública (por sección o todas) y edición desde el panel.
import { Router } from 'express';
import { db } from '../db.js';
import { soloDocentes } from '../auth.js';
import { SECCIONES, seccionValida } from '../secciones.js';
import { urlArchivoValida, borrarSiNoSeUsan } from '../archivos.js';
import { texto, idValido } from '../util.js';

const rutas = Router();
const POR_PAGINA = 10;
const MAX_MEDIOS = 30;

// Agrega a cada publicación su lista de medios, en orden.
async function conMedios(publicaciones) {
    if (!publicaciones.length) return [];
    const ids = publicaciones.map(p => p.id);
    const { rows } = await db.execute({
        sql: `SELECT id, publicacion_id, url, tipo FROM publicacion_medios
              WHERE publicacion_id IN (${ids.map(() => '?').join(',')}) ORDER BY orden, id`,
        args: ids,
    });
    return publicaciones.map(p => ({
        ...p,
        medios: rows.filter(m => m.publicacion_id === p.id).map(({ id, url, tipo }) => ({ id, url, tipo })),
    }));
}

rutas.get('/api/secciones', (req, res) => {
    res.json(SECCIONES);
});

// ---------- Público ----------

// ?seccion=huerta (opcional) &pagina=1
rutas.get('/api/publicaciones', async (req, res) => {
    const seccion = seccionValida(req.query.seccion) ? req.query.seccion : null;
    const pagina = Math.max(1, Math.min(1000, Number.parseInt(req.query.pagina, 10) || 1));
    const filtro = seccion ? 'AND p.seccion = ?' : '';
    const args = seccion ? [seccion] : [];

    const total = (await db.execute({
        sql: `SELECT COUNT(*) AS n FROM publicaciones p WHERE p.publicada = 1 ${filtro}`,
        args,
    })).rows[0].n;

    const { rows } = await db.execute({
        sql: `SELECT p.id, p.titulo, p.texto, p.seccion, p.creado_en, u.nombre AS autor
              FROM publicaciones p LEFT JOIN usuarios u ON u.id = p.autor_id
              WHERE p.publicada = 1 ${filtro}
              ORDER BY p.creado_en DESC, p.id DESC LIMIT ? OFFSET ?`,
        args: [...args, POR_PAGINA, (pagina - 1) * POR_PAGINA],
    });

    res.json({
        publicaciones: await conMedios(rows),
        pagina,
        paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
        total,
    });
});

// ---------- Panel ----------

rutas.get('/api/admin/publicaciones', soloDocentes, async (req, res) => {
    const { rows } = await db.execute(
        `SELECT p.id, p.titulo, p.texto, p.seccion, p.publicada, p.creado_en, p.actualizado_en, u.nombre AS autor
         FROM publicaciones p LEFT JOIN usuarios u ON u.id = p.autor_id
         ORDER BY p.creado_en DESC, p.id DESC LIMIT 300`
    );
    res.json(await conMedios(rows));
});

// Valida lo que manda el formulario. Devuelve { datos } o { error }.
function leerPublicacion(body) {
    const titulo = texto(body?.titulo, 200);
    const contenido = texto(body?.texto, 10000);
    const seccion = body?.seccion;
    const medios = Array.isArray(body?.medios) ? body.medios : [];

    if (!titulo) return { error: 'Falta el título.' };
    if (!seccionValida(seccion)) return { error: 'Elegí una sección.' };
    if (medios.length > MAX_MEDIOS) return { error: `Como máximo ${MAX_MEDIOS} fotos o videos por publicación.` };
    for (const m of medios) {
        if (!['foto', 'video'].includes(m?.tipo) || !urlArchivoValida(m?.url)) {
            return { error: 'Hay un archivo inválido. Volvé a subirlo.' };
        }
    }
    return { datos: { titulo, texto: contenido, seccion, publicada: body?.publicada === false ? 0 : 1, medios } };
}

function insertarMedios(id, medios) {
    return medios.map((m, orden) => ({
        sql: 'INSERT INTO publicacion_medios (publicacion_id, url, tipo, orden) VALUES (?, ?, ?, ?)',
        args: [id, m.url, m.tipo, orden],
    }));
}

rutas.post('/api/admin/publicaciones', soloDocentes, async (req, res) => {
    const { datos, error } = leerPublicacion(req.body);
    if (error) return res.status(400).json({ error });

    const { lastInsertRowid } = await db.execute({
        sql: 'INSERT INTO publicaciones (titulo, texto, seccion, autor_id, publicada) VALUES (?, ?, ?, ?, ?)',
        args: [datos.titulo, datos.texto, datos.seccion, req.usuario.id, datos.publicada],
    });
    const id = Number(lastInsertRowid);
    if (datos.medios.length) await db.batch(insertarMedios(id, datos.medios), 'write');
    res.status(201).json({ ok: true, id });
});

rutas.put('/api/admin/publicaciones/:id', soloDocentes, async (req, res) => {
    const id = idValido(req.params.id);
    const { datos, error } = leerPublicacion(req.body);
    if (error) return res.status(400).json({ error });

    const existe = await db.execute({ sql: 'SELECT 1 FROM publicaciones WHERE id = ?', args: [id] });
    if (!existe.rows.length) return res.status(404).json({ error: 'La publicación ya no existe.' });

    const anteriores = await db.execute({ sql: 'SELECT url FROM publicacion_medios WHERE publicacion_id = ?', args: [id] });
    const quitados = anteriores.rows.map(r => r.url).filter(url => !datos.medios.some(m => m.url === url));

    await db.batch([
        {
            sql: `UPDATE publicaciones SET titulo = ?, texto = ?, seccion = ?, publicada = ?, autor_id = ?,
                  actualizado_en = datetime('now') WHERE id = ?`,
            args: [datos.titulo, datos.texto, datos.seccion, datos.publicada, req.usuario.id, id],
        },
        { sql: 'DELETE FROM publicacion_medios WHERE publicacion_id = ?', args: [id] },
        ...insertarMedios(id, datos.medios),
    ], 'write');

    await borrarSiNoSeUsan(quitados);
    res.json({ ok: true });
});

rutas.delete('/api/admin/publicaciones/:id', soloDocentes, async (req, res) => {
    const id = idValido(req.params.id);
    const { rows } = await db.execute({ sql: 'SELECT url FROM publicacion_medios WHERE publicacion_id = ?', args: [id] });
    await db.batch([
        { sql: 'DELETE FROM publicacion_medios WHERE publicacion_id = ?', args: [id] },
        { sql: 'DELETE FROM publicaciones WHERE id = ?', args: [id] },
    ], 'write');
    await borrarSiNoSeUsan(rows.map(r => r.url));
    res.json({ ok: true });
});

export default rutas;
