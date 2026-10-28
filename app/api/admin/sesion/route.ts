import { usuarioDeSesion } from '@/lib/auth';
import { responder, ruta } from '@/lib/http';

export const GET = ruta(async () => responder({ usuario: await usuarioDeSesion() }));
