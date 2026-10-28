// Aprobar/ocultar o borrar una experiencia de estudiantes.
import { del } from '@vercel/blob';
import { db, fila } from '@/lib/db';
import { exigirDocente } from '@/lib/auth';
import { esUrlBlob } from '@/lib/archivos';
import { ErrorHttp, leerJSON, responder, ruta, type ConParams } from '@/lib/http';
import { idValido } from '@/lib/util';

type Contexto = ConParams<{ id: string }>;

export const PATCH = ruta<Contexto>(async (req, { params }) => {
    const usuario = await exigirDocente();
    const { estado } = await leerJSON(req, 10_000);
    if (estado !== 'pendiente' && estado !== 'aprobada') throw new ErrorHttp(400, 'Estado inválido.');
    await db.execute({
        sql: 'UPDATE experiencias SET estado = ?, moderado_por = ? WHERE id = ?',
        args: [estado, usuario.id, idValido((await params).id)],
    });
    return responder({ ok: true });
});

export const DELETE = ruta<Contexto>(async (_req, { params }) => {
    await exigirDocente();
    const id = idValido((await params).id);
    const exp = await fila<{ foto_url: string | null }>('SELECT foto_url FROM experiencias WHERE id = ?', [id]);
    if (exp?.foto_url && esUrlBlob(exp.foto_url) && process.env.BLOB_READ_WRITE_TOKEN) await del(exp.foto_url);
    await db.execute({ sql: 'DELETE FROM experiencias WHERE id = ?', args: [id] });
    return responder({ ok: true });
});
