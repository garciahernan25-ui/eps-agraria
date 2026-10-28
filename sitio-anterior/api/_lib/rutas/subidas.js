// Subida directa desde el navegador a Vercel Blob.
// Vercel no acepta cuerpos de más de 4.5 MB, así que el archivo no pasa por
// nuestro servidor: acá solo se entrega un permiso (token) para subirlo.
import { Router } from 'express';
import { handleUpload } from '@vercel/blob/client';
import { usuarioDeSesion, soloDocentes } from '../auth.js';
import { TIPOS, CARPETAS, urlArchivoValida, borrarSiNoSeUsan } from '../archivos.js';

const rutas = Router();

// El panel pregunta cómo subir: a Blob, a la carpeta local (solo con npm run dev) o ninguno.
rutas.get('/api/admin/subidas', soloDocentes, (req, res) => {
    const modo = process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : (process.env.VERCEL ? 'ninguno' : 'local');
    res.json({ modo, limites: Object.fromEntries(Object.entries(TIPOS).map(([t, v]) => [t, v.maxBytes])) });
});

rutas.post('/api/subidas', async (req, res) => {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(503).json({ error: 'La subida de archivos no está configurada (falta BLOB_READ_WRITE_TOKEN).' });
    }
    try {
        const respuesta = await handleUpload({
            body: req.body,
            request: req,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                if (!await usuarioDeSesion(req)) throw new Error('Iniciá sesión como docente.');

                // El panel avisa si es foto o video; cada uno tiene sus formatos y su tamaño máximo.
                let tipo;
                try { tipo = JSON.parse(clientPayload || '{}').tipo; } catch { tipo = null; }
                const reglas = TIPOS[tipo];
                if (!reglas) throw new Error('Tipo de archivo inválido.');
                if (!CARPETAS.includes(pathname.split('/')[0])) throw new Error('Carpeta inválida.');

                return {
                    allowedContentTypes: reglas.mime,
                    maximumSizeInBytes: reglas.maxBytes,
                    addRandomSuffix: true,
                };
            },
        });
        res.json(respuesta);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Borra un archivo que se subió pero no se llegó a guardar (por ejemplo, si se canceló
// el formulario). Si algún contenido lo usa, no se toca.
rutas.post('/api/admin/archivos/descartar', soloDocentes, async (req, res) => {
    const url = req.body?.url;
    if (!urlArchivoValida(url)) return res.status(400).json({ error: 'Archivo inválido.' });
    await borrarSiNoSeUsan([url]);
    res.json({ ok: true });
});

export default rutas;
