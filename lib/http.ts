// Ayudas para las rutas de la API (app/api/**/route.ts).
import { NextResponse } from 'next/server';

// Error con código HTTP y un mensaje que se le puede mostrar al usuario.
export class ErrorHttp extends Error {
    constructor(public estado: number, mensaje: string) {
        super(mensaje);
    }
}

export const responder = (datos: unknown, estado = 200) => NextResponse.json(datos, { status: estado });

type Manejador<C> = (req: Request, contexto: C) => Promise<Response>;

// Envuelve un manejador: los ErrorHttp se devuelven como { error } y lo demás como error 500.
export function ruta<C = unknown>(manejador: Manejador<C>): Manejador<C> {
    return async (req, contexto) => {
        try {
            return await manejador(req, contexto);
        } catch (err) {
            if (err instanceof ErrorHttp) return responder({ error: err.message }, err.estado);
            console.error(err);
            return responder({ error: 'Error del servidor. Probá de nuevo más tarde.' }, 500);
        }
    };
}

// Lee el cuerpo JSON con un tamaño máximo (el panel manda hasta ~1 MB de HTML).
export async function leerJSON(req: Request, maxBytes = 1024 * 1024): Promise<Record<string, unknown>> {
    const cuerpo = await req.text();
    if (cuerpo.length > maxBytes) throw new ErrorHttp(413, 'El contenido es demasiado grande.');
    if (!cuerpo) return {};
    try {
        const datos: unknown = JSON.parse(cuerpo);
        return datos && typeof datos === 'object' ? datos as Record<string, unknown> : {};
    } catch {
        throw new ErrorHttp(400, 'Datos inválidos.');
    }
}

// Parámetros de rutas dinámicas: en Next 16 vienen como Promise.
export type ConParams<P> = { params: Promise<P> };
