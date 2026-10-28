// Marcar como leída/no leída o borrar una consulta del buzón.
import { db } from '@/lib/db';
import { exigirDocente } from '@/lib/auth';
import { leerJSON, responder, ruta, type ConParams } from '@/lib/http';
import { idValido } from '@/lib/util';

type Contexto = ConParams<{ id: string }>;

export const PATCH = ruta<Contexto>(async (req, { params }) => {
    await exigirDocente();
    const { leida } = await leerJSON(req, 10_000);
    await db.execute({ sql: 'UPDATE consultas SET leida = ? WHERE id = ?', args: [leida ? 1 : 0, idValido((await params).id)] });
    return responder({ ok: true });
});

export const DELETE = ruta<Contexto>(async (_req, { params }) => {
    await exigirDocente();
    await db.execute({ sql: 'DELETE FROM consultas WHERE id = ?', args: [idValido((await params).id)] });
    return responder({ ok: true });
});
