// Verifica la clave de estudiantes antes de mostrar el buzón confidencial.
import { claveCorrecta } from '@/lib/auth';
import { ErrorHttp, leerJSON, responder, ruta } from '@/lib/http';

export const POST = ruta(async (req) => {
    if (!claveCorrecta((await leerJSON(req, 10_000)).clave, process.env.CLAVE_ESTUDIANTES)) {
        throw new ErrorHttp(403, 'Clave incorrecta.');
    }
    return responder({ ok: true });
});
