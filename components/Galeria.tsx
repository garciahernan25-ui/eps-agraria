'use client';
// Grilla de Instagram con vista ampliada (los videos se reproducen ahí y los carruseles se recorren).
import { useEffect, useRef, useState } from 'react';
import { formatearFecha } from '@/lib/compartido/fechas';
import type { MedioInstagram, PaginaDeInstagram, PostInstagram } from '@/lib/compartido/tipos';
import { INSTAGRAM } from './Sitio';

// Un carrusel muestra sus hijos; los demás, el propio posteo.
function mediosDe(post: PostInstagram): MedioInstagram[] {
    const lista = post.tipo === 'CAROUSEL_ALBUM' && post.hijos.length ? post.hijos : [post];
    return lista.filter(m => m.media_url || m.thumbnail_url);
}

const ICONOS: Partial<Record<PostInstagram['tipo'], string>> = { VIDEO: 'fa-play', CAROUSEL_ALBUM: 'fa-clone' };

export function Galeria({ inicial }: { inicial: PaginaDeInstagram }) {
    const [posts, setPosts] = useState(inicial.posts);
    const [pagina, setPagina] = useState(inicial.pagina);
    const [cargando, setCargando] = useState(false);
    const [abierto, setAbierto] = useState<{ post: PostInstagram; indice: number } | null>(null);
    const visor = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (abierto && !visor.current?.open) visor.current?.showModal();
    }, [abierto]);

    async function verMas() {
        setCargando(true);
        try {
            const respuesta = await fetch(`/api/instagram?pagina=${pagina + 1}`);
            if (!respuesta.ok) throw new Error();
            const datos: PaginaDeInstagram = await respuesta.json();
            setPosts(actuales => [...actuales, ...datos.posts]);
            setPagina(datos.pagina);
        } catch {
            alert('No se pudieron cargar más fotos. Probá de nuevo.');
        } finally {
            setCargando(false);
        }
    }

    const medios = abierto ? mediosDe(abierto.post) : [];
    const mover = (paso: number) => setAbierto(a => a && { ...a, indice: (a.indice + paso + medios.length) % medios.length });
    const medio = abierto ? medios[abierto.indice] : null;

    return (
        <>
            <div className="galeria">
                {posts.length === 0 && <p className="estado-carga">Todavía no hay fotos en la galería.</p>}
                {posts.map(post => {
                    const imagen = post.tipo === 'VIDEO' ? post.thumbnail_url : (post.media_url || post.thumbnail_url);
                    if (!imagen) return null;
                    const icono = ICONOS[post.tipo];
                    return (
                        <button type="button" className="galeria__item" key={post.id}
                                onClick={() => mediosDe(post).length && setAbierto({ post, indice: 0 })}>
                            <img src={imagen} alt={(post.caption || 'Posteo de Instagram').slice(0, 120)} loading="lazy" />
                            {icono && <span className="galeria__icono"><i className={`fas ${icono}`}></i></span>}
                        </button>
                    );
                })}
            </div>
            <div className="galeria__mas">
                {pagina < inicial.paginas && (
                    <button type="button" onClick={verMas} disabled={cargando}>{cargando ? 'Cargando…' : 'Ver más'}</button>
                )}
            </div>

            {/* Vista ampliada. Al cerrarse se desmonta el video y deja de sonar. */}
            <dialog className="visor" ref={visor} aria-label="Posteo de Instagram"
                    onClose={() => setAbierto(null)}
                    onClick={(e) => { if (e.target === e.currentTarget) visor.current?.close(); }}
                    onKeyDown={(e) => { if (e.key === 'ArrowLeft') mover(-1); if (e.key === 'ArrowRight') mover(1); }}>
                {abierto && medio && (
                    <>
                        <button type="button" className="visor__cerrar" aria-label="Cerrar" onClick={() => visor.current?.close()}>&times;</button>
                        <div className="visor__medio">
                            {medio.tipo === 'VIDEO' && medio.media_url
                                ? <video key={medio.media_url} src={medio.media_url} poster={medio.thumbnail_url ?? undefined}
                                         controls autoPlay preload="metadata" playsInline />
                                : <img src={(medio.media_url || medio.thumbnail_url)!} alt={(abierto.post.caption || '').slice(0, 120)} />}
                        </div>
                        {medios.length > 1 && (
                            <div className="visor__flechas">
                                <button type="button" aria-label="Anterior" onClick={() => mover(-1)}>&#8249;</button>
                                <span>{abierto.indice + 1} / {medios.length}</span>
                                <button type="button" aria-label="Siguiente" onClick={() => mover(1)}>&#8250;</button>
                            </div>
                        )}
                        <div className="visor__texto">
                            <p className="visor__fecha">{formatearFecha(abierto.post.timestamp)}</p>
                            <p className="visor__caption">{abierto.post.caption}</p>
                            <a className="visor__enlace" target="_blank" rel="noopener"
                               href={/^https:\/\//.test(abierto.post.permalink) ? abierto.post.permalink : INSTAGRAM}>
                                <i className="fab fa-instagram"></i> Ver en Instagram
                            </a>
                        </div>
                    </>
                )}
            </dialog>
        </>
    );
}
