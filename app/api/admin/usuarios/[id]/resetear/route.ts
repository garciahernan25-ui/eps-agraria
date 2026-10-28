// Genera una contraseña temporal nueva. Las sesiones abiertas de esa cuenta se cierran solas.
import { db } from '@/lib/db';
import { exigirAdmin } from '@/lib/auth';
import { contrasenaTemporal, hashearContrasena } from '@/lib/contrasenas';
import { ErrorHttp, responder, ruta, type ConParams } from '@/lib/http';
import { idValido } from '@/lib/util';

export const POST = ruta<ConParams<{ id: string }>>(async (_req, { params }) => {
    const yo = await exigirAdmin();
    const id = idValido((await params).id);
    if (id === yo.id) throw new ErrorHttp(400, 'Para tu propia cuenta usá "Cambiar mi contraseña".');

    const temporal = contrasenaTemporal();
    const { rowsAffected } = await db.execute({
        sql: 'UPDATE usuarios SET contrasena_hash = ? WHERE id = ?',
        args: [await hashearContrasena(temporal), id],
    });
    if (!rowsAffected) throw new ErrorHttp(404, 'No existe esa cuenta.');
    return responder({ ok: true, contrasena: temporal });
});
