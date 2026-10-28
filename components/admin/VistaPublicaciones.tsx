'use client';
// Pestaña Publicaciones: lista, crear, editar (con fotos y videos) y borrar.
import { useState } from 'react';
import { SECCIONES, buscarSeccion } from '@/lib/compartido/secciones';
import { formatearFecha } from '@/lib/compartido/fechas';
import type { Publicacion } from '@/lib/compartido/tipos';
import { api } from './api';
import { CampoMedios, useMedios } from './CamposArchivo';
import { BotonAccion, Cargando, EncabezadoVista, EnlaceSitio, useAviso, useDatos } from './comun';
import { Campo, Modal } from './Modal';

function FormularioPublicacion({ p, alTerminar }: { p: Publicacion | null; alTerminar: (guardado: boolean) => void }) {
    const avisar = useAviso();
    const [error, setError] = useState('');
    const [progreso, setProgreso] = useState('');
    const medios = useMedios(p?.medios ?? [], setError);

    return (
        <Modal
            titulo={p ? 'Editar publicación' : 'Nueva publicación'}
            textoGuardar={p ? 'Guardar cambios' : 'Publicar'}
            error={error}
            onCerrar={(guardado) => { medios.cerrar(guardado); alTerminar(guardado); }}
            onGuardar={async (form) => {
                const campo = (n: string) => form.elements.namedItem(n) as HTMLInputElement;
                const datos = {
                    titulo: campo('titulo').value,
                    seccion: campo('seccion').value,
                    texto: campo('texto').value,
                    publicada: campo('publicada').checked,
                    medios: await medios.valor(setProgreso),
                };
                if (p) await api(`/api/admin/publicaciones/${p.id}`, 'PUT', datos);
                else await api('/api/admin/publicaciones', 'POST', datos);
                avisar(p ? 'Publicación actualizada.' : '¡Publicación creada!');
            }}>
            <Campo nombre="titulo" etiqueta="Título" valor={p?.titulo} requerido maxLength={200} />
            <div className="campo">
                <label htmlFor="campo-seccion">Sección *</label>
                <select id="campo-seccion" name="seccion" required defaultValue={p?.seccion ?? ''}>
                    <option value="">Elegí una sección…</option>
                    {SECCIONES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
            </div>
            <Campo nombre="texto" etiqueta="Texto" valor={p?.texto} area maxLength={10000} rows={6} />
            <CampoMedios control={medios} />
            <label className="campo-check">
                <input type="checkbox" name="publicada" defaultChecked={!p || Boolean(p.publicada)} /> Publicada (si la destildás, queda como borrador)
            </label>
            <p className="progreso">{progreso}</p>
        </Modal>
    );
}

export function VistaPublicaciones() {
    const { datos, error, recargar } = useDatos<Publicacion[]>('/api/admin/publicaciones');
    const avisar = useAviso();
    const [editando, setEditando] = useState<Publicacion | 'nueva' | null>(null);

    return (
        <>
            <EncabezadoVista titulo="Publicaciones" descripcion="Aparecen en Novedades y en la página de su sección, de la más nueva a la más vieja.">
                <EnlaceSitio href="novedades.html" texto="Ver Novedades" />
                <button type="button" className="btn btn-principal" onClick={() => setEditando('nueva')}>+ Nueva publicación</button>
            </EncabezadoVista>

            {!datos ? <Cargando error={error} recargar={recargar} /> : (
                <div className="lista">
                    {datos.length === 0 && <p className="panel-vacio">Todavía no hay publicaciones. ¡Creá la primera!</p>}
                    {datos.map(p => (
                        <article key={p.id} className={`item${p.publicada ? '' : ' item--borrador'}`}>
                            <div className="item__cuerpo">
                                <p className="item__titulo">{p.titulo}</p>
                                <p className="item__meta">
                                    <span className="etiqueta">{buscarSeccion(p.seccion)?.nombre ?? p.seccion}</span>
                                    {!p.publicada && <span className="etiqueta">Borrador (no se ve en el sitio)</span>}
                                    {formatearFecha(p.creado_en, { conHora: true })}{p.autor ? ` · editada por ${p.autor}` : ''}
                                </p>
                                {p.texto && <p className="item__texto">{p.texto.length > 300 ? p.texto.slice(0, 300) + '…' : p.texto}</p>}
                                {p.medios.length > 0 && (
                                    <div className="item__miniaturas">
                                        {p.medios.slice(0, 8).map((m, i) => m.tipo === 'video'
                                            ? <video key={i} src={m.url} preload="metadata" muted playsInline />
                                            : <img key={i} src={m.url} alt="" loading="lazy" />)}
                                        {p.medios.length > 8 && <span className="item__meta">+{p.medios.length - 8} más</span>}
                                    </div>
                                )}
                                <div className="item__acciones">
                                    <button type="button" className="btn btn-secundario btn-chico" onClick={() => setEditando(p)}>Editar</button>
                                    <BotonAccion className="btn btn-peligro btn-chico"
                                                 confirmar="¿Borrar esta publicación con todas sus fotos y videos? No se puede deshacer."
                                                 accion={async () => {
                                                     await api(`/api/admin/publicaciones/${p.id}`, 'DELETE');
                                                     avisar('Publicación borrada.');
                                                     await recargar();
                                                 }}>Borrar</BotonAccion>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {editando && (
                <FormularioPublicacion
                    key={editando === 'nueva' ? 'nueva' : editando.id}
                    p={editando === 'nueva' ? null : editando}
                    alTerminar={(guardado) => { setEditando(null); if (guardado) recargar(); }} />
            )}
        </>
    );
}
