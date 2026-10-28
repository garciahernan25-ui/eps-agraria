import { db, fila, filas } from '@/lib/db';
import { exigirDocente } from '@/lib/auth';
import { borrarSiNoSeUsan } from '@/lib/archivos';
import { insertarMedios, leerPublicacion } from '@/lib/publicaciones';
import { ErrorHttp, leerJSON, responder, ruta, type ConParams } from '@/lib/http';
import { idValido } from '@/lib/util';

type Contexto = ConParams<{ id: string }>;

const urlsDeMedios = async (id: number) =>
    (await filas<{ url: string }>('SELECT url FROM publicacion_medios WHERE publicacion_id = ?', [id])).map(m => m.url);

export const PUT = ruta<Contexto>(async (req, { params }) => {
    const usuario = await exigirDocente();
    const id = idValido((await params).id);
    const datos = leerPublicacion(await leerJSON(req));
    if (!id || !await fila('SELECT 1 FROM publicaciones WHERE id = ?', [id])) throw new ErrorHttp(404, 'La publicación ya no existe.');

    const quitados = (await urlsDeMedios(id)).filter(url => !datos.medios.some(m => m.url === url));
    await db.batch([
        {
            sql: `UPDATE publicaciones SET titulo = ?, texto = ?, seccion = ?, publicada = ?, autor_id = ?,
                  actualizado_en = datetime('now') WHERE id = ?`,
            args: [datos.titulo, datos.texto, datos.seccion, datos.publicada, usuario.id, id],
        },
        { sql: 'DELETE FROM publicacion_medios WHERE publicacion_id = ?', args: [id] },
        ...insertarMedios(id, datos.medios),
    ], 'write');

    // Los archivos que se sacaron se borran de Blob (si nadie más los usa).
    await borrarSiNoSeUsan(quitados);
    return responder({ ok: true });
});

export const DELETE = ruta<Contexto>(async (_req, { params }) => {
    await exigirDocente();
    const id = idValido((await params).id);
    if (!id) throw new ErrorHttp(404, 'La publicación ya no existe.');
    const urls = await urlsDeMedios(id);
    await db.batch([
        { sql: 'DELETE FROM publicacion_medios WHERE publicacion_id = ?', args: [id] },
        { sql: 'DELETE FROM publicaciones WHERE id = ?', args: [id] },
    ], 'write');
    await borrarSiNoSeUsan(urls);
    return responder({ ok: true });
});
