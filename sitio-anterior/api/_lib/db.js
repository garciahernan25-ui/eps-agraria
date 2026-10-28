import { createClient } from '@libsql/client';

// En Vercel se usan TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.
// En local, si no hay URL, se usa un archivo SQLite (local.db).
export const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});
