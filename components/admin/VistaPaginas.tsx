'use client';
// Pestaña Páginas: lista de páginas de texto y editor visual (TinyMCE) con el CSS del sitio.
import { useEffect, useRef, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as EditorTiny } from 'tinymce';
import { URL_DE_PAGINA } from '@/lib/compartido/paginas';
import { formatearFecha } from '@/lib/compartido/fechas';
import type { Pagina } from '@/lib/compartido/tipos';
import { api } from './api';
import { subirArchivo } from './subir';
import { Cargando, EncabezadoVista, EnlaceSitio, useAviso, useDatos } from './comun';

const TINYMCE = 'https://cdn.jsdelivr.net/npm/tinymce@7.9.3/tinymce.min.js';
const TINYMCE_ES = 'https://cdn.jsdelivr.net/npm/tinymce-i18n@26.9.28/langs7/es.js';

// Para que el panel pregunte antes de salir si hay cambios sin guardar.
export const cambiosSinGuardar = { hay: false };

function EditorPagina({ slug, alVolver }: { slug: string; alVolver: () => void }) {
    const { datos, error, recargar } = useDatos<Pagina>(`/api/admin/paginas/${encodeURIComponent(slug)}`);
    const avisar = useAviso();
    const editor = useRef<EditorTiny | null>(null);
    const [titulo, setTitulo] = useState('');
    const [errorEditor, setErrorEditor] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => { if (datos) setTitulo(datos.titulo); }, [datos]);

    useEffect(() => {
        const avisarAlSalir = (e: BeforeUnloadEvent) => { if (editor.current?.isDirty()) e.preventDefault(); };
        window.addEventListener('beforeunload', avisarAlSalir);
        return () => {
            window.removeEventListener('beforeunload', avisarAlSalir);
            cambiosSinGuardar.hay = false;
        };
    }, []);

    async function guardar() {
        if (!editor.current) return;
        if (!titulo.trim()) { setErrorEditor('Falta el nombre de la página.'); return; }
        setErrorEditor('');
        setGuardando(true);
        try {
            const resultado = await api<{ contenido_html: string }>(`/api/admin/paginas/${encodeURIComponent(slug)}`, 'PUT', {
                titulo,
                contenido_html: editor.current.getContent(),
            });
            // Se muestra lo que realmente quedó guardado (ya sanitizado).
            editor.current.setContent(resultado.contenido_html);
            editor.current.setDirty(false);
            cambiosSinGuardar.hay = false;
            avisar('Página guardada. Ya se ve en el sitio.');
        } catch (err) {
            setErrorEditor((err as Error).message);
        } finally {
            setGuardando(false);
        }
    }

    function volver() {
        if (editor.current?.isDirty() && !confirm('Hay cambios sin guardar en la página. ¿Salir igual?')) return;
        alVolver();
    }

    if (!datos) return <Cargando error={error} recargar={recargar} />;

    return (
        <div className="editor-pagina">
            <div className="editor-pagina__barra">
                <button type="button" className="btn btn-secundario" onClick={volver}>← Volver</button>
                <span className="separador"></span>
                {URL_DE_PAGINA[slug] && <EnlaceSitio href={URL_DE_PAGINA[slug]} />}
                <button type="button" className="btn btn-principal" disabled={guardando} onClick={guardar}>Guardar</button>
            </div>
            <div className="campo">
                <label htmlFor="campo-tituloPagina">Nombre de la página (solo se ve en el panel) *</label>
                <input type="text" id="campo-tituloPagina" value={titulo} maxLength={200} onChange={e => setTitulo(e.target.value)} />
            </div>
            <p className="panel-ayuda">Para agregar una foto usá el botón de imagen de la barra (o arrastrala adentro del texto).
                Al guardar se quita cualquier código que no sea seguro.</p>
            <Editor
                tinymceScriptSrc={TINYMCE}
                licenseKey="gpl"
                initialValue={datos.contenido_html}
                onInit={(_evento, instancia) => { editor.current = instancia; }}
                onDirty={() => { cambiosSinGuardar.hay = true; }}
                init={{
                    promotion: false,
                    branding: false,
                    language: 'es',
                    language_url: TINYMCE_ES,
                    menubar: false,
                    plugins: 'lists link image table code autoresize',
                    toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | link image table | code',
                    block_formats: 'Párrafo=p; Título 1=h1; Título 2=h2; Título 3=h3',
                    // Se ve igual que en el sitio: mismo CSS y misma fuente.
                    content_css: ['https://fonts.googleapis.com/css2?family=Staatliches&display=swap', '/css/normalize.css', '/css/styles.css', '/css/estilos.css'],
                    body_class: 'contenedor',
                    content_style: 'body { padding: 1.5rem; }',
                    convert_urls: false,            // dejar "Img 2/foto.jpg" tal cual
                    min_height: 500,
                    autoresize_bottom_margin: 40,
                    link_default_target: '_blank',
                    image_caption: true,
                    image_dimensions: false,
                    automatic_uploads: true,
                    images_file_types: 'jpeg,jpg,png,webp,gif',
                    images_upload_handler: async (info, alProgreso) => {
                        const blob = info.blob();
                        const archivo = new File([blob], info.filename(), { type: blob.type });
                        const { url } = await subirArchivo(archivo, 'paginas', { soloFotos: true, alProgreso });
                        return url;
                    },
                }}
            />
            <p className="panel-error" role="alert">{errorEditor}</p>
        </div>
    );
}

export function VistaPaginas() {
    const { datos, error, recargar } = useDatos<Pagina[]>('/api/admin/paginas');
    const [editando, setEditando] = useState<string | null>(null);

    if (editando) return <EditorPagina slug={editando} alVolver={() => { setEditando(null); recargar(); }} />;

    return (
        <>
            <EncabezadoVista titulo="Páginas" descripcion="Textos y fotos de las páginas del sitio." />
            {!datos ? <Cargando error={error} recargar={recargar} /> : (
                <div className="lista">
                    {datos.length === 0 && <p className="panel-vacio">No hay páginas. Corré &quot;npm run importar&quot; para cargar las del sitio.</p>}
                    {datos.map(p => (
                        <article className="item" key={p.slug}>
                            <div className="item__cuerpo">
                                <p className="item__titulo">{p.titulo}</p>
                                <p className="item__meta">Última edición: {formatearFecha(p.actualizado_en, { conHora: true })}{p.autor ? ` por ${p.autor}` : ''}</p>
                                <div className="item__acciones">
                                    <button type="button" className="btn btn-principal btn-chico" onClick={() => setEditando(p.slug)}>Editar</button>
                                    {URL_DE_PAGINA[p.slug] && <EnlaceSitio href={URL_DE_PAGINA[p.slug]} texto="Ver" />}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </>
    );
}
