import { db, fila } from '@/lib/db';
import { exigirDocente, iniciarSesion } from '@/lib/auth';
import { hashearContrasena, verificarContrasena, contrasenaValida } from '@/lib/contrasenas';
import { ErrorHttp, leerJSON, responder, ruta } from '@/lib/http';

export const POST = ruta(async (req) => {
    const usuario = await exigirDocente();
    const { actual, nueva } = await leerJSON(req, 10_000);
    if (!contrasenaValida(nueva)) throw new ErrorHttp(400, 'La contraseña nueva tiene que tener al menos 8 caracteres.');

    const guardada = await fila<{ contrasena_hash: string }>('SELECT contrasena_hash FROM usuarios WHERE id = ?', [usuario.id]);
    if (!await verificarContrasena(actual, guardada?.contrasena_hash)) {
        throw new ErrorHttp(400, 'La contraseña actual no es correcta.');
    }
    const hash = await hashearContrasena(nueva);
    await db.execute({ sql: 'UPDATE usuarios SET contrasena_hash = ? WHERE id = ?', args: [hash, usuario.id] });
    // La sesión vieja deja de valer (la firma incluye el hash): se emite una nueva.
    await iniciarSesion({ id: usuario.id, contrasena_hash: hash });
    return responder({ ok: true });
});
