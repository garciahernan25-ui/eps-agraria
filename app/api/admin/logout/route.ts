import { cerrarSesion } from '@/lib/auth';
import { responder, ruta } from '@/lib/http';

export const POST = ruta(async () => {
    await cerrarSesion();
    return responder({ ok: true });
});
