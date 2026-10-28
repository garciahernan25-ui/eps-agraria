// Activar/desactivar una cuenta o cambiarle el rol (solo admin).
import { db, fila } from '@/lib/db';
import { exigirAdmin } from '@/lib/auth';
import { ErrorHttp, leerJSON, responder, ruta, type ConParams } from '@/lib/http';
import { idValido } from '@/lib/util';
import type { Rol } from '@/lib/compartido/tipos';

// ¿Quedaría el sitio sin ningún administrador activo?
async function quedariaSinAdmins(id: number): Promise<boolean> {
    const otros = await fila<{ n: number }>("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin' AND activo = 1 AND id != ?", [id]);
    return otros!.n === 0;
}

export const PATCH = ruta<ConParams<{ id: string }>>(async (req, { params }) => {
    const yo = await exigirAdmin();
    const id = idValido((await params).id);
    const usuario = id ? await fila<{ id: number; rol: Rol; activo: number }>('SELECT id, rol, activo FROM usuarios WHERE id = ?', [id]) : undefined;
    if (!id || !usuario) throw new ErrorHttp(404, 'No existe esa cuenta.');

    const cuerpo = await leerJSON(req, 10_000);
    const activo = cuerpo.activo === undefined ? usuario.activo : (cuerpo.activo ? 1 : 0);
    const rol: Rol = cuerpo.rol === undefined ? usuario.rol : (cuerpo.rol === 'admin' ? 'admin' : 'docente');
    const pierdeAdmin = usuario.rol === 'admin' && Boolean(usuario.activo) && (rol !== 'admin' || !activo);

    if (id === yo.id && pierdeAdmin) throw new ErrorHttp(400, 'No podés desactivarte ni quitarte el rol de admin a vos mismo.');
    if (pierdeAdmin && await quedariaSinAdmins(id)) throw new ErrorHttp(400, 'Tiene que quedar al menos un administrador activo.');

    await db.execute({ sql: 'UPDATE usuarios SET activo = ?, rol = ? WHERE id = ?', args: [activo, rol, id] });
    return responder({ ok: true });
});
