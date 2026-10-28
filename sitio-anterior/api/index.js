import express from 'express';
import multer from 'multer';
import { put, del } from '@vercel/blob';
import { db } from './_lib/db.js';
import { claveCorrecta, soloDocentes } from './_lib/auth.js';
import { texto } from './_lib/util.js';
import rutasUsuarios from './_lib/rutas/usuarios.js';
import rutasSubidas from './_lib/rutas/subidas.js';
import rutasPublicaciones from './_lib/rutas/publicaciones.js';
import rutasContenido from './_lib/rutas/contenido.js';
import rutasInstagram from './_lib/rutas/instagram.js';

const app = express();
// El panel manda textos más largos (por ejemplo, el HTML de una página).
app.use('/api/admin', express.json({ limit: '1mb' }));
app.use(express.json({ limit: '50kb' }));

// Vercel no acepta cuerpos de más de 4.5 MB, así que las fotos se limitan a 4 MB.
const subida = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024, files: 1 },
    fileFilter: (req, archivo, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(archivo.mimetype)),
});

function nombreOpcional(body) {
    if (body.anonimo === 'anonimo') return null;
    return texto(body.nombre, 80) || null;
}

// ---------- Experiencias públicas ----------

app.get('/api/experiencias', async (req, res) => {
    const { rows } = await db.execute(
        "SELECT id, nombre, texto, foto_url, creado_en FROM experiencias WHERE estado = 'aprobada' ORDER BY creado_en DESC LIMIT 100"
    );
    res.json(rows);
});

app.post('/api/experiencias', subida.single('foto'), async (req, res) => {
    const contenido = texto(req.body.experiencia, 3000);
    if (contenido.length < 10) {
        return res.status(400).json({ error: 'Escribí al menos 10 caracteres.' });
    }

    let fotoUrl = null;
    if (req.file) {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return res.status(503).json({ error: 'La subida de fotos no está habilitada todavía.' });
        }
        const extension = req.file.mimetype.split('/')[1];
        const blob = await put(`experiencias/foto.${extension}`, req.file.buffer, {
            access: 'public',
            contentType: req.file.mimetype,
            addRandomSuffix: true,
        });
        fotoUrl = blob.url;
    }

    await db.execute({
        sql: 'INSERT INTO experiencias (nombre, texto, foto_url) VALUES (?, ?, ?)',
        args: [nombreOpcional(req.body), contenido, fotoUrl],
    });
    res.status(201).json({ ok: true });
});

// ---------- Buzón confidencial ----------

app.post('/api/buzon/acceso', (req, res) => {
    if (!claveCorrecta(req.body?.clave, process.env.CLAVE_ESTUDIANTES)) {
        return res.status(403).json({ error: 'Clave incorrecta.' });
    }
    res.json({ ok: true });
});

app.post('/api/buzon', async (req, res) => {
    if (!claveCorrecta(req.body?.clave, process.env.CLAVE_ESTUDIANTES)) {
        return res.status(403).json({ error: 'Clave incorrecta.' });
    }
    const contenido = texto(req.body.consulta, 5000);
    if (contenido.length < 20) {
        return res.status(400).json({ error: 'Escribí al menos 20 caracteres.' });
    }
    await db.execute({
        sql: 'INSERT INTO consultas (nombre, texto) VALUES (?, ?)',
        args: [nombreOpcional(req.body), contenido],
    });
    res.status(201).json({ ok: true });
});

// ---------- Resto de la API (cada archivo tiene sus rutas públicas y las del panel) ----------

app.use(rutasUsuarios);       // login, sesión y cuentas
app.use(rutasSubidas);        // subida de fotos y videos a Vercel Blob
app.use(rutasPublicaciones);  // publicaciones y secciones
app.use(rutasContenido);      // cultivos, docentes, inicio y páginas
app.use(rutasInstagram);      // galería y sincronización con Instagram

// ---------- Experiencias y buzón (panel) ----------

app.get('/api/admin/experiencias', soloDocentes, async (req, res) => {
    const { rows } = await db.execute(
        'SELECT id, nombre, texto, foto_url, estado, creado_en FROM experiencias ORDER BY estado DESC, creado_en DESC'
    );
    res.json(rows);
});

app.patch('/api/admin/experiencias/:id', soloDocentes, async (req, res) => {
    const estado = req.body?.estado;
    if (!['pendiente', 'aprobada'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido.' });
    }
    await db.execute({
        sql: 'UPDATE experiencias SET estado = ?, moderado_por = ? WHERE id = ?',
        args: [estado, req.usuario.id, req.params.id],
    });
    res.json({ ok: true });
});

app.delete('/api/admin/experiencias/:id', soloDocentes, async (req, res) => {
    const { rows } = await db.execute({ sql: 'SELECT foto_url FROM experiencias WHERE id = ?', args: [req.params.id] });
    if (rows[0]?.foto_url && process.env.BLOB_READ_WRITE_TOKEN) {
        await del(rows[0].foto_url);
    }
    await db.execute({ sql: 'DELETE FROM experiencias WHERE id = ?', args: [req.params.id] });
    res.json({ ok: true });
});

app.get('/api/admin/consultas', soloDocentes, async (req, res) => {
    const { rows } = await db.execute('SELECT id, nombre, texto, leida, creado_en FROM consultas ORDER BY leida, creado_en DESC');
    res.json(rows);
});

app.patch('/api/admin/consultas/:id', soloDocentes, async (req, res) => {
    await db.execute({ sql: 'UPDATE consultas SET leida = ? WHERE id = ?', args: [req.body?.leida ? 1 : 0, req.params.id] });
    res.json({ ok: true });
});

app.delete('/api/admin/consultas/:id', soloDocentes, async (req, res) => {
    await db.execute({ sql: 'DELETE FROM consultas WHERE id = ?', args: [req.params.id] });
    res.json({ ok: true });
});

// ---------- Errores ----------

app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado.' }));

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'La foto no puede pesar más de 4 MB.' : 'Archivo inválido.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error del servidor. Probá de nuevo más tarde.' });
});

export default app;
