// Contenido editable del sitio: cultivos, docentes, tarjetas de inicio y páginas de texto.
import { Router } from 'express';
import { db } from '../db.js';
import { soloDocentes } from '../auth.js';
import { sanitizarHTML } from '../sanitizar.js';
import { urlArchivoValida, borrarSiNoSeUsan, archivosEnHTML } from '../archivos.js';
import { texto, idValido } from '../util.js';

const rutas = Router();

// ---------- Listas ordenables con foto (panel) ----------
// Arma las rutas /api/admin/<ruta> para listar, crear, editar, borrar y reordenar.
// Los nombres de tabla y columnas vienen de acá, nunca del cliente.
//   campos: { columna: { max, requerido, etiqueta } }
//   imagen: columna con la foto (archivo subido o imagen del sitio)
//   validar(datos): mensaje de error o null
//   alCrear(datos): columnas extra al crear (por ejemplo, el slug)
function coleccion({ tabla, ruta, campos, imagen, validar, alCrear }) {
    const columnas = Object.keys(campos);

    function leer(body) {
        const datos = {};
        for (const [columna, { max, requerido, etiqueta }] of Object.entries(campos)) {
            datos[columna] = texto(body?.[columna], max);
            if (requerido && !datos[columna]) return { error: `Falta ${etiqueta}.` };
        }
        datos[imagen] = body?.[imagen] || null;
        if (datos[imagen] && !urlArchivoValida(datos[imagen], { delSitio: true })) {
            return { error: 'La foto no es válida. Volvé a subirla.' };
        }
        const error = validar?.(datos);
        return error ? { error } : { datos };
    }

    rutas.get(`/api/admin/${ruta}`, soloDocentes, async (req, res) => {
        const { rows } = await db.execute(`SELECT * FROM ${tabla} ORDER BY orden, id`);
        res.json(rows);
    });

    rutas.post(`/api/admin/${ruta}`, soloDocentes, async (req, res) => {
        const { datos, error } = leer(req.body);
        if (error) return res.status(400).json({ error });
        Object.assign(datos, await alCrear?.(datos));

        const nombres = [...Object.keys(datos), 'autor_id', 'orden'];
        const { lastInsertRowid } = await db.execute({
            sql: `INSERT INTO ${tabla} (${nombres.join(', ')})
                  VALUES (${Object.keys(datos).map(() => '?').join(', ')}, ?, (SELECT COALESCE(MAX(orden), 0) + 1 FROM ${tabla}))`,
            args: [...Object.values(datos), req.usuario.id],
        });
        res.status(201).json({ ok: true, id: Number(lastInsertRowid) });
    });

    rutas.put(`/api/admin/${ruta}/:id`, soloDocentes, async (req, res) => {
        const id = idValido(req.params.id);
        const { datos, error } = leer(req.body);
        if (error) return res.status(400).json({ error });

        const { rows } = await db.execute({ sql: `SELECT ${imagen} AS imagen FROM ${tabla} WHERE id = ?`, args: [id] });
        if (!rows.length) return res.status(404).json({ error: 'Ya no existe. Recargá la lista.' });

        const asignaciones = [...columnas, imagen].map(c => `${c} = ?`).join(', ');
        await db.execute({
            sql: `UPDATE ${tabla} SET ${asignaciones}, autor_id = ?, actualizado_en = datetime('now') WHERE id = ?`,
            args: [...columnas.map(c => datos[c]), datos[imagen], req.usuario.id, id],
        });
        // Si se cambió la foto, la vieja se borra de Blob (si nadie más la usa).
        if (rows[0].imagen !== datos[imagen]) await borrarSiNoSeUsan([rows[0].imagen]);
        res.json({ ok: true });
    });

    rutas.delete(`/api/admin/${ruta}/:id`, soloDocentes, async (req, res) => {
        const id = idValido(req.params.id);
        const { rows } = await db.execute({ sql: `SELECT ${imagen} AS imagen FROM ${tabla} WHERE id = ?`, args: [id] });
        await db.execute({ sql: `DELETE FROM ${tabla} WHERE id = ?`, args: [id] });
        await borrarSiNoSeUsan([rows[0]?.imagen]);
        res.json({ ok: true });
    });

    // Recibe { ids: [3, 1, 2] } con el orden nuevo completo.
    rutas.post(`/api/admin/${ruta}/orden`, soloDocentes, async (req, res) => {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(idValido) : [];
        if (!ids.length || ids.includes(null)) return res.status(400).json({ error: 'Orden inválido.' });
        await db.batch(ids.map((id, orden) => ({
            sql: `UPDATE ${tabla} SET orden = ?, autor_id = ? WHERE id = ?`,
            args: [orden, req.usuario.id, id],
        })), 'write');
        res.json({ ok: true });
    });
}

// ---------- Cultivos ----------

// "Repollo Morado" → "repollo-morado"
export function crearSlug(textoOriginal) {
    return textoOriginal.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'cultivo';
}

