// El panel pregunta cómo subir: a Blob, a la carpeta local (solo en tu compu) o ninguno.
import { exigirDocente } from '@/lib/auth';
import { responder, ruta } from '@/lib/http';
import { TIPOS } from '@/lib/compartido/formatos';

export const GET = ruta(async () => {
    await exigirDocente();
    const modo = process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : (process.env.VERCEL ? 'ninguno' : 'local');
    return responder({ modo, limites: { foto: TIPOS.foto.maxBytes, video: TIPOS.video.maxBytes } });
});
