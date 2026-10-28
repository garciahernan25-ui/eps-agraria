// Login, sesión, cambio de contraseña y administración de cuentas.
import { Router } from 'express';
import { db } from '../db.js';
import {
    iniciarSesion, cerrarSesion, usuarioDeSesion, soloDocentes, soloAdmin,
    hashearContrasena, verificarContrasena, contrasenaTemporal, contrasenaValida, HASH_FALSO,
} from '../auth.js';
import { texto, idValido, emailValido } from '../util.js';

const rutas = Router();

// ---------- Sesión ----------

rutas.post('/api/admin/login', async (req, res) => {
    const email = texto(req.body?.email, 200).toLowerCase();
    const { rows } = await db.execute({
        sql: 'SELECT id, contrasena_hash, activo FROM usuarios WHERE email = ?',
        args: [email],
    });
    const usuario = rows[0];
    // Se verifica igual aunque el email no exista, para no delatarlo por el tiempo de respuesta.
    const correcta = await verificarContrasena(req.body?.password, usuario?.contrasena_hash ?? HASH_FALSO);
    if (!usuario || !correcta) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }
    if (!usuario.activo) {
        return res.status(403).json({ error: 'Tu cuenta está desactivada. Hablá con un administrador.' });
    }
    iniciarSesion(res, usuario);
    res.json({ ok: true });
});

rutas.post('/api/admin/logout', (req, res) => {
    cerrarSesion(res);
    res.json({ ok: true });
});

rutas.get('/api/admin/sesion', async (req, res) => {
    res.json({ usuario: await usuarioDeSesion(req) });
});

rutas.post('/api/admin/mi-contrasena', soloDocentes, async (req, res) => {
    const { actual, nueva } = req.body ?? {};
    if (!contrasenaValida(nueva)) {
        return res.status(400).json({ error: 'La contraseña nueva tiene que tener al menos 8 caracteres.' });
    }
    const { rows } = await db.execute({ sql: 'SELECT contrasena_hash FROM usuarios WHERE id = ?', args: [req.usuario.id] });
    if (!await verificarContrasena(actual, rows[0]?.contrasena_hash)) {
        return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }
    const hash = await hashearContrasena(nueva);
    await db.execute({ sql: 'UPDATE usuarios SET contrasena_hash = ? WHERE id = ?', args: [hash, req.usuario.id] });
    // La sesión vieja deja de valer (la firma incluye el hash): se emite una nueva.
    iniciarSesion(res, { id: req.usuario.id, contrasena_hash: hash });
    res.json({ ok: true });
});

// ---------- Cuentas (solo admin) ----------

rutas.get('/api/admin/usuarios', soloAdmin, async (req, res) => {
    const { rows } = await db.execute('SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY activo DESC, nombre');
    res.json(rows);
});

// Crea la cuenta con una contraseña temporal que se muestra una sola vez al admin.
rutas.post('/api/admin/usuarios', soloAdmin, async (req, res) => {
    const nombre = texto(req.body?.nombre, 100);
    const email = texto(req.body?.email, 200).toLowerCase();
    const rol = req.body?.rol === 'admin' ? 'admin' : 'docente';
    if (!nombre) return res.status(400).json({ error: 'Falta el nombre.' });
    if (!emailValido(email)) return res.status(400).json({ error: 'El email no es válido.' });

    const existe = await db.execute({ sql: 'SELECT 1 FROM usuarios WHERE email = ?', args: [email] });
    if (existe.rows.length) return res.status(409).json({ error: 'Ya hay una cuenta con ese email.' });

    const temporal = contrasenaTemporal();
    await db.execute({
        sql: 'INSERT INTO usuarios (nombre, email, contrasena_hash, rol) VALUES (?, ?, ?, ?)',
        args: [nombre, email, await hashearContrasena(temporal), rol],
    });
    res.status(201).json({ ok: true, contrasena: temporal });
});

// Cuenta los admins activos para no dejar el sitio sin ninguno.
async function quedariaSinAdmins(id) {
    const { rows } = await db.execute({
        sql: "SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin' AND activo = 1 AND id != ?",
        args: [id],
    });
    return rows[0].n === 0;
}

rutas.patch('/api/admin/usuarios/:id', soloAdmin, async (req, res) => {
    const id = idValido(req.params.id);
    const { rows } = await db.execute({ sql: 'SELECT id, rol, activo FROM usuarios WHERE id = ?', args: [id] });
    const usuario = rows[0];
    if (!usuario) return res.status(404).json({ error: 'No existe esa cuenta.' });

    const activo = req.body?.activo === undefined ? usuario.activo : (req.body.activo ? 1 : 0);
    const rol = req.body?.rol === undefined ? usuario.rol : (req.body.rol === 'admin' ? 'admin' : 'docente');
    const pierdeAdmin = usuario.rol === 'admin' && usuario.activo && (rol !== 'admin' || !activo);

    if (id === req.usuario.id && pierdeAdmin) {
        return res.status(400).json({ error: 'No podés desactivarte ni quitarte el rol de admin a vos mismo.' });
    }
    if (pierdeAdmin && await quedariaSinAdmins(id)) {
        return res.status(400).json({ error: 'Tiene que quedar al menos un administrador activo.' });
    }

    await db.execute({ sql: 'UPDATE usuarios SET activo = ?, rol = ? WHERE id = ?', args: [activo, rol, id] });
    res.json({ ok: true });
});

// Genera una contraseña temporal nueva. Las sesiones abiertas de esa cuenta se cierran solas.
rutas.post('/api/admin/usuarios/:id/resetear', soloAdmin, async (req, res) => {
    if (idValido(req.params.id) === req.usuario.id) {
        return res.status(400).json({ error: 'Para tu propia cuenta usá "Cambiar mi contraseña".' });
    }
    const temporal = contrasenaTemporal();
    const { rowsAffected } = await db.execute({
        sql: 'UPDATE usuarios SET contrasena_hash = ? WHERE id = ?',
        args: [await hashearContrasena(temporal), idValido(req.params.id)],
    });
    if (!rowsAffected) return res.status(404).json({ error: 'No existe esa cuenta.' });
    res.json({ ok: true, contrasena: temporal });
});

export default rutas;
