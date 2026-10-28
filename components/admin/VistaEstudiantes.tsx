'use client';
// Pestañas Experiencias (moderación) y Buzón (consultas confidenciales).
import { formatearFecha } from '@/lib/compartido/fechas';
import type { Consulta, Experiencia } from '@/lib/compartido/tipos';
import { api } from './api';
import { BotonAccion, Cargando, EncabezadoVista, useDatos } from './comun';

export function VistaExperiencias() {
    const { datos, error, recargar } = useDatos<Experiencia[]>('/api/admin/experiencias');
    const cambiar = async (id: number, estado: Experiencia['estado']) => {
        await api(`/api/admin/experiencias/${id}`, 'PATCH', { estado });
        await recargar();
    };

    return (
        <>
            <EncabezadoVista titulo="Experiencias de estudiantes" descripcion="Se publican en estudiantes.html solo después de aprobarlas." />
            {!datos ? <Cargando error={error} recargar={recargar} /> : (
                <div className="lista">
                    {datos.length === 0 && <p className="panel-vacio">No hay experiencias todavía.</p>}
                    {datos.map(exp => (
                        <article key={exp.id} className={`item item--${exp.estado}`}>
                            <div className="item__cuerpo">
                                <p className="item__meta">{exp.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Publicada'} ·{' '}
                                    <strong>{exp.nombre || 'Anónimo'}</strong> · {formatearFecha(exp.creado_en, { conHora: true })}</p>
                                <p className="item__texto">{exp.texto}</p>
                                {exp.foto_url && <img className="item__foto-grande" src={exp.foto_url} alt="Foto enviada" />}
                                <div className="item__acciones">
                                    {exp.estado === 'pendiente'
                                        ? <BotonAccion className="btn btn-principal btn-chico" accion={() => cambiar(exp.id, 'aprobada')}>Aprobar y publicar</BotonAccion>
                                        : <BotonAccion accion={() => cambiar(exp.id, 'pendiente')}>Ocultar</BotonAccion>}
                                    <BotonAccion className="btn btn-peligro btn-chico" confirmar="¿Borrar esta experiencia para siempre?"
                                                 accion={async () => { await api(`/api/admin/experiencias/${exp.id}`, 'DELETE'); await recargar(); }}>
                                        Borrar
                                    </BotonAccion>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </>
    );
}

export function VistaBuzon() {
    const { datos, error, recargar } = useDatos<Consulta[]>('/api/admin/consultas');
    return (
        <>
            <EncabezadoVista titulo="Buzón confidencial" descripcion="Solo lo leen los docentes desde este panel." />
            {!datos ? <Cargando error={error} recargar={recargar} /> : (
                <div className="lista">
                    {datos.length === 0 && <p className="panel-vacio">El buzón está vacío.</p>}
                    {datos.map(c => (
                        <article key={c.id} className={`item${c.leida ? '' : ' item--no-leida'}`}>
                            <div className="item__cuerpo">
                                <p className="item__meta">{c.leida ? 'Leída' : '📩 Nueva'} ·{' '}
                                    <strong>{c.nombre || 'Anónimo'}</strong> · {formatearFecha(c.creado_en, { conHora: true })}</p>
                                <p className="item__texto">{c.texto}</p>
                                <div className="item__acciones">
                                    <BotonAccion accion={async () => { await api(`/api/admin/consultas/${c.id}`, 'PATCH', { leida: !c.leida }); await recargar(); }}>
                                        Marcar como {c.leida ? 'no leída' : 'leída'}
                                    </BotonAccion>
                                    <BotonAccion className="btn btn-peligro btn-chico" confirmar="¿Borrar esta consulta para siempre?"
                                                 accion={async () => { await api(`/api/admin/consultas/${c.id}`, 'DELETE'); await recargar(); }}>
                                        Borrar
                                    </BotonAccion>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </>
    );
}
