// Lista de publicaciones (se arma en el servidor). La paginación usa ?pagina=N.
import { publicacionesPublicas } from '@/lib/datos';
import { buscarSeccion } from '@/lib/compartido/secciones';
import { hrefDe } from '@/lib/compartido/paginas';
import { formatearFecha } from '@/lib/compartido/fechas';
import type { Medio, Publicacion } from '@/lib/compartido/tipos';
import { Estado } from './Sitio';

export function VistaMedio({ medio, alt }: { medio: Medio; alt: string }) {
    return medio.tipo === 'video'
        ? <video src={medio.url} controls preload="metadata" playsInline />
        : <img src={medio.url} alt={alt} loading="lazy" />;
}

function TarjetaPublicacion({ p, mostrarSeccion }: { p: Publicacion; mostrarSeccion: boolean }) {
    const seccion = mostrarSeccion ? buscarSeccion(p.seccion) : undefined;
    return (
        <article className="publicacion">
            <header className="publicacion__encabezado">
                {seccion && (seccion.pagina
                    ? <a className="publicacion__seccion" href={hrefDe(seccion.pagina)}>{seccion.nombre}</a>
                    : <span className="publicacion__seccion">{seccion.nombre}</span>)}
                <h3 className="publicacion__titulo">{p.titulo}</h3>
                <p className="publicacion__meta">{formatearFecha(p.creado_en)}{p.autor ? ` · ${p.autor}` : ''}</p>
            </header>
            {p.texto && <p className="publicacion__texto">{p.texto}</p>}
            {p.medios.length > 0 && (
                <div className={`publicacion__medios${p.medios.length === 1 ? ' publicacion__medios--uno' : ''}`}>
                    {p.medios.map((m, i) => <VistaMedio key={m.id ?? i} medio={m} alt={p.titulo} />)}
                </div>
            )}
        </article>
    );
}

// seccion = null → todas (Novedades), con la etiqueta de la sección en cada una.
// En una página de sección, si no hay publicaciones el bloque no se muestra.
export async function Publicaciones({ seccion, pagina }: { seccion: string | null; pagina: number }) {
    const todas = seccion === null;
    let datos;
    try {
        datos = await publicacionesPublicas(seccion, pagina);
    } catch (err) {
        console.error(err);
        return <section className="publicaciones"><Estado error>No se pudieron cargar las publicaciones. Recargá la página.</Estado></section>;
    }

    if (!datos.total) {
        return todas ? <section className="publicaciones"><Estado>Todavía no hay novedades publicadas.</Estado></section> : null;
    }

    return (
        <section className="publicaciones" id="publicaciones">
            {!todas && <h2>Publicaciones</h2>}
            {datos.publicaciones.map(p => <TarjetaPublicacion key={p.id} p={p} mostrarSeccion={todas} />)}
            {datos.paginas > 1 && (
                <nav className="paginacion" aria-label="Páginas">
                    {datos.pagina > 1
                        ? <a className="paginacion__boton" href={`?pagina=${datos.pagina - 1}#publicaciones`}>« Más nuevas</a>
                        : <span className="paginacion__boton paginacion__boton--off">« Más nuevas</span>}
                    <span>Página {datos.pagina} de {datos.paginas}</span>
                    {datos.pagina < datos.paginas
                        ? <a className="paginacion__boton" href={`?pagina=${datos.pagina + 1}#publicaciones`}>Más viejas »</a>
                        : <span className="paginacion__boton paginacion__boton--off">Más viejas »</span>}
                </nav>
            )}
        </section>
    );
}
