// Páginas de texto editables (nosotros.html, cea 34.html, ...). Atrapa cualquier otra URL:
// si no es una de lib/compartido/paginas.ts, muestra "página no encontrada".
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sitio } from '@/components/Sitio';
import { Publicaciones } from '@/components/Publicaciones';
import { paginaPorSlug } from '@/lib/datos';
import { paginaPorRuta } from '@/lib/compartido/paginas';
import { numeroDePagina } from '@/lib/util';

type Props = {
    params: Promise<{ ruta: string[] }>;
    searchParams: Promise<{ pagina?: string }>;
};

async function configuracion(params: Props['params']) {
    const { ruta } = await params;
    if (ruta.length !== 1) return undefined;
    let nombre = ruta[0];
    try { nombre = decodeURIComponent(nombre); } catch { /* ya venía decodificado */ }
    return paginaPorRuta(nombre);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const pagina = await configuracion(params);
    return { title: pagina ? `${pagina.titulo} - E.P.S Agraria n°1 Alte. Brown` : 'Página no encontrada' };
}

export default async function PaginaDeTexto({ params, searchParams }: Props) {
    const config = await configuracion(params);
    if (!config) notFound();
    const [pagina, { pagina: numero }] = await Promise.all([paginaPorSlug(config.slug), searchParams]);

    return (
        <Sitio menuActivo={config.menuActivo} cssExtra={config.cssExtra}>
            {/* HTML sanitizado en el servidor al guardarlo (lib/sanitizar.ts) */}
            {pagina?.contenido_html
                ? <div dangerouslySetInnerHTML={{ __html: pagina.contenido_html }} />
                : <p className="estado-carga">Esta página todavía no tiene contenido.</p>}
            {config.seccion && <Publicaciones seccion={config.seccion} pagina={numeroDePagina(numero)} />}
        </Sitio>
    );
}
