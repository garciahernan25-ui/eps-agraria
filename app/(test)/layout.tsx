// Layout propio del test vocacional: tiene su diseño y no usa styles.css.
// Pasar de una página del sitio a esta (o al revés) recarga la página completa.
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Test Vocacional — E.P.S Agraria n°1 Alte. Brown',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function LayoutTest({ children }: { children: ReactNode }) {
    return (
        <html lang="es">
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Staatliches&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" referrerPolicy="no-referrer" />
                <link rel="stylesheet" href="/css/test-vocacional.css" />
            </head>
            <body id="inicio">{children}</body>
        </html>
    );
}
