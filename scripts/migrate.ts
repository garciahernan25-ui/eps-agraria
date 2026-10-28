// Crea las tablas y carga las experiencias que ya estaban en la página.
// Uso: npm run db:migrate
import { db } from '../lib/db';
import { aplicarEsquema } from './esquema';

await aplicarEsquema();

const { rows } = await db.execute('SELECT COUNT(*) AS n FROM experiencias');
if (rows[0].n === 0) {
    await db.batch([
        { sql: "INSERT INTO experiencias (nombre, texto, estado, creado_en) VALUES (?, ?, 'aprobada', ?)", args: ['Dai', 'Los profes son lo más!!!', '2025-11-03 12:00:00'] },
        { sql: "INSERT INTO experiencias (nombre, texto, estado, creado_en) VALUES (?, ?, 'aprobada', ?)", args: [null, 'La eps, es como mi segunda casa', '2025-11-04 12:00:00'] },
        { sql: "INSERT INTO experiencias (nombre, texto, estado, creado_en) VALUES (?, ?, 'aprobada', ?)", args: ['Galo', 'Aguante la eps', '2025-11-03 13:00:00'] },
    ], 'write');
    console.log('Experiencias iniciales cargadas.');
}

const usuarios = await db.execute('SELECT COUNT(*) AS n FROM usuarios');
if (usuarios.rows[0].n === 0) {
    console.log('Todavía no hay cuentas. Creá la primera con: npm run crear-admin');
}

console.log('Base de datos lista.');
