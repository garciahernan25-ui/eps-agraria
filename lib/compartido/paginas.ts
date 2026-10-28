// Páginas de texto editables desde el panel (pestaña Páginas).
// `ruta` es la URL de siempre (se mantiene igual que en el sitio viejo).
import type { IdSeccion } from './secciones';

export interface PaginaDeTexto {
    ruta: string;            // "cea 34.html"
    slug: string;            // clave en la tabla paginas
    titulo: string;          // nombre en el panel
    seccion?: IdSeccion;     // si tiene, muestra las publicaciones de esa sección al final
    cssExtra?: string;       // hoja de estilos extra que usaba la página
    menuActivo?: string;     // enlace del menú que se resalta
}

export const PAGINAS_DE_TEXTO: PaginaDeTexto[] = [
    { ruta: 'nosotros.html', slug: 'nosotros', titulo: 'Nosotros', menuActivo: 'nosotros.html' },
    { ruta: 'agraria.html', slug: 'agraria', titulo: 'E.E.S.A n°1' },
    { ruta: 'cea 34.html', slug: 'cea-34', titulo: 'C.E.A 34', seccion: 'cea34' },
    { ruta: 'cursos.html', slug: 'cursos', titulo: 'Cursos', seccion: 'cursos' },
    { ruta: 'biopreparados.html', slug: 'biopreparados', titulo: 'Biopreparados', seccion: 'biopreparados', menuActivo: 'biopreparados.html' },
    { ruta: 'paso apaso huerta.html', slug: 'huerta', titulo: 'Huerta paso a paso', seccion: 'huerta' },
    { ruta: 'siembra y cosecha.html', slug: 'siembra-y-cosecha', titulo: 'Calendario de siembra y cosecha', cssExtra: '/css/estilos.css' },
    { ruta: 'excursiones.html', slug: 'salidas-educativas', titulo: 'Salidas educativas', seccion: 'salidas' },
    { ruta: 'una obra para recordar.html', slug: 'una-obra-para-recordar', titulo: 'Una obra para recordar' },
    { ruta: 'antologia literaria.html', slug: 'antologia-literaria', titulo: 'Antología literaria' },
    { ruta: 'otras actividades.html', slug: 'otras-actividades', titulo: 'Otras actividades', seccion: 'actividades' },
];

// slug → URL pública (para "Ver en el sitio" en el panel). La presentación de docentes vive en docentes.html.
export const URL_DE_PAGINA: Record<string, string> = Object.fromEntries([
    ...PAGINAS_DE_TEXTO.map(p => [p.slug, p.ruta]),
    ['docentes', 'docentes.html'],
]);

export function paginaPorRuta(ruta: string): PaginaDeTexto | undefined {
    return PAGINAS_DE_TEXTO.find(p => p.ruta === ruta);
}

// Páginas que se pueden elegir como enlace de una tarjeta de inicio.
export const PAGINAS_DEL_SITIO = [
    'siembra y cosecha.html', 'paso apaso huerta.html', 'una obra para recordar.html', 'antologia literaria.html',
    'test vocacional.html', 'cursos.html', 'cea 34.html', 'agraria.html', 'estudiantes.html', 'docentes.html',
    'juegos.html', 'excursiones.html', 'otras actividades.html', 'cultivos.html', 'biopreparados.html',
    'nosotros.html', 'novedades.html', 'galeria.html',
];

// Las páginas tienen espacios en el nombre ("cea 34.html"): se codifican para usarlas en un href.
export function hrefDe(enlace: string): string {
    if (/^https:\/\//.test(enlace)) return enlace;
    try {
        return '/' + encodeURI(decodeURI(enlace)).replace(/^\//, '');
    } catch {
        return '/' + encodeURI(enlace).replace(/^\//, '');
    }
}

// Las imágenes del contenido viejo usan rutas relativas ("img/Acelga.jpg"): se pasan a absolutas.
export function srcDe(ruta: string | null | undefined): string {
    if (!ruta) return '';
    return /^(https?:)?\/\//.test(ruta) || ruta.startsWith('/') ? ruta : '/' + ruta;
}
