// Docentes: la presentación se edita en Páginas ("Docentes") y las tarjetas en la pestaña Docentes.
import { Sitio } from '@/components/Sitio';
import { listaDeDocentes, paginaPorSlug } from '@/lib/datos';
import { srcDe } from '@/lib/compartido/paginas';

export default async function Docentes() {
    const [presentacion, docentes] = await Promise.all([paginaPorSlug('docentes'), listaDeDocentes()]);
    return (
        <Sitio>
            <div className="biopreparados">
                <section className="equipo-docente">
                    {/* HTML sanitizado en el servidor al guardarlo (lib/sanitizar.ts) */}
                    <div className="introduccion-equipo" dangerouslySetInnerHTML={{ __html: presentacion?.contenido_html ?? '' }} />
                    <div className="lista-profesores">
                        {docentes.map(d => (
                            <div className="profesor-card" key={d.id}>
                                <img src={srcDe(d.foto || 'Img 2/profeee.jpg')} alt={`Foto de ${d.nombre}`} className="profesor-foto" loading="lazy" />
                                <h3>{d.nombre}</h3>
                                <p className="profesor-cargo">{d.descripcion}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </Sitio>
    );
}
