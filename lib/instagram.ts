// Sincronización con Instagram (Instagram API with Instagram Login).
// El token de larga duración dura 60 días: se renueva solo cuando faltan menos de 15.
import { db, fila } from './db';

const API = 'https://graph.instagram.com';
const CAMPOS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}';
const DIA = 24 * 60 * 60 * 1000;
const RENOVAR_SI_FALTAN = 15 * DIA;
const MAX_PAGINAS = 20; // 20 × 50 = hasta 1000 posteos por sincronización
const TIPOS = ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'];

interface PostDeInstagram {
    id: string;
    caption?: string;
    media_type: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
    timestamp: string;
    children?: { data: { media_type: string; media_url?: string; thumbnail_url?: string }[] };
}

// ---------- Ajustes (clave/valor) ----------

export async function leerAjuste(clave: string): Promise<string | null> {
    return (await fila<{ valor: string | null }>('SELECT valor FROM ajustes WHERE clave = ?', [clave]))?.valor ?? null;
}

export async function guardarAjuste(clave: string, valor: string) {
    await db.execute({
        sql: 'INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor',
        args: [clave, valor],
    });
}

// ---------- Pedidos a Instagram ----------

async function pedirInstagram<T>(ruta: string, parametros: Record<string, string> = {}): Promise<T> {
    const url = ruta.startsWith('https://') ? ruta : `${API}${ruta}?${new URLSearchParams(parametros)}`;
    let respuesta: Response;
    try {
        respuesta = await fetch(url, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
    } catch {
        throw new Error('No se pudo conectar con Instagram.');
    }
    const datos = await respuesta.json().catch(() => ({})) as T & { error?: { message?: string } };
    if (!respuesta.ok || datos.error) {
        throw new Error(`Instagram respondió: ${datos.error?.message || `error ${respuesta.status}`}`);
    }
    return datos;
}

async function guardarToken(token: string, venceEn: number) {
    await guardarAjuste('instagram_token', token);
    await guardarAjuste('instagram_token_vence', new Date(venceEn).toISOString());
}

// Valida un token nuevo (pegado en el panel) y lo guarda. Devuelve el nombre de la cuenta.
export async function conectarToken(token: string): Promise<string> {
    const cuenta = await pedirInstagram<{ username?: string }>('/me', { fields: 'user_id,username', access_token: token });
    // Un token recién generado dura 60 días.
    await guardarToken(token, Date.now() + 60 * DIA);
    await guardarAjuste('instagram_usuario', cuenta.username ?? '');
    return cuenta.username ?? '';
}

// Devuelve un token válido, renovándolo si faltan menos de 15 días para que venza.
async function tokenVigente(): Promise<string> {
    let token = await leerAjuste('instagram_token');
    if (!token && process.env.INSTAGRAM_TOKEN) {
        // Primera vez: se usa el token de la variable de entorno y desde ahí se guarda en la base.
        await conectarToken(process.env.INSTAGRAM_TOKEN);
        token = process.env.INSTAGRAM_TOKEN;
    }
    if (!token) throw new Error('Falta conectar Instagram: pegá el token en el panel (pestaña Instagram).');

    const vence = Date.parse(await leerAjuste('instagram_token_vence') ?? '') || 0;
    if (vence - Date.now() > RENOVAR_SI_FALTAN) return token;

    try {
        const nuevo = await pedirInstagram<{ access_token: string; expires_in: number }>(
            '/refresh_access_token', { grant_type: 'ig_refresh_token', access_token: token });
        await guardarToken(nuevo.access_token, Date.now() + nuevo.expires_in * 1000);
        return nuevo.access_token;
    } catch (err) {
        // Instagram no renueva tokens de menos de 24 h: si todavía sirve, se sigue con el mismo.
        if (vence > Date.now()) return token;
        throw new Error(`El token de Instagram venció y no se pudo renovar. Generá uno nuevo. (${(err as Error).message})`);
    }
}

// ---------- Sincronización ----------

function sentencia(post: PostDeInstagram, ahora: string) {
    const hijos = post.children?.data?.map(h => ({
        tipo: h.media_type,
        media_url: h.media_url ?? null,
        thumbnail_url: h.thumbnail_url ?? null,
    }));
    return {
        sql: `INSERT INTO instagram_posts (id, tipo, media_url, thumbnail_url, permalink, caption, timestamp, hijos, sincronizado_en)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (id) DO UPDATE SET tipo = excluded.tipo, media_url = excluded.media_url,
                  thumbnail_url = excluded.thumbnail_url, permalink = excluded.permalink, caption = excluded.caption,
                  timestamp = excluded.timestamp, hijos = excluded.hijos, sincronizado_en = excluded.sincronizado_en`,
        args: [
            String(post.id), post.media_type, post.media_url ?? null, post.thumbnail_url ?? null,
            post.permalink ?? '', post.caption ?? null,
            new Date(post.timestamp).toISOString(), // Instagram manda "+0000", que Safari no entiende
            hijos ? JSON.stringify(hijos) : null, ahora,
        ],
    };
}

// Trae todos los posteos (con paginación) y actualiza la tabla.
export async function sincronizarInstagram(): Promise<{ total: number }> {
    const ahora = new Date().toISOString();
    try {
        const token = await tokenVigente();
        let siguiente: string | null = `${API}/me/media?${new URLSearchParams({ fields: CAMPOS, limit: '50', access_token: token })}`;
        let total = 0;

        for (let pagina = 0; siguiente && pagina < MAX_PAGINAS; pagina++) {
            const datos: { data?: PostDeInstagram[]; paging?: { next?: string } } = await pedirInstagram(siguiente);
            const sentencias = (datos.data ?? []).filter(p => TIPOS.includes(p.media_type) && p.permalink).map(p => sentencia(p, ahora));
            if (sentencias.length) await db.batch(sentencias, 'write');
            total += sentencias.length;
            siguiente = datos.paging?.next ?? null;
        }

        // Si se recorrieron todas las páginas, lo que no vino más se borró de Instagram.
        if (!siguiente) {
            await db.execute({ sql: 'DELETE FROM instagram_posts WHERE sincronizado_en < ?', args: [ahora] });
        }
        await guardarAjuste('instagram_ultima_sync', ahora);
        await guardarAjuste('instagram_ultimo_error', '');
        return { total };
    } catch (err) {
        await guardarAjuste('instagram_ultimo_error', `${ahora} — ${(err as Error).message}`);
        throw err;
    }
}
