// Pedidos del panel a la API. Si la sesión venció, avisa para volver a mostrar el login.
let alExpirarSesion: (() => void) | null = null;

export function cuandoVenzaLaSesion(fn: () => void) {
    alExpirarSesion = fn;
}

export async function api<T = { ok: true }>(url: string, metodo = 'GET', datos?: unknown): Promise<T> {
    let respuesta: Response;
    try {
        respuesta = await fetch(url, {
            method: metodo,
            headers: datos === undefined ? {} : { 'Content-Type': 'application/json' },
            body: datos === undefined ? undefined : JSON.stringify(datos),
        });
    } catch {
        throw new Error('No se pudo conectar con el servidor. Revisá tu conexión.');
    }
    const json = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 401 && !url.endsWith('/login')) {
        alExpirarSesion?.();
        throw new Error('La sesión venció. Volvé a ingresar.');
    }
    if (!respuesta.ok) throw new Error(json.error || 'Error del servidor. Probá de nuevo más tarde.');
    return json as T;
}
