import { fila } from '@/lib/db';
import { iniciarSesion } from '@/lib/auth';
import { verificarContrasena, HASH_FALSO } from '@/lib/contrasenas';
import { ErrorHttp, leerJSON, responder, ruta } from '@/lib/http';
import { texto } from '@/lib/util';

export const POST = ruta(async (req) => {
    const cuerpo = await leerJSON(req, 10_000);
    const email = texto(cuerpo.email, 200).toLowerCase();
    const usuario = await fila<{ id: number; contrasena_hash: string; activo: number }>(
        'SELECT id, contrasena_hash, activo FROM usuarios WHERE email = ?', [email]);
    // Se verifica igual aunque el email no exista, para no delatarlo por el tiempo de respuesta.
    const correcta = await verificarContrasena(cuerpo.password, usuario?.contrasena_hash ?? HASH_FALSO);
    if (!usuario || !correcta) throw new ErrorHttp(401, 'Email o contraseña incorrectos.');
    if (!usuario.activo) throw new ErrorHttp(403, 'Tu cuenta está desactivada. Hablá con un administrador.');
    await iniciarSesion(usuario);
    return responder({ ok: true });
});
