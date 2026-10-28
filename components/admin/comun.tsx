'use client';
// Piezas que comparten las pestañas del panel.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { hrefDe } from '@/lib/compartido/paginas';
import type { Usuario } from '@/lib/compartido/tipos';
import { api } from './api';

// Avisos arriba de la vista ("Cambios guardados", errores).
export const ContextoAviso = createContext<(mensaje: string, opciones?: { error?: boolean }) => void>(() => {});
export const useAviso = () => useContext(ContextoAviso);

export const ContextoUsuario = createContext<Usuario | null>(null);
export const useUsuario = () => useContext(ContextoUsuario)!;

// Carga una lista de la API y permite recargarla después de un cambio.
export function useDatos<T>(url: string) {
    const [datos, setDatos] = useState<T | null>(null);
    const [error, setError] = useState('');
    const recargar = useCallback(async () => {
        try {
            setDatos(await api<T>(url));
            setError('');
        } catch (err) {
            setError((err as Error).message);
        }
    }, [url]);
    useEffect(() => { recargar(); }, [recargar]);
    return { datos, error, recargar };
}

// Muestra "cargando" o el error con un botón para reintentar.
export function Cargando({ error, recargar }: { error: string; recargar: () => void }) {
    if (!error) return <p className="panel-vacio">Cargando…</p>;
    return (
        <>
            <p className="panel-error">{error}</p>
            <button type="button" className="btn btn-secundario" onClick={recargar}>Reintentar</button>
        </>
    );
}

export function EncabezadoVista({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children?: ReactNode }) {
    return (
        <div className="vista-encabezado">
            <div>
                <h2>{titulo}</h2>
                {descripcion && <p>{descripcion}</p>}
            </div>
            <div className="item__acciones">{children}</div>
        </div>
    );
}

export function EnlaceSitio({ href, texto = 'Ver en el sitio' }: { href: string; texto?: string }) {
    return <a className="btn btn-secundario btn-chico" href={hrefDe(href)} target="_blank" rel="noopener">{texto} ↗</a>;
}

// Botón que se deshabilita mientras corre la acción y muestra el error si falla.
export function BotonAccion({ accion, className = 'btn btn-secundario btn-chico', children, confirmar, ...resto }: {
    accion: () => Promise<unknown>; className?: string; children: ReactNode; confirmar?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
    const avisar = useAviso();
    const [ocupado, setOcupado] = useState(false);
    return (
        <button type="button" className={className} disabled={ocupado || resto.disabled} {...resto} onClick={async () => {
            if (confirmar && !confirm(confirmar)) return;
            setOcupado(true);
            try {
                await accion();
            } catch (err) {
                avisar((err as Error).message, { error: true });
            } finally {
                setOcupado(false);
            }
        }}>
            {children}
        </button>
    );
}
