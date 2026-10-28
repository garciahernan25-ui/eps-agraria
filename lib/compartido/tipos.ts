// Tipos que comparten el servidor y el navegador.

export type Rol = 'admin' | 'docente';

export interface Usuario {
    id: number;
    nombre: string;
    email: string;
    rol: Rol;
}

export interface UsuarioListado extends Usuario {
    activo: number;
    creado_en: string;
}

export type TipoMedio = 'foto' | 'video';

export interface Medio {
    id?: number;
    url: string;
    tipo: TipoMedio;
}

export interface Publicacion {
    id: number;
    titulo: string;
    texto: string;
    seccion: string;
    creado_en: string;
    actualizado_en?: string;
    publicada?: number;
    autor: string | null;
    medios: Medio[];
}

export interface PaginaDePublicaciones {
    publicaciones: Publicacion[];
    pagina: number;
    paginas: number;
    total: number;
}

export interface Cultivo {
    id: number;
    slug: string;
    nombre: string;
    imagen: string | null;
    nombre_vulgar: string;
    nombre_cientifico: string;
    origen: string;
    caracteristicas: string;
    siembra: string;
    cosecha: string;
    orden: number;
}

export interface Docente {
    id: number;
    nombre: string;
    descripcion: string;
    foto: string | null;
    orden: number;
}

export interface TarjetaInicio {
    id: number;
    titulo: string;
    imagen: string | null;
    enlace: string;
    orden: number;
}

export interface Pagina {
    slug: string;
    titulo: string;
    contenido_html: string;
    actualizado_en: string;
    autor?: string | null;
}

export interface Experiencia {
    id: number;
    nombre: string | null;
    texto: string;
    foto_url: string | null;
    estado: 'pendiente' | 'aprobada';
    creado_en: string;
}

export interface Consulta {
    id: number;
    nombre: string | null;
    texto: string;
    leida: number;
    creado_en: string;
}

export type TipoInstagram = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';

export interface MedioInstagram {
    tipo: TipoInstagram;
    media_url: string | null;
    thumbnail_url: string | null;
}

export interface PostInstagram {
    id: string;
    tipo: TipoInstagram;
    media_url: string | null;
    thumbnail_url: string | null;
    permalink: string;
    caption: string | null;
    timestamp: string;
    hijos: MedioInstagram[];
}

export interface PaginaDeInstagram {
    posts: PostInstagram[];
    pagina: number;
    paginas: number;
}

export interface EstadoInstagram {
    conectado: boolean;
    usuario: string | null;
    vence: string | null;
    ultimaSync: string | null;
    ultimoError: string | null;
    cantidad: number;
    cronConfigurado: boolean;
}
