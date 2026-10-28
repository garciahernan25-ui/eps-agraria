// Estado de la conexión con Instagram (solo admin).
import { fila } from '@/lib/db';
import { exigirAdmin } from '@/lib/auth';
import { leerAjuste } from '@/lib/instagram';
import { responder, ruta } from '@/lib/http';
import type { EstadoInstagram } from '@/lib/compartido/tipos';

export const GET = ruta(async () => {
    await exigirAdmin();
    const [token, usuario, vence, ultimaSync, ultimoError, cantidad] = await Promise.all([
        leerAjuste('instagram_token'),
        leerAjuste('instagram_usuario'),
        leerAjuste('instagram_token_vence'),
        leerAjuste('instagram_ultima_sync'),
        leerAjuste('instagram_ultimo_error'),
        fila<{ n: number }>('SELECT COUNT(*) AS n FROM instagram_posts').then(r => r!.n),
    ]);
    const estado: EstadoInstagram = {
        conectado: Boolean(token || process.env.INSTAGRAM_TOKEN),
        usuario, vence, ultimaSync, ultimoError, cantidad,
        cronConfigurado: Boolean(process.env.CRON_SECRET),
    };
    return responder(estado);
});
