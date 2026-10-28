// Galería de Instagram: lista pública, cron diario y controles del panel (solo admin).
import { Router } from 'express';
import { db } from '../db.js';
import { claveCorrecta, soloAdmin } from '../auth.js';
import { leerAjuste, conectarToken, sincronizarInstagram } from '../instagram.js';
import { texto } from '../util.js';

const rutas = Router();
const POR_PAGINA = 24;

rutas.get('/api/instagram', async (req, res) => {
    const pagina = Math.max(1, Math.min(1000, Number.parseInt(req.query.pagina, 10) || 1));
    const total = (await db.execute('SELECT COUNT(*) AS n FROM instagram_posts')).rows[0].n;
    const { rows } = await db.execute({
        sql: `SELECT id, tipo, media_url, thumbnail_url, permalink, caption, timestamp, hijos
              FROM instagram_posts ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
        args: [POR_PAGINA, (pagina - 1) * POR_PAGINA],
    });
    res.json({
        posts: rows.map(p => ({ ...p, hijos: p.hijos ? JSON.parse(p.hijos) : [] })),
        pagina,
        paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    });
});

// Lo llama el cron de Vercel una vez por día (ver "crons" en vercel.json).
// Vercel manda el header Authorization: Bearer <CRON_SECRET>.
rutas.get('/api/cron/instagram', async (req, res) => {
    const secreto = process.env.CRON_SECRET;
    if (!secreto || !claveCorrecta(req.headers.authorization ?? '', `Bearer ${secreto}`)) {
        return res.status(401).json({ error: 'No autorizado.' });
    }
    try {
        res.json({ ok: true, ...await sincronizarInstagram() });
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

// ---------- Panel ----------

rutas.get('/api/admin/instagram', soloAdmin, async (req, res) => {
    const [token, usuario, vence, ultimaSync, ultimoError, cantidad] = await Promise.all([
        leerAjuste('instagram_token'),
        leerAjuste('instagram_usuario'),
        leerAjuste('instagram_token_vence'),
        leerAjuste('instagram_ultima_sync'),
        leerAjuste('instagram_ultimo_error'),
        db.execute('SELECT COUNT(*) AS n FROM instagram_posts').then(r => r.rows[0].n),
    ]);
    res.json({
        conectado: Boolean(token || process.env.INSTAGRAM_TOKEN),
        usuario, vence, ultimaSync, ultimoError, cantidad,
        cronConfigurado: Boolean(process.env.CRON_SECRET),
    });
});

rutas.post('/api/admin/instagram/token', soloAdmin, async (req, res) => {
    const token = texto(req.body?.token, 1000);
    if (token.length < 20) return res.status(400).json({ error: 'Pegá el token completo.' });
    try {
        const usuario = await conectarToken(token);
        const { total } = await sincronizarInstagram();
        res.json({ ok: true, usuario, total });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

rutas.post('/api/admin/instagram/sincronizar', soloAdmin, async (req, res) => {
    try {
        res.json({ ok: true, ...await sincronizarInstagram() });
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

export default rutas;
