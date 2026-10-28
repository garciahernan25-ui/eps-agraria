// Galería de Instagram (@epsagraria). La primera página viene del servidor; "Ver más" pide las siguientes.
import type { Metadata } from 'next';
import { Sitio, INSTAGRAM } from '@/components/Sitio';
import { Galeria } from '@/components/Galeria';
import { postsDeInstagram } from '@/lib/datos';

export const metadata: Metadata = { title: 'Galería - E.P.S Agraria n°1 Alte. Brown' };

export default async function PaginaGaleria() {
    const inicial = await postsDeInstagram(1);
    return (
        <Sitio menuActivo="galeria.html">
            <h1>Galería</h1>
            <p className="galeria__intro">
                Las fotos y videos de nuestro Instagram{' '}
                <a href={INSTAGRAM} target="_blank" rel="noopener">@epsagraria</a>.
            </p>
            <Galeria inicial={inicial} />
        </Sitio>
    );
}
