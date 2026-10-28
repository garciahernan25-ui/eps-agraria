'use client';
// Pestañas Cultivos, Docentes e Inicio: listas ordenables con foto.
import { useState } from 'react';
import { PAGINAS_DEL_SITIO, srcDe } from '@/lib/compartido/paginas';
import type { Carpeta } from '@/lib/compartido/formatos';
import { api } from './api';
import { CampoFoto, useCampoFoto } from './CamposArchivo';
import { BotonAccion, Cargando, EncabezadoVista, EnlaceSitio, useAviso, useDatos } from './comun';
import { Campo, Modal } from './Modal';

type Fila = { id: number } & Record<string, string | number | null>;

interface DefCampo {
    nombre: string;
    etiqueta: string;
    requerido?: boolean;
    area?: boolean;
    max: number;
    ayuda?: string;
    lista?: string; // id de un <datalist> con sugerencias
}

interface Definicion {
    titulo: string;
    descripcion: string;
    nuevo: string;
    tituloNuevo: string;
    tituloEditar: string;
    foto: string;
    enlaceLista: string;
    nombre: (f: Fila) => string;
    detalle: (f: Fila) => string;
    enlace?: (f: Fila) => string;
    campos: DefCampo[];
}

export type ClaveColeccion = 'cultivos' | 'docentes' | 'inicio';

const COLECCIONES: Record<ClaveColeccion, Definicion> = {
    cultivos: {
        titulo: 'Cultivos',
        descripcion: 'Fichas de cultivos.html. El orden de la lista es el orden de la grilla.',
        nuevo: '+ Agregar cultivo',
        tituloNuevo: 'Nuevo cultivo',
        tituloEditar: 'Editar cultivo',
        foto: 'imagen',
        enlaceLista: 'cultivos.html',
        nombre: c => String(c.nombre),
        detalle: c => String(c.nombre_cientifico ?? ''),
        enlace: c => `cultivo.html?slug=${c.slug}`,
        campos: [
            { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, max: 100 },
            { nombre: 'nombre_vulgar', etiqueta: 'Nombre vulgar', max: 300 },
            { nombre: 'nombre_cientifico', etiqueta: 'Nombre científico', max: 200 },
            { nombre: 'origen', etiqueta: 'Origen', area: true, max: 1000 },
            { nombre: 'caracteristicas', etiqueta: 'Otras características', area: true, max: 3000 },
            { nombre: 'siembra', etiqueta: 'Siembra', area: true, max: 3000 },
            { nombre: 'cosecha', etiqueta: 'Cosecha', area: true, max: 3000 },
        ],
    },
    docentes: {
        titulo: 'Docentes',
        descripcion: 'Tarjetas de docentes.html. El texto de presentación se edita en la pestaña Páginas.',
        nuevo: '+ Agregar docente',
        tituloNuevo: 'Nuevo docente',
        tituloEditar: 'Editar docente',
        foto: 'foto',
        enlaceLista: 'docentes.html',
        nombre: d => String(d.nombre),
        detalle: d => String(d.descripcion ?? ''),
        campos: [
            { nombre: 'nombre', etiqueta: 'Nombre y apellido', requerido: true, max: 100 },
            { nombre: 'descripcion', etiqueta: 'Cargo o materia', max: 300, ayuda: 'Por ejemplo: "Profesora de Matemática".' },
        ],
    },
    inicio: {
        titulo: 'Inicio',
        descripcion: 'Tarjetas de la grilla de la página principal.',
        nuevo: '+ Agregar tarjeta',
        tituloNuevo: 'Nueva tarjeta',
        tituloEditar: 'Editar tarjeta',
        foto: 'imagen',
        enlaceLista: '/',
        nombre: t => String(t.titulo),
        detalle: t => `Lleva a: ${t.enlace}`,
        enlace: t => String(t.enlace),
        campos: [
            { nombre: 'titulo', etiqueta: 'Título', requerido: true, max: 100 },
            {
                nombre: 'enlace', etiqueta: 'Enlace', requerido: true, max: 300, lista: 'paginas-sitio',
                ayuda: 'Una página del sitio (elegila de la lista) o una dirección que empiece con https://',
            },
        ],
    },
};

