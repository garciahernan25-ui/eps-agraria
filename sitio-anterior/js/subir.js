// Subida de fotos y videos desde el panel.
// En Vercel el archivo va directo del navegador a Vercel Blob (no pasa por
// nuestro servidor, que no acepta más de 4.5 MB). Con `npm run dev` y sin
// BLOB_READ_WRITE_TOKEN, se guarda en la carpeta subidas-locales/.
import { pedirJSON } from './comun.js';

const CLIENTE_BLOB = 'https://esm.sh/@vercel/blob@2.8.2/client';
const MB = 1024 * 1024;

export const FORMATOS = {
    foto: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
};
export const ACEPTA_FOTOS = FORMATOS.foto.join(',');
export const ACEPTA_MEDIOS = [...FORMATOS.foto, ...FORMATOS.video].join(',');

let configuracion = null;

export function tipoDeArchivo(archivo) {
    return Object.keys(FORMATOS).find(tipo => FORMATOS[tipo].includes(archivo.type)) ?? null;
}

// Nombre seguro para la URL: sin acentos, espacios ni símbolos.
function nombreLimpio(nombre) {
    return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(-60).toLowerCase() || 'archivo';
}

// Revisa formato y tamaño antes de subir. Devuelve 'foto' o 'video', o lanza un Error con el motivo.
export async function validarArchivo(archivo, { soloFotos = false } = {}) {
    const tipo = tipoDeArchivo(archivo);
    if (!tipo || (soloFotos && tipo !== 'foto')) {
        throw new Error(`"${archivo.name}" no es un formato permitido (${soloFotos ? 'JPG, PNG, WEBP o GIF' : 'fotos JPG, PNG, WEBP o GIF; videos MP4, WEBM o MOV'}).`);
    }

    configuracion ??= await pedirJSON('/api/admin/subidas');
    const maximo = configuracion.limites[tipo];
    if (archivo.size > maximo) {
        throw new Error(`"${archivo.name}" pesa ${(archivo.size / MB).toFixed(1)} MB. El máximo para ${tipo === 'foto' ? 'fotos' : 'videos'} es ${maximo / MB} MB.`);
    }
    return tipo;
}

// Sube un archivo y devuelve { url, tipo }. `carpeta`: publicaciones, cultivos, docentes, paginas o inicio.
export async function subirArchivo(archivo, carpeta, { soloFotos = false, alProgreso } = {}) {
    const tipo = await validarArchivo(archivo, { soloFotos });
    const ruta = `${carpeta}/${nombreLimpio(archivo.name)}`;

    if (configuracion.modo === 'blob') {
        const { upload } = await import(CLIENTE_BLOB);
        try {
            const blob = await upload(ruta, archivo, {
                access: 'public',
                handleUploadUrl: '/api/subidas',
                clientPayload: JSON.stringify({ tipo }),
                multipart: archivo.size > 20 * MB,
                onUploadProgress: (e) => alProgreso?.(e.percentage),
            });
            return { url: blob.url, tipo };
        } catch (err) {
            throw new Error(`No se pudo subir "${archivo.name}". ${err.message}`);
        }
    }

    if (configuracion.modo === 'local') {
        const params = new URLSearchParams({ tipo, nombre: ruta.split('/')[1] });
        const respuesta = await fetch(`/api/subidas-locales?${params}`, {
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
export function descartarArchivo(url) {
    return pedirJSON('/api/admin/archivos/descartar', { method: 'POST', body: JSON.stringify({ url }) }).catch(() => {});
}
