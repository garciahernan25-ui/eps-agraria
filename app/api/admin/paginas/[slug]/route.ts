// Leer y guardar una página de texto. Solo se editan las que ya existen
// (cada una tiene su URL en lib/compartido/paginas.ts).
import { db } from '@/lib/db';
import { exigirDocente } from '@/lib/auth';
import { paginaPorSlug } from '@/lib/datos';
import { sanitizarHTML } from '@/lib/sanitizar';
import { archivosEnHTML, borrarSiNoSeUsan } from '@/lib/archivos';
import { ErrorHttp, leerJSON, responder, ruta, type ConParams } from '@/lib/http';
import { texto } from '@/lib/util';

type Contexto = ConParams<{ slug: string }>;

async function buscar(params: Contexto['params']) {
    const pagina = await paginaPorSlug((await params).slug);
    if (!pagina) throw new ErrorHttp(404, 'No existe esa página.');
    return pagina;
}

export const GET = ruta<Contexto>(async (_req, { params }) => {
    await exigirDocente();
    return responder(await buscar(params));
});

export const PUT = ruta<Contexto>(async (req, { params }) => {
    const usuario = await exigirDocente();
    const anterior = await buscar(params);
    const cuerpo = await leerJSON(req);
    const titulo = texto(cuerpo.titulo, 200);
    if (!titulo) throw new ErrorHttp(400, 'Falta el título.');
    if (typeof cuerpo.contenido_html !== 'string') throw new ErrorHttp(400, 'Falta el contenido.');
    const html = sanitizarHTML(cuerpo.contenido_html);

    await db.execute({
        sql: "UPDATE paginas SET titulo = ?, contenido_html = ?, autor_id = ?, actualizado_en = datetime('now') WHERE slug = ?",
        args: [titulo, html, usuario.id, anterior.slug],
    });
    // Las fotos que se sacaron de la página se borran de Blob (si nadie más las usa).
    const nuevas = archivosEnHTML(html);
    await borrarSiNoSeUsan(archivosEnHTML(anterior.contenido_html).filter(url => !nuevas.includes(url)));
    return responder({ ok: true, contenido_html: html });
});
