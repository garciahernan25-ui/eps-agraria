// Validación y borrado de los archivos que suben los docentes.
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { del } from '@vercel/blob';
import { db } from './db';
import { CARPETA_LOCAL } from './compartido/formatos';

// En tu compu (sin Blob) los archivos se guardan en .subidas-locales/ y se sirven en /subidas-locales/...
export const DIRECTORIO_LOCAL = path.join(process.cwd(), '.subidas-locales');

export function esUrlBlob(url: string): boolean {
    try {
        const u = new URL(url);
        return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com');
    } catch {
        return false;
    }
}

function esArchivoLocal(url: string): boolean {
    return !process.env.VERCEL && new RegExp(`^/${CARPETA_LOCAL}/[\\w.-]+$`).test(url);
}

// Imágenes que ya estaban en el sitio (public/img e Img 2), usadas por el contenido importado.
function esImagenDelSitio(url: string): boolean {
    return /^\/?(img|Img 2)\/[^<>"'\\]+$/.test(url) && !url.includes('..');
}

// Acepta solo archivos subidos por el panel (y, si se pide, imágenes del sitio).
export function urlArchivoValida(url: unknown, { delSitio = false } = {}): url is string {
    if (typeof url !== 'string' || url.length > 1000) return false;
    return esUrlBlob(url) || esArchivoLocal(url) || (delSitio && esImagenDelSitio(url));
}

// Borra el archivo si lo subió el panel. Las imágenes originales del sitio no se tocan.
// Si falla, solo se registra: no tiene que impedir borrar el dato de la base.
async function borrarArchivo(url: string) {
    try {
        if (esUrlBlob(url) && process.env.BLOB_READ_WRITE_TOKEN) {
            await del(url);
        } else if (esArchivoLocal(url)) {
            await unlink(path.join(DIRECTORIO_LOCAL, path.basename(url)));
        }
    } catch (err) {
        console.error('No se pudo borrar el archivo', url, (err as Error).message);
    }
}

// ¿Algún contenido guardado usa este archivo? (una misma foto puede estar en varios lugares)
async function archivoEnUso(url: string): Promise<boolean> {
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
export async function borrarSiNoSeUsan(urls: (string | null | undefined)[]) {
    for (const url of new Set(urls.filter((u): u is string => Boolean(u)))) {
        if (!await archivoEnUso(url)) await borrarArchivo(url);
    }
}

// URLs de archivos subidos por el panel que aparecen dentro de un HTML.
export function archivosEnHTML(html: string | null | undefined): string[] {
    const patron = new RegExp(`https://[\\w.-]+\\.public\\.blob\\.vercel-storage\\.com/[^"'\\s<>)]+|/${CARPETA_LOCAL}/[\\w.-]+`, 'g');
    return String(html || '').match(patron) ?? [];
}
