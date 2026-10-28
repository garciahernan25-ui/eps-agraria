// Crea una cuenta de administrador desde la terminal.
// Uso: npm run crear-admin
//      npm run crear-admin -- --nombre "Ana Pérez" --email ana@ejemplo.com --password "una-clave-larga"
// Si el email ya existe, la cuenta pasa a ser admin, se activa y se le cambia la contraseña.
import { parseArgs } from 'node:util';
import readline from 'node:readline/promises';
import { db } from '../api/_lib/db.js';
import { hashearContrasena, contrasenaValida } from '../api/_lib/auth.js';
import { aplicarEsquema } from './_esquema.js';

const { values } = parseArgs({
    options: {
        nombre: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
    },
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Pregunta sin mostrar lo que se escribe (para la contraseña).
async function preguntarOculto(pregunta) {
    const escribir = rl._writeToOutput;
    rl._writeToOutput = (texto) => { if (texto.startsWith(pregunta)) escribir.call(rl, texto); };
    const respuesta = await rl.question(pregunta);
    rl._writeToOutput = escribir;
    process.stdout.write('\n');
    return respuesta;
}

const nombre = (values.nombre ?? await rl.question('Nombre: ')).trim();
const email = (values.email ?? await rl.question('Email: ')).trim().toLowerCase();
let password = values.password;
if (password === undefined) {
    password = await preguntarOculto('Contraseña (mínimo 8 caracteres): ');
    if (password !== await preguntarOculto('Repetila: ')) {
        console.error('Las contraseñas no coinciden.');
        process.exit(1);
    }
}
rl.close();

if (!nombre || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Falta el nombre o el email no es válido.');
    process.exit(1);
}
if (!contrasenaValida(password)) {
    console.error('La contraseña tiene que tener al menos 8 caracteres.');
    process.exit(1);
}

await aplicarEsquema();
const hash = await hashearContrasena(password);
await db.execute({
    sql: `INSERT INTO usuarios (nombre, email, contrasena_hash, rol) VALUES (?, ?, ?, 'admin')
          ON CONFLICT (email) DO UPDATE SET nombre = excluded.nombre, contrasena_hash = excluded.contrasena_hash,
                                            rol = 'admin', activo = 1`,
    args: [nombre, email, hash],
});
console.log(`Listo: ${email} es administrador. Entrá en /admin.html`);
