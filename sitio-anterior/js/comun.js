// Funciones compartidas por las páginas que cargan contenido desde la API.

// Evita que un texto con etiquetas HTML rompa (o ataque) la página.
export function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// Las fechas de la base están en UTC con formato "AAAA-MM-DD HH:MM:SS".
export function formatearFecha(fecha, { conHora = false } = {}) {
    const d = new Date(fecha.includes('T') ? fecha : fecha.replace(' ', 'T') + 'Z');
    const opciones = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (conHora) Object.assign(opciones, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleString('es-AR', opciones);
}

// fetch + JSON. Si la respuesta es un error, lanza un Error con el mensaje del servidor.
export async function pedirJSON(url, opciones = {}) {
    let respuesta;
    try {
        respuesta = await fetch(url, {
            ...opciones,
            headers: typeof opciones.body === 'string' ? { 'Content-Type': 'application/json' } : {},
        });
    } catch {
        throw new Error('No se pudo conectar con el servidor. Revisá tu conexión.');
    }
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        const error = new Error(datos.error || 'Error del servidor. Probá de nuevo más tarde.');
        error.status = respuesta.status;
        throw error;
    }
    return datos;
}

// HTML de una foto o un video. La URL se escapa siempre.
export function htmlMedio(medio, alt = '') {
    const url = escaparHTML(medio.url);
    if (medio.tipo === 'video') {
        return `<video src="${url}" controls preload="metadata" playsinline></video>`;
    }
    return `<img src="${url}" alt="${escaparHTML(alt)}" loading="lazy">`;
}

// Mensaje visible dentro de un contenedor (cargando, vacío o error).
export function mostrarEstado(contenedor, mensaje, { error = false } = {}) {
    contenedor.innerHTML = `<p class="estado-carga${error ? ' estado-carga--error' : ''}">${escaparHTML(mensaje)}</p>`;
}

export const MENSAJE_ERROR = 'No se pudo cargar el contenido. Revisá tu conexión y recargá la página.';
