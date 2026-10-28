// Subida de fotos y videos desde el panel.
// En Vercel el archivo va directo del navegador a Vercel Blob (no pasa por
// nuestro servidor, que no acepta más de 4.5 MB). En tu compu y sin
// BLOB_READ_WRITE_TOKEN, se guarda en .subidas-locales/.
import { upload } from '@vercel/blob/client';
import { tipoDeMime, type Carpeta } from '@/lib/compartido/formatos';
import type { TipoMedio } from '@/lib/compartido/tipos';
import { api } from './api';

const MB = 1024 * 1024;

let configuracion: Promise<{ modo: 'blob' | 'local' | 'ninguno'; limites: Record<TipoMedio, number> }> | null = null;

function obtenerConfiguracion() {
    configuracion ??= api<{ modo: 'blob' | 'local' | 'ninguno'; limites: Record<TipoMedio, number> }>('/api/admin/subidas')
        .catch(err => { configuracion = null; throw err; });
    return configuracion;
}

// Nombre seguro para la URL: sin acentos, espacios ni símbolos.
function nombreLimpio(nombre: string): string {
    return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(-60).toLowerCase() || 'archivo';
}

// Revisa formato y tamaño antes de subir. Devuelve 'foto' o 'video', o lanza un Error con el motivo.
export async function validarArchivo(archivo: File, { soloFotos = false } = {}): Promise<TipoMedio> {
    const tipo = tipoDeMime(archivo.type);
    if (!tipo || (soloFotos && tipo !== 'foto')) {
        throw new Error(`"${archivo.name}" no es un formato permitido (${soloFotos ? 'JPG, PNG, WEBP o GIF' : 'fotos JPG, PNG, WEBP o GIF; videos MP4, WEBM o MOV'}).`);
    }
    const maximo = (await obtenerConfiguracion()).limites[tipo];
    if (archivo.size > maximo) {
        throw new Error(`"${archivo.name}" pesa ${(archivo.size / MB).toFixed(1)} MB. El máximo para ${tipo === 'foto' ? 'fotos' : 'videos'} es ${maximo / MB} MB.`);
    }
    return tipo;
}

// Sube un archivo y devuelve { url, tipo }.
export async function subirArchivo(archivo: File, carpeta: Carpeta, { soloFotos = false, alProgreso }: {
    soloFotos?: boolean; alProgreso?: (porcentaje: number) => void;
} = {}): Promise<{ url: string; tipo: TipoMedio }> {
    const tipo = await validarArchivo(archivo, { soloFotos });
    const { modo } = await obtenerConfiguracion();
    const nombre = nombreLimpio(archivo.name);

    if (modo === 'blob') {
        try {
            const blob = await upload(`${carpeta}/${nombre}`, archivo, {
                access: 'public',
                handleUploadUrl: '/api/subidas',
                clientPayload: JSON.stringify({ tipo }),
                multipart: archivo.size > 20 * MB,
                onUploadProgress: (e) => alProgreso?.(e.percentage),
            });
            return { url: blob.url, tipo };
        } catch (err) {
            throw new Error(`No se pudo subir "${archivo.name}". ${(err as Error).message}`);
        }
    }

    if (modo === 'local') {
        const respuesta = await fetch(`/api/subidas-locales?${new URLSearchParams({ tipo, nombre })}`, {
            method: 'POST',
            headers: { 'Content-Type': archivo.type },
            body: archivo,
        });
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.error || `No se pudo subir "${archivo.name}".`);
        alProgreso?.(100);
        return { url: datos.url, tipo };
    }

    throw new Error('La subida de archivos no está configurada. Conectá un Blob Store al proyecto en Vercel.');
}

// Avisa al servidor que un archivo subido no se va a usar, para que lo borre.
export function descartarArchivo(url: string) {
    api('/api/admin/archivos/descartar', 'POST', { url }).catch(() => {});
}
