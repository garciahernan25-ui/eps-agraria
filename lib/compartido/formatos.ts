// Formatos y tamaños de los archivos que suben los docentes (los usa el servidor y el panel).
import type { TipoMedio } from './tipos';

const MB = 1024 * 1024;

export const TIPOS: Record<TipoMedio, { mime: string[]; maxBytes: number }> = {
    foto: { mime: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], maxBytes: 10 * MB },
    video: { mime: ['video/mp4', 'video/webm', 'video/quicktime'], maxBytes: 200 * MB },
};

// Carpetas de Blob donde el panel puede subir archivos.
export const CARPETAS = ['publicaciones', 'cultivos', 'docentes', 'paginas', 'inicio'] as const;
export type Carpeta = (typeof CARPETAS)[number];

// Sin Blob configurado y fuera de Vercel, los archivos se guardan en esta carpeta.
export const CARPETA_LOCAL = 'subidas-locales';

// Extensión con la que se guarda cada formato. Así, una foto ".jfif" (que es un JPG)
// queda como ".jpg" y Blob la reconoce.
export const EXTENSIONES: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

export function tipoDeMime(mime: string): TipoMedio | null {
    return (Object.keys(TIPOS) as TipoMedio[]).find(tipo => TIPOS[tipo].mime.includes(mime)) ?? null;
}

export const ACEPTA_FOTOS = TIPOS.foto.mime.join(',');
export const ACEPTA_MEDIOS = [...TIPOS.foto.mime, ...TIPOS.video.mime].join(',');
