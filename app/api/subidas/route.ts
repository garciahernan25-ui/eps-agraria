// Subida directa desde el navegador a Vercel Blob.
// Vercel no acepta cuerpos de más de 4.5 MB, así que el archivo no pasa por
// nuestro servidor: acá solo se entrega un permiso (token) para subirlo.
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { usuarioDeSesion } from '@/lib/auth';
import { ErrorHttp, responder, ruta } from '@/lib/http';
import { CARPETAS, TIPOS } from '@/lib/compartido/formatos';
import type { TipoMedio } from '@/lib/compartido/tipos';

export const POST = ruta(async (req) => {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new ErrorHttp(503, 'La subida de archivos no está configurada (falta BLOB_READ_WRITE_TOKEN).');
    }
    const body = await req.json() as HandleUploadBody;
    try {
        const respuesta = await handleUpload({
            body,
            request: req,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                if (!await usuarioDeSesion()) throw new Error('Iniciá sesión como docente.');

                // El panel avisa si es foto o video; cada uno tiene sus formatos y su tamaño máximo.
                let tipo: TipoMedio | null = null;
                try { tipo = JSON.parse(clientPayload || '{}').tipo; } catch { /* tipo inválido */ }
                const reglas = tipo ? TIPOS[tipo] : undefined;
                if (!reglas) throw new Error('Tipo de archivo inválido.');
                if (!(CARPETAS as readonly string[]).includes(pathname.split('/')[0])) throw new Error('Carpeta inválida.');

                return {
                    allowedContentTypes: reglas.mime,
                    maximumSizeInBytes: reglas.maxBytes,
                    addRandomSuffix: true,
                };
            },
        });
        return responder(respuesta);
    } catch (err) {
        throw new ErrorHttp(400, (err as Error).message);
    }
});
