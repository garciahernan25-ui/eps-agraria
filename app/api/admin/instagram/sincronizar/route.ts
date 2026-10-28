// Botón "Sincronizar ahora" del panel (solo admin).
import { exigirAdmin } from '@/lib/auth';
import { sincronizarInstagram } from '@/lib/instagram';
import { ErrorHttp, responder, ruta } from '@/lib/http';

export const POST = ruta(async () => {
    await exigirAdmin();
    try {
        return responder({ ok: true, ...await sincronizarInstagram() });
    } catch (err) {
        throw new ErrorHttp(502, (err as Error).message);
    }
});
