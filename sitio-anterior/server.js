// Servidor para desarrollo local. En Vercel no se usa: las páginas se sirven
// como archivos estáticos y /api/* va a api/index.js.
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import app from './api/index.js';
import { soloDocentes } from './api/_lib/auth.js';
import { TIPOS, CARPETA_LOCAL } from './api/_lib/archivos.js';

const local = express();

// Las mismas redirecciones que hace Vercel (URLs viejas de los cultivos), leídas de vercel.json.
const { redirects = [] } = JSON.parse(readFileSync('vercel.json', 'utf8'));
const redirecciones = new Map(redirects.map(r => [decodeURIComponent(r.source), r.destination]));
local.use((req, res, next) => {
    let destino;
    try { destino = redirecciones.get(decodeURIComponent(req.path)); } catch { /* URL mal codificada */ }
    destino ? res.redirect(301, destino) : next();
});

// Sin BLOB_READ_WRITE_TOKEN, el panel sube los archivos acá (carpeta subidas-locales/).
local.post('/api/subidas-locales', soloDocentes, express.raw({ type: () => true, limit: '200mb' }), async (req, res) => {
    const reglas = TIPOS[req.query.tipo];
    const mime = req.headers['content-type'];
    if (!reglas || !reglas.mime.includes(mime)) return res.status(400).json({ error: 'Formato de archivo no permitido.' });
    if (!req.body?.length || req.body.length > reglas.maxBytes) return res.status(400).json({ error: 'El archivo es demasiado grande.' });

    const nombre = String(req.query.nombre || 'archivo').replace(/[^\w.-]+/g, '-').slice(-60);
    const archivo = `${crypto.randomBytes(4).toString('hex')}-${nombre}`;
    await mkdir(CARPETA_LOCAL, { recursive: true });
    await writeFile(path.join(CARPETA_LOCAL, archivo), req.body);
    res.json({ url: `/${CARPETA_LOCAL}/${archivo}` });
});

local.use(app);
local.use(express.static('.', { extensions: ['html'] }));

const puerto = process.env.PORT || 3000;
local.listen(puerto, () => console.log(`Sitio en http://localhost:${puerto}`));
