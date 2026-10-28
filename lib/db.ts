import { createClient } from '@libsql/client';

// En Vercel se usan TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.
// En local, si no hay URL, se usa un archivo SQLite (local.db).
export const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Las filas de libsql no son objetos planos (React no las deja pasar a componentes
// de cliente): esto las convierte en objetos comunes del tipo esperado.
export async function filas<T>(sql: string, args: (string | number | null)[] = []): Promise<T[]> {
    const { columns, rows } = await db.execute({ sql, args });
    return rows.map(r => Object.fromEntries(columns.map((c, i) => [c, r[i]]))) as T[];
}

export async function fila<T>(sql: string, args: (string | number | null)[] = []): Promise<T | undefined> {
    return (await filas<T>(sql, args))[0];
}
