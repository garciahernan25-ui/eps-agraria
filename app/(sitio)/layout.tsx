// Layout de todo el sitio (menos el test vocacional, que tiene su propio diseño).
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

// El contenido se edita desde el panel: cada visita lee la base (nada queda viejo en caché).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'E.P.S Agraria n°1 Alte. Brown',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function LayoutSitio({ children }: { children: ReactNode }) {
    return (
        <html lang="es">
            <head>
                <link rel="stylesheet" href="/css/normalize.css" />
                <link href="https://fonts.googleapis.com/css2?family=Staatliches&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="/css/styles.css" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
                      crossOrigin="anonymous" referrerPolicy="no-referrer" />
            </head>
            <body id="inicio">{children}</body>
        </html>
    );
}
