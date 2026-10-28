// Lecturas de la base que usan las páginas públicas (se renderizan en el servidor) y la API.
import { fila, filas } from './db';
import type {
    Consulta, Cultivo, Docente, Experiencia, Medio, Pagina, PaginaDeInstagram, PaginaDePublicaciones,
    PostInstagram, Publicacion, TarjetaInicio,
} from './compartido/tipos';

const PUBLICACIONES_POR_PAGINA = 10;
const INSTAGRAM_POR_PAGINA = 24;

// ---------- Publicaciones ----------

// Agrega a cada publicación su lista de medios, en orden.
async function conMedios(publicaciones: Omit<Publicacion, 'medios'>[]): Promise<Publicacion[]> {
    if (!publicaciones.length) return [];
    const ids = publicaciones.map(p => p.id);
    const medios = await filas<Medio & { publicacion_id: number }>(
        `SELECT id, publicacion_id, url, tipo FROM publicacion_medios
         WHERE publicacion_id IN (${ids.map(() => '?').join(',')}) ORDER BY orden, id`, ids);
    return publicaciones.map(p => ({
        ...p,
        medios: medios.filter(m => m.publicacion_id === p.id).map(({ id, url, tipo }) => ({ id, url, tipo })),
    }));
}

// Publicaciones visibles, de la más nueva a la más vieja. Sin sección: todas (Novedades).
export async function publicacionesPublicas(seccion: string | null, pagina: number): Promise<PaginaDePublicaciones> {
    const filtro = seccion ? 'AND p.seccion = ?' : '';
    const args = seccion ? [seccion] : [];
    const total = (await fila<{ n: number }>(`SELECT COUNT(*) AS n FROM publicaciones p WHERE p.publicada = 1 ${filtro}`, args))!.n;
    const lista = await filas<Omit<Publicacion, 'medios'>>(
        `SELECT p.id, p.titulo, p.texto, p.seccion, p.creado_en, u.nombre AS autor
         FROM publicaciones p LEFT JOIN usuarios u ON u.id = p.autor_id
         WHERE p.publicada = 1 ${filtro}
         ORDER BY p.creado_en DESC, p.id DESC LIMIT ? OFFSET ?`,
        [...args, PUBLICACIONES_POR_PAGINA, (pagina - 1) * PUBLICACIONES_POR_PAGINA]);
    return {
        publicaciones: await conMedios(lista),
        pagina,
        paginas: Math.max(1, Math.ceil(total / PUBLICACIONES_POR_PAGINA)),
        total,
    };
}

export async function todasLasPublicaciones(): Promise<Publicacion[]> {
    const lista = await filas<Omit<Publicacion, 'medios'>>(
        `SELECT p.id, p.titulo, p.texto, p.seccion, p.publicada, p.creado_en, p.actualizado_en, u.nombre AS autor
         FROM publicaciones p LEFT JOIN usuarios u ON u.id = p.autor_id
         ORDER BY p.creado_en DESC, p.id DESC LIMIT 300`);
    return conMedios(lista);
}

// ---------- Contenido ----------

export const tarjetasDeInicio = () =>
    filas<TarjetaInicio>('SELECT id, titulo, imagen, enlace, orden FROM inicio_tarjetas ORDER BY orden, id');

export const listaDeCultivos = () =>
    filas<Cultivo>('SELECT * FROM cultivos ORDER BY orden, id');

export const cultivoPorSlug = (slug: string) =>
    fila<Cultivo>('SELECT * FROM cultivos WHERE slug = ?', [slug]);

export const listaDeDocentes = () =>
    filas<Docente>('SELECT id, nombre, descripcion, foto, orden FROM docentes ORDER BY orden, id');

export const paginaPorSlug = (slug: string) =>
    fila<Pagina>('SELECT slug, titulo, contenido_html, actualizado_en FROM paginas WHERE slug = ?', [slug]);

export const listaDePaginas = () =>
    filas<Pagina>(`SELECT p.slug, p.titulo, p.actualizado_en, u.nombre AS autor
                   FROM paginas p LEFT JOIN usuarios u ON u.id = p.autor_id ORDER BY p.titulo`);

// ---------- Estudiantes ----------

export const experienciasAprobadas = () =>
    filas<Experiencia>("SELECT id, nombre, texto, foto_url, estado, creado_en FROM experiencias WHERE estado = 'aprobada' ORDER BY creado_en DESC LIMIT 100");

export const todasLasExperiencias = () =>
    filas<Experiencia>('SELECT id, nombre, texto, foto_url, estado, creado_en FROM experiencias ORDER BY estado DESC, creado_en DESC');

export const todasLasConsultas = () =>
    filas<Consulta>('SELECT id, nombre, texto, leida, creado_en FROM consultas ORDER BY leida, creado_en DESC');

// ---------- Instagram ----------

export async function postsDeInstagram(pagina: number): Promise<PaginaDeInstagram> {
    const total = (await fila<{ n: number }>('SELECT COUNT(*) AS n FROM instagram_posts'))!.n;
    const posts = await filas<Omit<PostInstagram, 'hijos'> & { hijos: string | null }>(
        `SELECT id, tipo, media_url, thumbnail_url, permalink, caption, timestamp, hijos
         FROM instagram_posts ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
        [INSTAGRAM_POR_PAGINA, (pagina - 1) * INSTAGRAM_POR_PAGINA]);
    return {
        posts: posts.map(p => ({ ...p, hijos: p.hijos ? JSON.parse(p.hijos) : [] })),
        pagina,
        paginas: Math.max(1, Math.ceil(total / INSTAGRAM_POR_PAGINA)),
    };
}
