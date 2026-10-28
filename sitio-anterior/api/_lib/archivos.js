// Reglas de los archivos que suben los docentes (fotos y videos) y borrado.
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { del } from '@vercel/blob';
import { db } from './db.js';

const MB = 1024 * 1024;

export const TIPOS = {
    foto: { mime: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], maxBytes: 10 * MB },
    video: { mime: ['video/mp4', 'video/webm', 'video/quicktime'], maxBytes: 200 * MB },
};

// Carpetas de Blob donde el panel puede subir archivos.
export const CARPETAS = ['publicaciones', 'cultivos', 'docentes', 'paginas', 'inicio'];

// Sin Blob configurado y fuera de Vercel, server.js guarda los archivos acá.
export const CARPETA_LOCAL = 'subidas-locales';

function esUrlBlob(url) {
    try {
        const u = new URL(url);
        return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com');
    } catch {
        return false;
    }
}

function esArchivoLocal(url) {
    return !process.env.VERCEL && new RegExp(`^/${CARPETA_LOCAL}/[\\w.-]+$`).test(url);
}

// Imágenes que ya estaban en el sitio (img/ e Img 2/), usadas por el contenido importado.
function esImagenDelSitio(url) {
    return /^(img|Img 2)\/[^<>"'\\]+$/.test(url) && !url.includes('..');
}

// Acepta solo archivos subidos por el panel (y, si se pide, imágenes del sitio).
export function urlArchivoValida(url, { delSitio = false } = {}) {
    if (typeof url !== 'string' || url.length > 1000) return false;
    return esUrlBlob(url) || esArchivoLocal(url) || (delSitio && esImagenDelSitio(url));
}

// Borra el archivo si lo subió el panel. Las imágenes originales del sitio no se tocan.
// Si falla, solo se registra: no tiene que impedir borrar el dato de la base.
export async function borrarArchivo(url) {
    try {
        if (esUrlBlob(url) && process.env.BLOB_READ_WRITE_TOKEN) {
            await del(url);
        } else if (esArchivoLocal(url)) {
            await unlink(path.join(process.cwd(), CARPETA_LOCAL, path.basename(url)));
        }
    } catch (err) {
        console.error('No se pudo borrar el archivo', url, err.message);
    }
}

// ¿Algún contenido guardado usa este archivo? (una misma foto puede estar en varios lugares)
export async function archivoEnUso(url) {
    const consultas = [
        'SELECT 1 FROM publicacion_medios WHERE url = ? LIMIT 1',
        'SELECT 1 FROM cultivos WHERE imagen = ? LIMIT 1',
        'SELECT 1 FROM docentes WHERE foto = ? LIMIT 1',
        'SELECT 1 FROM inicio_tarjetas WHERE imagen = ? LIMIT 1',
        'SELECT 1 FROM paginas WHERE instr(contenido_html, ?) > 0 LIMIT 1',
    ];
    for (const sql of consultas) {
        const { rows } = await db.execute({ sql, args: [url] });
        if (rows.length) return true;
    }
    return false;
}

// Borra los archivos que ya no usa ningún contenido. Llamarla después de guardar los cambios.
export async function borrarSiNoSeUsan(urls) {
    for (const url of new Set(urls.filter(Boolean))) {
        if (!await archivoEnUso(url)) await borrarArchivo(url);
    }
}

// URLs de archivos subidos por el panel que aparecen dentro de un HTML.
export function archivosEnHTML(html) {
    const urls = String(html || '').match(new RegExp(`https://[\\w.-]+\\.public\\.blob\\.vercel-storage\\.com/[^"'\\s<>)]+|/${CARPETA_LOCAL}/[\\w.-]+`, 'g'));
    return urls ?? [];
}
