// Sesión con cookie firmada y permisos. Solo se usa en el servidor.
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { fila } from './db';
import { ErrorHttp } from './http';
import type { Usuario } from './compartido/tipos';

const COOKIE = 'sesion_docente';
const DURACION_MS = 8 * 60 * 60 * 1000; // 8 horas

function firmar(valor: string): string {
    const secreto = process.env.SESSION_SECRET;
    if (!secreto) throw new Error('Falta la variable SESSION_SECRET.');
    return crypto.createHmac('sha256', secreto).update(valor).digest('hex');
}

// Compara textos sin filtrar información por el tiempo de respuesta.
export function claveCorrecta(ingresada: unknown, esperada: string | undefined): boolean {
    if (typeof ingresada !== 'string' || !esperada) return false;
    const a = crypto.createHash('sha256').update(ingresada).digest();
    const b = crypto.createHash('sha256').update(esperada).digest();
    return crypto.timingSafeEqual(a, b);
}

// ---------- Sesión ----------
// La cookie guarda "<id>.<vence>.<firma>". La firma incluye el hash de la
// contraseña, así que al cambiarla o resetearla se cierran las sesiones viejas.

export async function iniciarSesion(usuario: { id: number; contrasena_hash: string }) {
    const vence = String(Date.now() + DURACION_MS);
    const datos = `${usuario.id}.${vence}`;
    (await cookies()).set(COOKIE, `${datos}.${firmar(`${datos}.${usuario.contrasena_hash}`)}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: DURACION_MS / 1000,
        path: '/',
    });
}

export async function cerrarSesion() {
    (await cookies()).delete(COOKIE);
}

// Devuelve el usuario de la sesión (activo y con firma válida) o null.
export async function usuarioDeSesion(): Promise<Usuario | null> {
    const [id, vence, firma] = ((await cookies()).get(COOKIE)?.value ?? '').split('.');
    if (!/^\d+$/.test(id || '') || !vence || !firma || Number(vence) < Date.now()) return null;

    const usuario = await fila<Usuario & { contrasena_hash: string }>(
        'SELECT id, nombre, email, rol, contrasena_hash FROM usuarios WHERE id = ? AND activo = 1', [id]);
    if (!usuario) return null;

    const esperada = firmar(`${id}.${vence}.${usuario.contrasena_hash}`);
    if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) {
        return null;
    }
    return { id: Number(usuario.id), nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
}

// Para usar al principio de cada ruta del panel: devuelve el usuario o corta con 401/403.
export async function exigirDocente(): Promise<Usuario> {
    const usuario = await usuarioDeSesion();
    if (!usuario) throw new ErrorHttp(401, 'Iniciá sesión como docente.');
    return usuario;
}

export async function exigirAdmin(): Promise<Usuario> {
    const usuario = await exigirDocente();
    if (usuario.rol !== 'admin') throw new ErrorHttp(403, 'Solo un administrador puede hacer esto.');
    return usuario;
}
