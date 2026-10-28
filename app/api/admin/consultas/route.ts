import { exigirDocente } from '@/lib/auth';
import { todasLasConsultas } from '@/lib/datos';
import { responder, ruta } from '@/lib/http';

export const GET = ruta(async () => {
    await exigirDocente();
    return responder(await todasLasConsultas());
});
