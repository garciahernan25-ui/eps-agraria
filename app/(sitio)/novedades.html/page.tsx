// Novedades: todas las publicaciones, de la más nueva a la más vieja.
import type { Metadata } from 'next';
import { Sitio } from '@/components/Sitio';
import { Publicaciones } from '@/components/Publicaciones';
import { numeroDePagina } from '@/lib/util';

export const metadata: Metadata = { title: 'Novedades - E.P.S Agraria n°1 Alte. Brown' };

export default async function Novedades({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
    const { pagina } = await searchParams;
    return (
        <Sitio menuActivo="novedades.html">
            <h1>Novedades</h1>
            <Publicaciones seccion={null} pagina={numeroDePagina(pagina)} />
        </Sitio>
    );
}
