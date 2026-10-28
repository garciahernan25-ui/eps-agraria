// Ficha de un cultivo: /cultivo.html?slug=acelga
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Sitio } from '@/components/Sitio';
import { cultivoPorSlug } from '@/lib/datos';
import { srcDe } from '@/lib/compartido/paginas';

type Props = { searchParams: Promise<{ slug?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const { slug } = await searchParams;
    const cultivo = slug ? await cultivoPorSlug(slug) : undefined;
    return { title: cultivo ? `${cultivo.nombre} - E.P.S Agraria n°1 Alte. Brown` : 'E.P.S Agraria n°1 Alte. Brown' };
}

// Los textos son planos; los saltos de línea se respetan con CSS.
const t = (valor: string) => valor || '—';

export default async function FichaDeCultivo({ searchParams }: Props) {
    const { slug } = await searchParams;
    if (!slug) redirect('/cultivos.html');
    const c = await cultivoPorSlug(slug);
    if (!c) notFound();

    return (
        <Sitio menuActivo="cultivos.html">
            <div className="cultivo-ficha">
                <header className="cultivo-header">
                    <h1>{c.nombre}</h1>
                </header>
                {c.imagen && (
                    <section className="cultivo-imagen">
                        <img src={srcDe(c.imagen)} alt={`Foto del cultivo de ${c.nombre}`} />
                    </section>
                )}
                <div className="cultivo-contenido">
                    <article className="info-general">
                        <h2>🌱 Información General</h2>
                        <ul>
                            <li><strong>Nombre Vulgar:</strong> {t(c.nombre_vulgar)}</li>
                            <li><strong>Nombre Científico:</strong> <em>{t(c.nombre_cientifico)}</em></li>
                            <li><strong>Origen:</strong> {t(c.origen)}</li>
                            <li><strong>Otras Características:</strong> {t(c.caracteristicas)}</li>
                        </ul>
                    </article>
                    <article className="info-fechas">
                        <h2>🗓️ Ciclo de Cultivo</h2>
                        <p><strong>Siembra:</strong> {t(c.siembra)}</p>
                        <p><strong>Cosecha:</strong> {t(c.cosecha)}</p>
                    </article>
                </div>
            </div>
        </Sitio>
    );
}
