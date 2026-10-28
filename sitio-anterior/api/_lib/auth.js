import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';

const scrypt = promisify(crypto.scrypt);

const COOKIE = 'sesion_docente';
const DURACION_MS = 8 * 60 * 60 * 1000; // 8 horas
const LARGO_CLAVE = 64;

function firmar(valor) {
    return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(valor).digest('hex');
}

// Compara textos sin filtrar información por el tiempo de respuesta.
export function claveCorrecta(ingresada, esperada) {
    if (typeof ingresada !== 'string' || !esperada) return false;
    const a = crypto.createHash('sha256').update(ingresada).digest();
    const b = crypto.createHash('sha256').update(esperada).digest();
    return crypto.timingSafeEqual(a, b);
}

// ---------- Contraseñas (scrypt con salt) ----------
// Se guardan como "scrypt$<salt>$<hash>", ambos en hex.

export async function hashearContrasena(contrasena) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scrypt(contrasena, salt, LARGO_CLAVE);
    return `scrypt$${salt}$${hash.toString('hex')}`;
}

export async function verificarContrasena(contrasena, guardado) {
    const [algoritmo, salt, hashHex] = String(guardado || '').split('$');
    if (algoritmo !== 'scrypt' || !salt || !hashHex || typeof contrasena !== 'string') return false;
    const esperado = Buffer.from(hashHex, 'hex');
    const calculado = await scrypt(contrasena, salt, esperado.length);
    return crypto.timingSafeEqual(calculado, esperado);
}

// Para comparar contra algo cuando el email no existe y no delatarlo por el tiempo de respuesta.
export const HASH_FALSO = 'scrypt$00000000000000000000000000000000$' + '0'.repeat(LARGO_CLAVE * 2);

// Contraseña temporal legible (sin 0/O ni 1/l para dictarla sin errores).
export function contrasenaTemporal() {
    const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(crypto.randomBytes(12), b => letras[b % letras.length]).join('');
}

export function contrasenaValida(contrasena) {
    return typeof contrasena === 'string' && contrasena.length >= 8 && contrasena.length <= 200;
}

// ---------- Sesión ----------
// La cookie guarda "<id>.<vence>.<firma>". La firma incluye el hash de la
// contraseña, así que al cambiarla o resetearla se cierran las sesiones viejas.

export function iniciarSesion(res, usuario) {
    const vence = String(Date.now() + DURACION_MS);
    const datos = `${usuario.id}.${vence}`;
    res.cookie(COOKIE, `${datos}.${firmar(`${datos}.${usuario.contrasena_hash}`)}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: DURACION_MS,
        path: '/',
    });
}

export function cerrarSesion(res) {
    res.clearCookie(COOKIE, { path: '/' });
}

function leerCookie(req) {
    const header = req.headers.cookie || '';
    for (const parte of header.split(';')) {
        const [nombre, ...resto] = parte.trim().split('=');
        if (nombre === COOKIE) return decodeURIComponent(resto.join('='));
    }
    return null;
}

// Devuelve el usuario de la sesión (activo y con firma válida) o null.
export async function usuarioDeSesion(req) {
    if (req.usuario !== undefined) return req.usuario;
    req.usuario = null;

    const [id, vence, firma] = (leerCookie(req) || '').split('.');
    if (!/^\d+$/.test(id || '') || !vence || !firma || Number(vence) < Date.now()) return null;

    const { rows } = await db.execute({
        sql: 'SELECT id, nombre, email, rol, contrasena_hash FROM usuarios WHERE id = ? AND activo = 1',
        args: [id],
    });
    const usuario = rows[0];
    if (!usuario) return null;

    const esperada = firmar(`${id}.${vence}.${usuario.contrasena_hash}`);
    if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) {
        return null;
    }
    req.usuario = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
    return req.usuario;
}

export async function soloDocentes(req, res, next) {
    if (!await usuarioDeSesion(req)) return res.status(401).json({ error: 'Iniciá sesión como docente.' });
    next();
}

export async function soloAdmin(req, res, next) {
    const usuario = await usuarioDeSesion(req);
    if (!usuario) return res.status(401).json({ error: 'Iniciá sesión como docente.' });
    if (usuario.rol !== 'admin') return res.status(403).json({ error: 'Solo un administrador puede hacer esto.' });
    next();
}
