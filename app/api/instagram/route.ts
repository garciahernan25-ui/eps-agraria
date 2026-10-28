// Posteos de la galería, de a 24 ("Ver más" en galeria.html).
import { postsDeInstagram } from '@/lib/datos';
import { responder, ruta } from '@/lib/http';
import { numeroDePagina } from '@/lib/util';

export const GET = ruta(async (req) => responder(await postsDeInstagram(numeroDePagina(new URL(req.url).searchParams.get('pagina')))));