coleccion({
    tabla: 'cultivos',
    ruta: 'cultivos',
    imagen: 'imagen',
    campos: {
        nombre: { max: 100, requerido: true, etiqueta: 'el nombre' },
        nombre_vulgar: { max: 300 },
        nombre_cientifico: { max: 200 },
        origen: { max: 1000 },
        caracteristicas: { max: 3000 },
        siembra: { max: 3000 },
        cosecha: { max: 3000 },
    },
    // El slug se arma con el nombre al crear y no cambia después (es la URL de la ficha).
    alCrear: async ({ nombre }) => {
        const base = crearSlug(nombre);
        let slug = base;
        for (let n = 2; (await db.execute({ sql: 'SELECT 1 FROM cultivos WHERE slug = ?', args: [slug] })).rows.length; n++) {
            slug = `${base}-${n}`;
        }
        return { slug };
    },
});

rutas.get('/api/cultivos', async (req, res) => {
    const { rows } = await db.execute('SELECT slug, nombre, imagen FROM cultivos ORDER BY orden, id');
    res.json(rows);
});

rutas.get('/api/cultivos/:slug', async (req, res) => {
    const { rows } = await db.execute({
        sql: `SELECT slug, nombre, imagen, nombre_vulgar, nombre_cientifico, origen, caracteristicas, siembra, cosecha
              FROM cultivos WHERE slug = ?`,
        args: [req.params.slug],
    });
    if (!rows.length) return res.status(404).json({ error: 'No encontramos ese cultivo.' });
    res.json(rows[0]);
});

// ---------- Docentes ----------

coleccion({
    tabla: 'docentes',
    ruta: 'docentes',
    imagen: 'foto',
    campos: {
        nombre: { max: 100, requerido: true, etiqueta: 'el nombre' },
        descripcion: { max: 300 },
    },
});

rutas.get('/api/docentes', async (req, res) => {
    const { rows } = await db.execute('SELECT id, nombre, descripcion, foto FROM docentes ORDER BY orden, id');
    res.json(rows);
});

// ---------- Tarjetas de inicio ----------

// Enlace a una página del sitio ("cursos.html") o a otro sitio (https://...).
function enlaceValido(enlace) {
    return /^[\w .%()-]+\.html(\?[\w=&.%-]*)?$/i.test(enlace) || /^https:\/\/[^\s"'<>]+$/.test(enlace) || enlace === '/';
}

coleccion({
    tabla: 'inicio_tarjetas',
    ruta: 'inicio',
    imagen: 'imagen',
    campos: {
        titulo: { max: 100, requerido: true, etiqueta: 'el título' },
        enlace: { max: 300, requerido: true, etiqueta: 'el enlace' },
    },
    validar: ({ enlace }) => enlaceValido(enlace) ? null : 'El enlace tiene que ser una página del sitio (por ejemplo "cursos.html") o empezar con https://',
});

rutas.get('/api/inicio', async (req, res) => {
    const { rows } = await db.execute('SELECT id, titulo, imagen, enlace FROM inicio_tarjetas ORDER BY orden, id');
    res.json(rows);
});

// ---------- Páginas de texto ----------
// Solo se editan las que ya existen: cada una tiene su archivo .html que la muestra.

rutas.get('/api/paginas/:slug', async (req, res) => {
    const { rows } = await db.execute({
        sql: 'SELECT slug, titulo, contenido_html, actualizado_en FROM paginas WHERE slug = ?',
        args: [req.params.slug],
    });
    if (!rows.length) return res.status(404).json({ error: 'Esta página todavía no tiene contenido.' });
    res.json(rows[0]);
});

rutas.get('/api/admin/paginas', soloDocentes, async (req, res) => {
    const { rows } = await db.execute(
        `SELECT p.slug, p.titulo, p.actualizado_en, u.nombre AS autor
         FROM paginas p LEFT JOIN usuarios u ON u.id = p.autor_id ORDER BY p.titulo`
    );
    res.json(rows);
});

rutas.get('/api/admin/paginas/:slug', soloDocentes, async (req, res) => {
    const { rows } = await db.execute({ sql: 'SELECT slug, titulo, contenido_html FROM paginas WHERE slug = ?', args: [req.params.slug] });
    if (!rows.length) return res.status(404).json({ error: 'No existe esa página.' });
    res.json(rows[0]);
});

rutas.put('/api/admin/paginas/:slug', soloDocentes, async (req, res) => {
    const titulo = texto(req.body?.titulo, 200);
    if (!titulo) return res.status(400).json({ error: 'Falta el título.' });
    if (typeof req.body?.contenido_html !== 'string' || req.body.contenido_html.length > 500_000) {
        return res.status(400).json({ error: 'El contenido es demasiado largo.' });
    }
    const html = sanitizarHTML(req.body.contenido_html);

    const { rows } = await db.execute({ sql: 'SELECT contenido_html FROM paginas WHERE slug = ?', args: [req.params.slug] });
    if (!rows.length) return res.status(404).json({ error: 'No existe esa página.' });

    await db.execute({
        sql: "UPDATE paginas SET titulo = ?, contenido_html = ?, autor_id = ?, actualizado_en = datetime('now') WHERE slug = ?",
        args: [titulo, html, req.usuario.id, req.params.slug],
    });
    // Las fotos que se sacaron de la página se borran de Blob (si nadie más las usa).
    const nuevas = archivosEnHTML(html);
    await borrarSiNoSeUsan(archivosEnHTML(rows[0].contenido_html).filter(url => !nuevas.includes(url)));
    res.json({ ok: true, contenido_html: html });
});

export default rutas;
