// Guarda un token nuevo de Instagram (pegado en el panel) y sincroniza (solo admin).
import { exigirAdmin } from '@/lib/auth';
import { conectarToken, sincronizarInstagram } from '@/lib/instagram';
import { ErrorHttp, leerJSON, responder, ruta } from '@/lib/http';
import { texto } from '@/lib/util';

export const POST = ruta(async (req) => {
    await exigirAdmin();
    const token = texto((await leerJSON(req, 10_000)).token, 1000);
    if (token.length < 20) throw new ErrorHttp(400, 'Pegá el token completo.');
    try {
        const usuario = await conectarToken(token);
        const { total } = await sincronizarInstagram();
        return responder({ ok: true, usuario, total });
    } catch (err) {
        throw new ErrorHttp(400, (err as Error).message);
    }
});
