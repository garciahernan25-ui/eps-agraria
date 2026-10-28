import { db } from '@/lib/db';
import { exigirDocente } from '@/lib/auth';
import { todasLasPublicaciones } from '@/lib/datos';
import { insertarMedios, leerPublicacion } from '@/lib/publicaciones';
import { leerJSON, responder, ruta } from '@/lib/http';

export const GET = ruta(async () => {
    await exigirDocente();
    return responder(await todasLasPublicaciones());
});

export const POST = ruta(async (req) => {
    const usuario = await exigirDocente();
    const datos = leerPublicacion(await leerJSON(req));
    const { lastInsertRowid } = await db.execute({
        sql: 'INSERT INTO publicaciones (titulo, texto, seccion, autor_id, publicada) VALUES (?, ?, ?, ?, ?)',
        args: [datos.titulo, datos.texto, datos.seccion, usuario.id, datos.publicada],
    });
    const id = Number(lastInsertRowid);
    if (datos.medios.length) await db.batch(insertarMedios(id, datos.medios), 'write');
    return responder({ ok: true, id }, 201);
});