function Formulario({ clave, fila, alTerminar }: { clave: ClaveColeccion; fila: Fila | null; alTerminar: (guardado: boolean) => void }) {
    const def = COLECCIONES[clave];
    const avisar = useAviso();
    const [error, setError] = useState('');
    const [progreso, setProgreso] = useState('');
    const foto = useCampoFoto((fila?.[def.foto] as string | null) ?? null, clave as Carpeta, setError);

    return (
        <Modal
            titulo={fila ? def.tituloEditar : def.tituloNuevo}
            error={error}
            onCerrar={(guardado) => { foto.cerrar(guardado); alTerminar(guardado); }}
            onGuardar={async (form) => {
                const datos: Record<string, string | null> = Object.fromEntries(
                    def.campos.map(c => [c.nombre, (form.elements.namedItem(c.nombre) as HTMLInputElement).value]));
                datos[def.foto] = await foto.valor(setProgreso);
                if (fila) await api(`/api/admin/${clave}/${fila.id}`, 'PUT', datos);
                else await api(`/api/admin/${clave}`, 'POST', datos);
                avisar('Cambios guardados.');
            }}>
            {def.campos.map(c => (
                <Campo key={c.nombre} nombre={c.nombre} etiqueta={c.etiqueta} valor={String(fila?.[c.nombre] ?? '')}
                       requerido={c.requerido} area={c.area} ayuda={c.ayuda} maxLength={c.max}
                       {...(c.lista ? { list: c.lista } : {})} {...(c.area ? { rows: 3 } : {})} />
            ))}
            <CampoFoto control={foto} />
            <p className="progreso">{progreso}</p>
            {clave === 'inicio' && <datalist id="paginas-sitio">{PAGINAS_DEL_SITIO.map(p => <option key={p} value={p} />)}</datalist>}
        </Modal>
    );
}

export function VistaColeccion({ clave }: { clave: ClaveColeccion }) {
    const def = COLECCIONES[clave];
    const { datos, error, recargar } = useDatos<Fila[]>(`/api/admin/${clave}`);
    const avisar = useAviso();
    const [editando, setEditando] = useState<Fila | 'nuevo' | null>(null);

    async function mover(i: number, paso: number) {
        const filas = [...datos!];
        [filas[i], filas[i + paso]] = [filas[i + paso], filas[i]];
        await api(`/api/admin/${clave}/orden`, 'POST', { ids: filas.map(f => f.id) });
        await recargar();
    }

    return (
        <>
            <EncabezadoVista titulo={def.titulo} descripcion={def.descripcion}>
                <EnlaceSitio href={def.enlaceLista} />
                <button type="button" className="btn btn-principal" onClick={() => setEditando('nuevo')}>{def.nuevo}</button>
            </EncabezadoVista>

            {!datos ? <Cargando error={error} recargar={recargar} /> : (
                <div className="lista">
                    {datos.length === 0 && <p className="panel-vacio">Todavía no hay nada cargado.</p>}
                    {datos.map((f, i) => (
                        <article className="item" key={f.id}>
                            {f[def.foto] ? <img className="item__foto" src={srcDe(String(f[def.foto]))} alt="" loading="lazy" /> : <div className="item__foto"></div>}
                            <div className="item__cuerpo">
                                <p className="item__titulo">{def.nombre(f)}</p>
                                <p className="item__meta">{def.detalle(f)}</p>
                                <div className="item__acciones">
                                    <BotonAccion className="btn btn-secundario btn-icono" aria-label="Subir" disabled={i === 0} accion={() => mover(i, -1)}>↑</BotonAccion>
                                    <BotonAccion className="btn btn-secundario btn-icono" aria-label="Bajar" disabled={i === datos.length - 1} accion={() => mover(i, 1)}>↓</BotonAccion>
                                    <button type="button" className="btn btn-secundario btn-chico" onClick={() => setEditando(f)}>Editar</button>
                                    <BotonAccion className="btn btn-peligro btn-chico" confirmar={`¿Borrar "${def.nombre(f)}"? No se puede deshacer.`}
                                                 accion={async () => {
                                                     await api(`/api/admin/${clave}/${f.id}`, 'DELETE');
                                                     avisar('Borrado.');
                                                     await recargar();
                                                 }}>Borrar</BotonAccion>
                                    {def.enlace && <EnlaceSitio href={def.enlace(f)} texto="Ver" />}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {editando && (
                <Formulario key={editando === 'nuevo' ? 'nuevo' : editando.id} clave={clave} fila={editando === 'nuevo' ? null : editando}
                            alTerminar={(guardado) => { setEditando(null); if (guardado) recargar(); }} />
            )}
        </>
    );
}
