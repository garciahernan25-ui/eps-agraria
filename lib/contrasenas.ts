// Contraseñas con scrypt y salt. Sin dependencias de Next: lo usan también los scripts.
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt) as (clave: string, salt: string, largo: number) => Promise<Buffer>;
const LARGO_CLAVE = 64;

// ---------- Contraseñas (scrypt con salt) ----------
// Se guardan como "scrypt$<salt>$<hash>", ambos en hex.

export async function hashearContrasena(contrasena: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scrypt(contrasena, salt, LARGO_CLAVE);
    return `scrypt$${salt}$${hash.toString('hex')}`;
}

export async function verificarContrasena(contrasena: unknown, guardado: string | undefined): Promise<boolean> {
    const [algoritmo, salt, hashHex] = String(guardado || '').split('$');
    if (algoritmo !== 'scrypt' || !salt || !hashHex || typeof contrasena !== 'string') return false;
    const esperado = Buffer.from(hashHex, 'hex');
    const calculado = await scrypt(contrasena, salt, esperado.length);
    return crypto.timingSafeEqual(calculado, esperado);
}

// Para comparar contra algo cuando el email no existe y no delatarlo por el tiempo de respuesta.
export const HASH_FALSO = 'scrypt$00000000000000000000000000000000$' + '0'.repeat(LARGO_CLAVE * 2);

// Contraseña temporal legible (sin 0/O ni 1/l para dictarla sin errores).
export function contrasenaTemporal(): string {
    const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(crypto.randomBytes(12), b => letras[b % letras.length]).join('');
}

export function contrasenaValida(contrasena: unknown): contrasena is string {
    return typeof contrasena === 'string' && contrasena.length >= 8 && contrasena.length <= 200;
}
