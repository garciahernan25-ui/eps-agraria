// Solo para probar en tu compu sin Vercel Blob: guarda el archivo en .subidas-locales/.
// En Vercel esta ruta no hace nada (los archivos van a Blob).
import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { exigirDocente } from '@/lib/auth';
import { DIRECTORIO_LOCAL } from '@/lib/archivos';
import { ErrorHttp, responder, ruta } from '@/lib/http';
import { CARPETA_LOCAL, TIPOS } from '@/lib/compartido/formatos';
import type { TipoMedio } from '@/lib/compartido/tipos';

export const POST = ruta(async (req) => {
    if (process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN) throw new ErrorHttp(404, 'No encontrado.');
    await exigirDocente();

    const url = new URL(req.url);
    const reglas = TIPOS[url.searchParams.get('tipo') as TipoMedio];
    const mime = req.headers.get('content-type') ?? '';
    if (!reglas || !reglas.mime.includes(mime)) throw new ErrorHttp(400, 'Formato de archivo no permitido.');

    const contenido = Buffer.from(await req.arrayBuffer());
    if (!contenido.length || contenido.length > reglas.maxBytes) throw new ErrorHttp(400, 'El archivo es demasiado grande.');

    const nombre = (url.searchParams.get('nombre') || 'archivo').replace(/[^\w.-]+/g, '-').slice(-60);
    const archivo = `${crypto.randomBytes(4).toString('hex')}-${nombre}`;
    await mkdir(DIRECTORIO_LOCAL, { recursive: true });
    await writeFile(path.join(DIRECTORIO_LOCAL, archivo), contenido);
    return responder({ url: `/${CARPETA_LOCAL}/${archivo}` });
});
