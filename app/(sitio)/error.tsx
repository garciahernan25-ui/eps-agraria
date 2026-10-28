'use client';
// Si algo falla al leer la base, se muestra esto en vez de una página vacía.
import { Encabezado, Estado, Pie } from '@/components/Sitio';

export default function ErrorDelSitio({ reset }: { error: Error; reset: () => void }) {
    return (
        <>
            <Encabezado />
            <main className="contenedor">
                <Estado error>
                    No se pudo cargar el contenido. Revisá tu conexión y{' '}
                    <button type="button" className="paginacion__boton" onClick={reset}>probá de nuevo</button>
                </Estado>
            </main>
            <Pie />
        </>
    );
}
