// Borra un archivo que se subió pero no se llegó a guardar (por ejemplo, si se canceló
// el formulario). Si algún contenido lo usa, no se toca.
import { exigirDocente } from '@/lib/auth';
import { borrarSiNoSeUsan, urlArchivoValida } from '@/lib/archivos';
import { ErrorHttp, leerJSON, responder, ruta } from '@/lib/http';

export const POST = ruta(async (req) => {
    await exigirDocente();
    const { url } = await leerJSON(req, 10_000);
    if (!urlArchivoValida(url)) throw new ErrorHttp(400, 'Archivo inválido.');
    await borrarSiNoSeUsan([url]);
    return responder({ ok: true });
});
