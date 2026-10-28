// Cuentas de docentes (solo admin).
import { db, fila, filas } from '@/lib/db';
import { exigirAdmin } from '@/lib/auth';
import { contrasenaTemporal, hashearContrasena } from '@/lib/contrasenas';
import { ErrorHttp, leerJSON, responder, ruta } from '@/lib/http';
import { emailValido, texto } from '@/lib/util';
import type { UsuarioListado } from '@/lib/compartido/tipos';

export const GET = ruta(async () => {
    await exigirAdmin();
    return responder(await filas<UsuarioListado>('SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY activo DESC, nombre'));
});

// Crea la cuenta con una contraseña temporal que se muestra una sola vez al admin.
export const POST = ruta(async (req) => {
    await exigirAdmin();
    const cuerpo = await leerJSON(req, 10_000);
    const nombre = texto(cuerpo.nombre, 100);
    const email = texto(cuerpo.email, 200).toLowerCase();
    const rol = cuerpo.rol === 'admin' ? 'admin' : 'docente';
    if (!nombre) throw new ErrorHttp(400, 'Falta el nombre.');
    if (!emailValido(email)) throw new ErrorHttp(400, 'El email no es válido.');
    if (await fila('SELECT 1 FROM usuarios WHERE email = ?', [email])) throw new ErrorHttp(409, 'Ya hay una cuenta con ese email.');

    const temporal = contrasenaTemporal();
    await db.execute({
        sql: 'INSERT INTO usuarios (nombre, email, contrasena_hash, rol) VALUES (?, ?, ?, ?)',
        args: [nombre, email, await hashearContrasena(temporal), rol],
    });
    return responder({ ok: true, contrasena: temporal }, 201);
});
