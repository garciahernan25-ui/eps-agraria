// Crea las tablas que falten y agrega las columnas nuevas a tablas viejas.
// Se puede correr todas las veces que haga falta sin perder datos.
import { readFile } from 'node:fs/promises';
import { db } from '../api/_lib/db.js';

// [tabla, columna, definición]. Agregar acá cada columna nueva de una tabla existente.
const COLUMNAS_NUEVAS = [
    ['experiencias', 'moderado_por', 'INTEGER REFERENCES usuarios(id)'],
];

export async function aplicarEsquema() {
    const schema = await readFile(new URL('../api/_lib/schema.sql', import.meta.url), 'utf8');
    await db.executeMultiple(schema);

    for (const [tabla, columna, definicion] of COLUMNAS_NUEVAS) {
        const { rows } = await db.execute(`PRAGMA table_info(${tabla})`);
        if (!rows.some(c => c.name === columna)) {
            await db.execute(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
            console.log(`Columna agregada: ${tabla}.${columna}`);
        }
    }
}
