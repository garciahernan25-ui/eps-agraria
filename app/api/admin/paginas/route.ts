import { exigirDocente } from '@/lib/auth';
import { listaDePaginas } from '@/lib/datos';
import { responder, ruta } from '@/lib/http';

export const GET = ruta(async () => {
    await exigirDocente();
    return responder(await listaDePaginas());
});
