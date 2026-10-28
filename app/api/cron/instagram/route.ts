// Lo llama el cron de Vercel una vez por día (ver "crons" en vercel.json).
// Vercel manda el header Authorization: Bearer <CRON_SECRET>.
import { claveCorrecta } from '@/lib/auth';
import { sincronizarInstagram } from '@/lib/instagram';
import { ErrorHttp, responder, ruta } from '@/lib/http';

export const GET = ruta(async (req) => {
    const secreto = process.env.CRON_SECRET;
    if (!secreto || !claveCorrecta(req.headers.get('authorization') ?? '', `Bearer ${secreto}`)) {
        throw new ErrorHttp(401, 'No autorizado.');
    }
    try {
        return responder({ ok: true, ...await sincronizarInstagram() });
    } catch (err) {
        throw new ErrorHttp(502, (err as Error).message);
    }
});
