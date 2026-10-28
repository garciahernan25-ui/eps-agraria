// Panel docente (admin.html). Cada pestaña tiene una función que la dibuja en #vista.
// Todo texto que viene de la base se escapa con e() antes de ponerlo en el HTML.
import { escaparHTML as e, formatearFecha, pedirJSON } from './comun.js';
import { subirArchivo, validarArchivo, descartarArchivo, ACEPTA_FOTOS, ACEPTA_MEDIOS } from './subir.js';

const TINYMCE = 'https://cdn.jsdelivr.net/npm/tinymce@7.9.3/tinymce.min.js';
const TINYMCE_ES = 'https://cdn.jsdelivr.net/npm/tinymce-i18n@26.9.28/langs7/es.js';

// Páginas editables: slug → archivo público (para el botón "Ver en el sitio").
const PAGINAS_PUBLICAS = {
    'nosotros': 'nosotros.html',
    'agraria': 'agraria.html',
    'cea-34': 'cea 34.html',
    'cursos': 'cursos.html',
    'biopreparados': 'biopreparados.html',
    'huerta': 'paso apaso huerta.html',
    'siembra-y-cosecha': 'siembra y cosecha.html',
    'salidas-educativas': 'excursiones.html',
    'una-obra-para-recordar': 'una obra para recordar.html',
    'antologia-literaria': 'antologia literaria.html',
    'otras-actividades': 'otras actividades.html',
    'docentes': 'docentes.html',
};

// Páginas del sitio que se ofrecen como enlace en las tarjetas de inicio.
const PAGINAS_SITIO = [
    'siembra y cosecha.html', 'paso apaso huerta.html', 'una obra para recordar.html', 'antologia literaria.html',
    'test vocacional.html', 'cursos.html', 'cea 34.html', 'agraria.html', 'estudiantes.html', 'docentes.html',
    'juegos.html', 'excursiones.html', 'otras actividades.html', 'cultivos.html', 'biopreparados.html',
    'nosotros.html', 'novedades.html', 'galeria.html',
];

let usuario = null;
let pestaña = null;
let secciones = [];
let editorAbierto = null; // { slug, editor } mientras se edita una página

const vista = document.getElementById('vista');
const aviso = document.getElementById('aviso');

// ---------- Ayudas generales ----------

async function api(url, opciones) {
    try {
        return await pedirJSON(url, opciones);
    } catch (err) {
        if (err.status === 401 && !url.endsWith('/login')) {
            mostrarLogin();
            throw new Error('La sesión venció. Volvé a ingresar.');
        }
        throw err;
    }
}

const enviar = (url, method, datos) => api(url, { method, body: JSON.stringify(datos ?? {}) });

let temporizadorAviso;
function avisar(mensaje, { error = false } = {}) {
    clearTimeout(temporizadorAviso);
    aviso.textContent = mensaje;
    aviso.className = `panel-aviso${error ? ' panel-aviso--error' : ''}`;
    aviso.hidden = false;
    if (!error) temporizadorAviso = setTimeout(() => { aviso.hidden = true; }, 6000);
}

const fecha = (valor) => valor ? formatearFecha(valor, { conHora: true }) : '—';

function encabezado(titulo, descripcion, botones = '') {
    return `
        <div class="vista-encabezado">
            <div><h2>${titulo}</h2>${descripcion ? `<p>${descripcion}</p>` : ''}</div>
            <div class="item__acciones">${botones}</div>
        </div>`;
}

function enlaceSitio(href, texto = 'Ver en el sitio') {
    return `<a class="btn btn-secundario btn-chico" href="${e(encodeURI(href))}" target="_blank" rel="noopener">${texto} ↗</a>`;
}

function cargarScript(src) {
    return new Promise((resolver, rechazar) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolver();
        const script = Object.assign(document.createElement('script'), { src, onload: resolver });
        script.onerror = () => rechazar(new Error('No se pudo cargar el editor. Revisá tu conexión.'));
        document.head.append(script);
    });
}

// ---------- Ventana de formularios (modal) ----------

const modal = document.getElementById('modal');
const modalForm = document.getElementById('modalForm');
const modalError = document.getElementById('modalError');
const modalGuardar = document.getElementById('modalGuardar');
let modalActual = null; // { alGuardar, alCerrar, guardado }

// alGuardar(form) puede lanzar un Error: se muestra en el modal y no se cierra.
function abrirModal({ titulo, cuerpo, textoGuardar = 'Guardar', alAbrir, alGuardar, alCerrar }) {
    document.getElementById('modalTitulo').textContent = titulo;
    document.getElementById('modalCuerpo').innerHTML = cuerpo;
    modalError.textContent = '';
    modalGuardar.textContent = textoGuardar;
    modalGuardar.disabled = false;
    modalActual = { alGuardar, alCerrar, guardado: false };
    alAbrir?.(document.getElementById('modalCuerpo'));
    modal.showModal();
}

modalForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!modalForm.reportValidity()) return;
    modalError.textContent = '';
    modalGuardar.disabled = true;
    try {
        await modalActual.alGuardar(modalForm);
        modalActual.guardado = true;
        modal.close();
    } catch (err) {
        modalError.textContent = err.message;
    } finally {
        modalGuardar.disabled = false;
    }
});

modal.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-cerrar]')) modal.close();
});
modal.addEventListener('close', () => {
    modalActual?.alCerrar?.(modalActual.guardado);
    modalActual = null;
    document.getElementById('modalCuerpo').innerHTML = '';
});

function campo(nombre, etiqueta, valor = '', { requerido = false, area = false, tipo = 'text', ayuda = '', extra = '' } = {}) {
    const id = `campo-${nombre}`;
    const control = area
        ? `<textarea id="${id}" name="${nombre}" ${requerido ? 'required' : ''} ${extra}>${e(valor)}</textarea>`
        : `<input type="${tipo}" id="${id}" name="${nombre}" value="${e(valor)}" ${requerido ? 'required' : ''} ${extra}>`;
    return `<div class="campo"><label for="${id}">${etiqueta}${requerido ? ' *' : ''}</label>${control}${ayuda ? `<small>${ayuda}</small>` : ''}</div>`;
}

const progreso = (cuerpo, texto) => { cuerpo.querySelector('[data-progreso]').textContent = texto; };

// ---------- Campo de una foto (con vista previa antes de guardar) ----------

function htmlCampoFoto(etiqueta, url) {
    return `
        <div class="campo">
            <span>${etiqueta}</span>
            <div class="foto-campo" data-foto-campo>
                ${url ? `<img src="${e(url)}" alt="Foto actual">` : '<div class="foto-vacia">Sin foto</div>'}
                <div class="foto-campo__botones">
                    <label class="btn btn-secundario selector-archivo">${url ? 'Cambiar foto' : 'Elegir foto'}
                        <input type="file" accept="${ACEPTA_FOTOS}" data-foto-archivo>
                    </label>
                    <button type="button" class="btn btn-secundario btn-chico" data-foto-quitar ${url ? '' : 'hidden'}>Quitar foto</button>
                </div>
            </div>
            <small>JPG, PNG, WEBP o GIF, hasta 10 MB. La foto se sube al tocar "Guardar".</small>
        </div>`;
}

// Maneja el campo de foto. valor() sube la foto nueva (si hay) y devuelve la URL final.
function controlFoto(cuerpo, urlActual, carpeta) {
    const caja = cuerpo.querySelector('[data-foto-campo]');
    const entrada = caja.querySelector('[data-foto-archivo]');
    const quitar = caja.querySelector('[data-foto-quitar]');
    let archivo = null;
    let url = urlActual || null;
    let previa = null;
    let subida = null; // URL subida en esta edición y todavía no guardada

    function mostrar(src) {
        const nuevo = src
            ? Object.assign(document.createElement('img'), { src, alt: 'Vista previa' })
            : Object.assign(document.createElement('div'), { className: 'foto-vacia', textContent: 'Sin foto' });
        caja.firstElementChild.replaceWith(nuevo);
        quitar.hidden = !src;
    }

    entrada.addEventListener('change', async () => {
        const elegido = entrada.files[0];
        if (!elegido) return;
        try {
            await validarArchivo(elegido, { soloFotos: true });
        } catch (err) {
            modalError.textContent = err.message;
            entrada.value = '';
            return;
        }
        modalError.textContent = '';
        if (previa) URL.revokeObjectURL(previa);
        archivo = elegido;
        previa = URL.createObjectURL(elegido);
        mostrar(previa);
    });

    quitar.addEventListener('click', () => {
        archivo = null;
        url = null;
        entrada.value = '';
        mostrar(null);
    });

    return {
        async valor() {
            if (!archivo) return url;
            const resultado = await subirArchivo(archivo, carpeta, {
                soloFotos: true,
                alProgreso: p => progreso(cuerpo, `Subiendo foto: ${Math.round(p)}%`),
            });
            archivo = null;
            url = subida = resultado.url; // si falla el guardado, no se vuelve a subir
            return url;
        },
        // Al cerrar: si se subió una foto y no se guardó, se borra.
        cerrar(guardado) {
            if (previa) URL.revokeObjectURL(previa);
            if (subida && !guardado) descartarArchivo(subida);
        },
    };
}

// ---------- Fotos y videos de una publicación ----------

function controlMedios(cuerpo, mediosActuales) {
    const lista = cuerpo.querySelector('[data-medios]');
    const entrada = cuerpo.querySelector('[data-medios-archivo]');
    // Cada item: { url, tipo } (ya subido) o { archivo, tipo, previa } (nuevo)
    let items = mediosActuales.map(({ url, tipo }) => ({ url, tipo }));
    const subidas = []; // URLs subidas en esta edición

    function dibujar() {
        lista.innerHTML = items.length ? items.map((m, i) => {
            const src = e(m.archivo ? m.previa : m.url);
            const medio = m.tipo === 'video'
                ? `<video src="${src}" controls preload="metadata" playsinline muted></video>`
                : `<img src="${src}" alt="">`;
            const info = m.archivo
                ? `<span class="medio__nuevo">Nuevo</span> · ${e(m.archivo.name)}`
                : (m.tipo === 'video' ? 'Video' : 'Foto');
            return `
                <div class="medio">
                    ${medio}
                    <div class="medio__info">${info}</div>
                    <div class="medio__acciones">
                        <button type="button" class="btn btn-secundario btn-icono" data-mover="-1" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Mover antes">←</button>
                        <button type="button" class="btn btn-peligro btn-chico" data-quitar="${i}">Quitar</button>
                        <button type="button" class="btn btn-secundario btn-icono" data-mover="1" data-i="${i}" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Mover después">→</button>
                    </div>
                </div>`;
        }).join('') : '<p class="panel-ayuda">Todavía no agregaste fotos ni videos.</p>';
    }

    entrada.addEventListener('change', async () => {
        const errores = [];
        for (const archivo of entrada.files) {
            try {
                const tipo = await validarArchivo(archivo);
                items.push({ archivo, tipo, previa: URL.createObjectURL(archivo) });
            } catch (err) {
                errores.push(err.message);
            }
        }
        modalError.textContent = errores.join(' ');
        entrada.value = '';
        dibujar();
    });

    lista.addEventListener('click', (ev) => {
        const mover = ev.target.closest('[data-mover]');
        const quitar = ev.target.closest('[data-quitar]');
        if (mover) {
            const i = Number(mover.dataset.i);
            const j = i + Number(mover.dataset.mover);
            [items[i], items[j]] = [items[j], items[i]];
        } else if (quitar) {
            const [quitado] = items.splice(Number(quitar.dataset.quitar), 1);
            if (quitado.previa) URL.revokeObjectURL(quitado.previa);
        } else {
            return;
        }
        dibujar();
    });

    dibujar();

    return {
        // Sube los archivos nuevos (uno por uno, mostrando el avance) y devuelve la lista final.
        async valor() {
            const nuevos = items.filter(m => m.archivo);
            let n = 0;
            for (const m of nuevos) {
                n++;
                const { url } = await subirArchivo(m.archivo, 'publicaciones', {
                    alProgreso: p => progreso(cuerpo, `Subiendo ${n} de ${nuevos.length}: ${Math.round(p)}%`),
                });
                URL.revokeObjectURL(m.previa);
                Object.assign(m, { url, archivo: null, previa: null });
                subidas.push(url);
            }
            progreso(cuerpo, '');
            return items.map(({ url, tipo }) => ({ url, tipo }));
        },
        cerrar(guardado) {
            items.forEach(m => m.previa && URL.revokeObjectURL(m.previa));
            if (!guardado) subidas.forEach(descartarArchivo);
        },
    };
}

// ---------- Pestaña: Publicaciones ----------

const nombreSeccion = (id) => secciones.find(s => s.id === id)?.nombre ?? id;

async function vistaPublicaciones() {
    const publicaciones = await api('/api/admin/publicaciones');
    vista.innerHTML = encabezado('Publicaciones',
        'Aparecen en Novedades y en la página de su sección, de la más nueva a la más vieja.',
        `${enlaceSitio('novedades.html', 'Ver Novedades')}<button type="button" class="btn btn-principal" data-accion="nueva-publicacion">+ Nueva publicación</button>`)
        + `<div class="lista">${publicaciones.length ? publicaciones.map(p => `
            <article class="item ${p.publicada ? '' : 'item--borrador'}">
                <div class="item__cuerpo">
                    <p class="item__titulo">${e(p.titulo)}</p>
                    <p class="item__meta">
                        <span class="etiqueta">${e(nombreSeccion(p.seccion))}</span>
                        ${p.publicada ? '' : '<span class="etiqueta">Borrador (no se ve en el sitio)</span>'}
                        ${fecha(p.creado_en)}${p.autor ? ` · editada por ${e(p.autor)}` : ''}
                    </p>
                    ${p.texto ? `<p class="item__texto">${e(p.texto.length > 300 ? p.texto.slice(0, 300) + '…' : p.texto)}</p>` : ''}
                    ${p.medios.length ? `<div class="item__miniaturas">${p.medios.slice(0, 8).map(m => m.tipo === 'video'
                        ? `<video src="${e(m.url)}" preload="metadata" muted playsinline></video>`
                        : `<img src="${e(m.url)}" alt="" loading="lazy">`).join('')}
                        ${p.medios.length > 8 ? `<span class="item__meta">+${p.medios.length - 8} más</span>` : ''}</div>` : ''}
                    <div class="item__acciones">
                        <button type="button" class="btn btn-secundario btn-chico" data-accion="editar-publicacion" data-id="${p.id}">Editar</button>
                        <button type="button" class="btn btn-peligro btn-chico" data-accion="borrar-publicacion" data-id="${p.id}">Borrar</button>
                    </div>
                </div>
            </article>`).join('') : '<p class="panel-vacio">Todavía no hay publicaciones. ¡Creá la primera!</p>'}</div>`;
    return publicaciones;
}

function formularioPublicacion(p = null) {
    let medios;
    abrirModal({
        titulo: p ? 'Editar publicación' : 'Nueva publicación',
        textoGuardar: p ? 'Guardar cambios' : 'Publicar',
        cuerpo: `
            ${campo('titulo', 'Título', p?.titulo, { requerido: true, extra: 'maxlength="200"' })}
            <div class="campo">
                <label for="campo-seccion">Sección *</label>
                <select id="campo-seccion" name="seccion" required>
                    <option value="">Elegí una sección…</option>
                    ${secciones.map(s => `<option value="${e(s.id)}" ${p?.seccion === s.id ? 'selected' : ''}>${e(s.nombre)}</option>`).join('')}
                </select>
            </div>
            ${campo('texto', 'Texto', p?.texto, { area: true, extra: 'maxlength="10000" rows="6"' })}
            <div class="campo">
                <span>Fotos y videos</span>
                <label class="btn btn-secundario selector-archivo">+ Agregar fotos o videos
                    <input type="file" accept="${ACEPTA_MEDIOS}" multiple data-medios-archivo>
                </label>
                <small>Fotos JPG, PNG, WEBP o GIF (hasta 10 MB) y videos MP4, WEBM o MOV (hasta 200 MB). Se suben al guardar.</small>
                <div class="medios-lista" data-medios></div>
            </div>
            <label class="campo-check"><input type="checkbox" name="publicada" ${p && !p.publicada ? '' : 'checked'}> Publicada (si la destildás, queda como borrador)</label>
            <p class="progreso" data-progreso></p>`,
        alAbrir: (cuerpo) => { medios = controlMedios(cuerpo, p?.medios ?? []); },
        alGuardar: async (form) => {
            const datos = {
                titulo: form.titulo.value,
                seccion: form.seccion.value,
                texto: form.texto.value,
                publicada: form.publicada.checked,
                medios: await medios.valor(),
            };
            if (p) await enviar(`/api/admin/publicaciones/${p.id}`, 'PUT', datos);
            else await enviar('/api/admin/publicaciones', 'POST', datos);
            avisar(p ? 'Publicación actualizada.' : '¡Publicación creada!');
            mostrarPestaña('publicaciones');
        },
        alCerrar: (guardado) => medios.cerrar(guardado),
    });
}

// ---------- Pestañas: Cultivos, Docentes e Inicio (listas ordenables con foto) ----------

const COLECCIONES = {
    cultivos: {
        titulo: 'Cultivos',
        descripcion: 'Fichas de cultivos.html. El orden de la lista es el orden de la grilla.',
        nuevo: '+ Agregar cultivo',
        singular: 'cultivo',
        foto: 'imagen',
        enlaceLista: 'cultivos.html',
        nombre: c => c.nombre,
        detalle: c => c.nombre_cientifico,
        enlace: c => `cultivo.html?slug=${c.slug}`,
        campos: [
            ['nombre', 'Nombre', { requerido: true, extra: 'maxlength="100"' }],
            ['nombre_vulgar', 'Nombre vulgar', { extra: 'maxlength="300"' }],
            ['nombre_cientifico', 'Nombre científico', { extra: 'maxlength="200"' }],
            ['origen', 'Origen', { area: true, extra: 'rows="2" maxlength="1000"' }],
            ['caracteristicas', 'Otras características', { area: true, extra: 'maxlength="3000"' }],
            ['siembra', 'Siembra', { area: true, extra: 'maxlength="3000"' }],
            ['cosecha', 'Cosecha', { area: true, extra: 'maxlength="3000"' }],
        ],
    },
    docentes: {
        titulo: 'Docentes',
        descripcion: 'Tarjetas de docentes.html. El texto de presentación se edita en la pestaña Páginas.',
        nuevo: '+ Agregar docente',
        singular: 'docente',
        foto: 'foto',
        enlaceLista: 'docentes.html',
        nombre: d => d.nombre,
        detalle: d => d.descripcion,
        campos: [
            ['nombre', 'Nombre y apellido', { requerido: true, extra: 'maxlength="100"' }],
            ['descripcion', 'Cargo o materia', { extra: 'maxlength="300"', ayuda: 'Por ejemplo: "Profesora de Matemática".' }],
        ],
    },
    inicio: {
        titulo: 'Inicio',
        descripcion: 'Tarjetas de la grilla de la página principal.',
        nuevo: '+ Agregar tarjeta',
        singular: 'tarjeta',
        foto: 'imagen',
        enlaceLista: 'index.html',
        nombre: t => t.titulo,
        detalle: t => `Lleva a: ${t.enlace}`,
        enlace: t => t.enlace,
        campos: [
            ['titulo', 'Título', { requerido: true, extra: 'maxlength="100"' }],
            ['enlace', 'Enlace', {
                requerido: true,
                extra: 'list="paginas-sitio" maxlength="300"',
                ayuda: 'Una página del sitio (elegila de la lista) o una dirección que empiece con https://',
            }],
        ],
    },
};

async function vistaColeccion(clave) {
    const c = COLECCIONES[clave];
    const filas = await api(`/api/admin/${clave}`);
    vista.innerHTML = encabezado(c.titulo, c.descripcion,
        `${enlaceSitio(c.enlaceLista)}<button type="button" class="btn btn-principal" data-accion="nuevo" data-coleccion="${clave}">${c.nuevo}</button>`)
        + `<div class="lista">${filas.length ? filas.map((f, i) => `
            <article class="item">
                ${f[c.foto] ? `<img class="item__foto" src="${e(f[c.foto])}" alt="" loading="lazy">` : '<div class="item__foto"></div>'}
                <div class="item__cuerpo">
                    <p class="item__titulo">${e(c.nombre(f))}</p>
                    <p class="item__meta">${e(c.detalle(f) || '')}</p>
                    <div class="item__acciones">
                        <button type="button" class="btn btn-secundario btn-icono" data-accion="mover" data-coleccion="${clave}" data-i="${i}" data-paso="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
                        <button type="button" class="btn btn-secundario btn-icono" data-accion="mover" data-coleccion="${clave}" data-i="${i}" data-paso="1" ${i === filas.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
                        <button type="button" class="btn btn-secundario btn-chico" data-accion="editar" data-coleccion="${clave}" data-id="${f.id}">Editar</button>
                        <button type="button" class="btn btn-peligro btn-chico" data-accion="borrar" data-coleccion="${clave}" data-id="${f.id}">Borrar</button>
                        ${c.enlace ? enlaceSitio(c.enlace(f), 'Ver') : ''}
                    </div>
                </div>
            </article>`).join('') : '<p class="panel-vacio">Todavía no hay nada cargado.</p>'}</div>`;
    return filas;
}

function formularioColeccion(clave, fila = null) {
    const c = COLECCIONES[clave];
    let foto;
    abrirModal({
        titulo: fila ? `Editar ${c.singular}` : `Nuevo ${c.singular}`.replace('Nuevo tarjeta', 'Nueva tarjeta'),
        cuerpo: c.campos.map(([nombre, etiqueta, opciones]) => campo(nombre, etiqueta, fila?.[nombre] ?? '', opciones)).join('')
            + htmlCampoFoto('Foto', fila?.[c.foto])
            + '<p class="progreso" data-progreso></p>'
            + (clave === 'inicio' ? `<datalist id="paginas-sitio">${PAGINAS_SITIO.map(p => `<option value="${e(p)}">`).join('')}</datalist>` : ''),
        alAbrir: (cuerpo) => { foto = controlFoto(cuerpo, fila?.[c.foto], clave); },
        alGuardar: async (form) => {
            const datos = Object.fromEntries(c.campos.map(([nombre]) => [nombre, form[nombre].value]));
            datos[c.foto] = await foto.valor();
            if (fila) await enviar(`/api/admin/${clave}/${fila.id}`, 'PUT', datos);
            else await enviar(`/api/admin/${clave}`, 'POST', datos);
            avisar('Cambios guardados.');
            mostrarPestaña(clave);
        },
        alCerrar: (guardado) => foto.cerrar(guardado),
    });
}

// ---------- Pestaña: Páginas (editor visual) ----------

async function vistaPaginas() {
    const paginas = await api('/api/admin/paginas');
    vista.innerHTML = encabezado('Páginas', 'Textos y fotos de las páginas del sitio.')
        + `<div class="lista">${paginas.map(p => `
            <article class="item">
                <div class="item__cuerpo">
                    <p class="item__titulo">${e(p.titulo)}</p>
                    <p class="item__meta">Última edición: ${fecha(p.actualizado_en)}${p.autor ? ` por ${e(p.autor)}` : ''}</p>
                    <div class="item__acciones">
                        <button type="button" class="btn btn-principal btn-chico" data-accion="editar-pagina" data-slug="${e(p.slug)}">Editar</button>
                        ${PAGINAS_PUBLICAS[p.slug] ? enlaceSitio(PAGINAS_PUBLICAS[p.slug], 'Ver') : ''}
                    </div>
                </div>
            </article>`).join('') || '<p class="panel-vacio">No hay páginas. Corré "npm run importar" para cargar las del sitio.</p>'}</div>`;
}

async function abrirEditorPagina(slug) {
    const pagina = await api(`/api/admin/paginas/${encodeURIComponent(slug)}`);
    vista.innerHTML = `
        <div class="editor-pagina">
            <div class="editor-pagina__barra">
                <button type="button" class="btn btn-secundario" data-accion="volver-paginas">← Volver</button>
                <span class="separador"></span>
                ${PAGINAS_PUBLICAS[slug] ? enlaceSitio(PAGINAS_PUBLICAS[slug]) : ''}
                <button type="button" class="btn btn-principal" data-accion="guardar-pagina">Guardar</button>
            </div>
            ${campo('tituloPagina', 'Nombre de la página (solo se ve en el panel)', pagina.titulo, { requerido: true })}
            <p class="panel-ayuda">Para agregar una foto usá el botón de imagen de la barra (o arrastrala adentro del texto).
                Al guardar se quita cualquier código que no sea seguro.</p>
            <textarea id="editorPagina"></textarea>
            <p class="panel-error" id="errorEditor" role="alert"></p>
        </div>`;
    document.getElementById('editorPagina').value = pagina.contenido_html;

    try {
        await cargarScript(TINYMCE);
    } catch (err) {
        document.getElementById('errorEditor').textContent = err.message;
        return;
    }
    const [editor] = await window.tinymce.init({
        selector: '#editorPagina',
        license_key: 'gpl',
        promotion: false,
        branding: false,
        language: 'es',
        language_url: TINYMCE_ES,
        menubar: false,
        plugins: 'lists link image table code autoresize',
        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | link image table | code',
        block_formats: 'Párrafo=p; Título 1=h1; Título 2=h2; Título 3=h3',
        // Se ve igual que en el sitio: mismo CSS y misma fuente.
        content_css: ['https://fonts.googleapis.com/css2?family=Staatliches&display=swap', 'css/normalize.css', 'css/styles.css', 'css/estilos.css'],
        body_class: 'contenedor',
        content_style: 'body { padding: 1.5rem; }',
        convert_urls: false,           // dejar "Img 2/foto.jpg" tal cual
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
    });
    editorAbierto = { slug, editor };
}

async function guardarPagina(boton) {
    const { slug, editor } = editorAbierto;
    const titulo = document.getElementById('campo-tituloPagina').value;
    const error = document.getElementById('errorEditor');
    error.textContent = '';
    boton.disabled = true;
    try {
        const resultado = await enviar(`/api/admin/paginas/${encodeURIComponent(slug)}`, 'PUT', {
            titulo,
            contenido_html: editor.getContent(),
        });
        // Se muestra lo que realmente quedó guardado (ya sanitizado).
        editor.setContent(resultado.contenido_html);
        editor.setDirty(false);
        avisar('Página guardada. Ya se ve en el sitio.');
    } catch (err) {
        error.textContent = err.message;
    } finally {
        boton.disabled = false;
    }
}

function hayCambiosSinGuardar() {
    return Boolean(editorAbierto?.editor?.isDirty());
}

function cerrarEditor() {
    if (editorAbierto) {
        window.tinymce?.remove(editorAbierto.editor);
        editorAbierto = null;
    }
}

window.addEventListener('beforeunload', (ev) => {
    if (hayCambiosSinGuardar()) ev.preventDefault();
});

// ---------- Pestañas: Experiencias y Buzón ----------

async function vistaExperiencias() {
    const filas = await api('/api/admin/experiencias');
    vista.innerHTML = encabezado('Experiencias de estudiantes', 'Se publican en estudiantes.html solo después de aprobarlas.')
        + `<div class="lista">${filas.length ? filas.map(exp => `
            <article class="item item--${exp.estado}">
                <div class="item__cuerpo">
                    <p class="item__meta">${exp.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Publicada'} ·
                        <strong>${e(exp.nombre || 'Anónimo')}</strong> · ${fecha(exp.creado_en)}</p>
                    <p class="item__texto">${e(exp.texto)}</p>
                    ${exp.foto_url ? `<img class="item__foto-grande" src="${e(exp.foto_url)}" alt="Foto enviada">` : ''}
                    <div class="item__acciones">
                        ${exp.estado === 'pendiente'
                            ? `<button type="button" class="btn btn-principal btn-chico" data-accion="aprobar" data-id="${exp.id}">Aprobar y publicar</button>`
                            : `<button type="button" class="btn btn-secundario btn-chico" data-accion="ocultar" data-id="${exp.id}">Ocultar</button>`}
                        <button type="button" class="btn btn-peligro btn-chico" data-accion="borrar-experiencia" data-id="${exp.id}">Borrar</button>
                    </div>
                </div>
            </article>`).join('') : '<p class="panel-vacio">No hay experiencias todavía.</p>'}</div>`;
}

async function vistaConsultas() {
    const filas = await api('/api/admin/consultas');
    vista.innerHTML = encabezado('Buzón confidencial', 'Solo lo leen los docentes desde este panel.')
        + `<div class="lista">${filas.length ? filas.map(c => `
            <article class="item ${c.leida ? '' : 'item--no-leida'}">
                <div class="item__cuerpo">
                    <p class="item__meta">${c.leida ? 'Leída' : '📩 Nueva'} ·
                        <strong>${e(c.nombre || 'Anónimo')}</strong> · ${fecha(c.creado_en)}</p>
                    <p class="item__texto">${e(c.texto)}</p>
                    <div class="item__acciones">
                        <button type="button" class="btn btn-secundario btn-chico" data-accion="${c.leida ? 'no-leida' : 'leida'}" data-id="${c.id}">
                            Marcar como ${c.leida ? 'no leída' : 'leída'}</button>
                        <button type="button" class="btn btn-peligro btn-chico" data-accion="borrar-consulta" data-id="${c.id}">Borrar</button>
                    </div>
                </div>
            </article>`).join('') : '<p class="panel-vacio">El buzón está vacío.</p>'}</div>`;
}

// ---------- Pestaña: Instagram (solo admin) ----------

async function vistaInstagram() {
    const ig = await api('/api/admin/instagram');
    const dias = ig.vence ? Math.round((Date.parse(ig.vence) - Date.now()) / 86400000) : null;
    vista.innerHTML = encabezado('Instagram', 'La galería (galeria.html) copia los posteos de la cuenta todos los días.',
        enlaceSitio('galeria.html', 'Ver galería'))
        + `<dl class="datos">
            <dt>Cuenta</dt><dd>${ig.conectado ? (ig.usuario ? `@${e(ig.usuario)}` : 'Conectada') : '❌ Sin conectar'}</dd>
            <dt>El token vence</dt><dd>${ig.vence ? `${fecha(ig.vence)} (${dias > 0 ? `en ${dias} días; se renueva solo` : 'vencido: pegá uno nuevo'})` : '—'}</dd>
            <dt>Última sincronización</dt><dd>${fecha(ig.ultimaSync)}</dd>
            <dt>Posteos en la galería</dt><dd>${ig.cantidad}</dd>
            <dt>Sincronización diaria</dt><dd>${ig.cronConfigurado ? '✅ Activa' : '⚠️ Falta la variable CRON_SECRET en Vercel'}</dd>
            ${ig.ultimoError ? `<dt>Último error</dt><dd class="panel-error">${e(ig.ultimoError)}</dd>` : ''}
        </dl>
        <div class="item__acciones">
            <button type="button" class="btn btn-principal" data-accion="sincronizar" ${ig.conectado ? '' : 'disabled'}>Sincronizar ahora</button>
        </div>
        <h3>Conectar o cambiar el token</h3>
        <form id="formToken" class="campo">
            <label for="token">Token de larga duración de Instagram</label>
            <textarea id="token" name="token" rows="3" required autocomplete="off" spellcheck="false"></textarea>
            <small>Se genera en Meta for Developers (los pasos están en el README del proyecto). Dura 60 días y el sitio lo renueva solo.</small>
            <div><button type="submit" class="btn btn-principal">Guardar token y sincronizar</button></div>
        </form>`;
}

// ---------- Pestaña: Usuarios (solo admin) ----------

let claveParaMostrar = null; // { email, contrasena } después de crear o resetear

async function vistaUsuarios() {
    const filas = await api('/api/admin/usuarios');
    const clave = claveParaMostrar;
    claveParaMostrar = null;
    vista.innerHTML = encabezado('Usuarios', 'Cuentas de docentes que pueden entrar al panel.',
        '<button type="button" class="btn btn-principal" data-accion="nuevo-usuario">+ Nueva cuenta</button>')
        + (clave ? `
            <div class="clave-temporal" role="alert">
                <p>Contraseña temporal de <strong>${e(clave.email)}</strong>:</p>
                <p><code>${e(clave.contrasena)}</code>
                   <button type="button" class="btn btn-secundario btn-chico" data-accion="copiar" data-texto="${e(clave.contrasena)}">Copiar</button></p>
                <p>Pasásela a la persona por un medio privado. Se muestra <strong>una sola vez</strong>;
                   al entrar puede cambiarla con "Cambiar mi contraseña".</p>
            </div>` : '')
        + `<div class="lista">${filas.map(u => `
            <article class="item ${u.activo ? '' : 'item--inactivo'}">
                <div class="item__cuerpo">
                    <p class="item__titulo">${e(u.nombre)} ${u.id === usuario.id ? '(vos)' : ''}</p>
                    <p class="item__meta">${e(u.email)} ·
                        <span class="etiqueta ${u.rol === 'admin' ? 'etiqueta--admin' : ''}">${u.rol === 'admin' ? 'Administrador' : 'Docente'}</span>
                        ${u.activo ? '' : '<span class="etiqueta">Desactivada</span>'}</p>
                    ${u.id === usuario.id ? '' : `
                    <div class="item__acciones">
                        <button type="button" class="btn btn-secundario btn-chico" data-accion="activar" data-id="${u.id}" data-valor="${u.activo ? 0 : 1}">${u.activo ? 'Desactivar' : 'Activar'}</button>
                        <button type="button" class="btn btn-secundario btn-chico" data-accion="rol" data-id="${u.id}" data-valor="${u.rol === 'admin' ? 'docente' : 'admin'}">${u.rol === 'admin' ? 'Quitar admin' : 'Hacer admin'}</button>
                        <button type="button" class="btn btn-secundario btn-chico" data-accion="resetear" data-id="${u.id}" data-email="${e(u.email)}">Resetear contraseña</button>
                    </div>`}
                </div>
            </article>`).join('')}</div>`;
}

function formularioUsuario() {
    abrirModal({
        titulo: 'Nueva cuenta',
        textoGuardar: 'Crear cuenta',
        cuerpo: `
            ${campo('nombre', 'Nombre y apellido', '', { requerido: true, extra: 'maxlength="100"' })}
            ${campo('email', 'Email', '', { requerido: true, tipo: 'email', extra: 'maxlength="200" autocomplete="off"' })}
            <div class="campo">
                <label for="campo-rol">Rol</label>
                <select id="campo-rol" name="rol">
                    <option value="docente">Docente (publica y edita contenido)</option>
                    <option value="admin">Administrador (además maneja cuentas e Instagram)</option>
                </select>
            </div>
            <p class="panel-ayuda">Se crea con una contraseña temporal que vas a ver al guardar.</p>`,
        alGuardar: async (form) => {
            const { contrasena } = await enviar('/api/admin/usuarios', 'POST', {
                nombre: form.nombre.value, email: form.email.value, rol: form.rol.value,
            });
            claveParaMostrar = { email: form.email.value.trim().toLowerCase(), contrasena };
            mostrarPestaña('usuarios');
        },
    });
}

function formularioMiContrasena() {
    abrirModal({
        titulo: 'Cambiar mi contraseña',
        textoGuardar: 'Cambiar',
        cuerpo: `
            ${campo('actual', 'Contraseña actual', '', { requerido: true, tipo: 'password', extra: 'autocomplete="current-password"' })}
            ${campo('nueva', 'Contraseña nueva', '', { requerido: true, tipo: 'password', extra: 'minlength="8" autocomplete="new-password"', ayuda: 'Al menos 8 caracteres.' })}
            ${campo('repetir', 'Repetí la contraseña nueva', '', { requerido: true, tipo: 'password', extra: 'minlength="8" autocomplete="new-password"' })}`,
        alGuardar: async (form) => {
            if (form.nueva.value !== form.repetir.value) throw new Error('Las contraseñas nuevas no coinciden.');
            await enviar('/api/admin/mi-contrasena', 'POST', { actual: form.actual.value, nueva: form.nueva.value });
            avisar('Tu contraseña se cambió. Las sesiones abiertas en otros dispositivos se cerraron.');
        },
    });
}

// ---------- Acciones de los botones de cada vista ----------

// Las listas actuales, para editar y reordenar sin volver a pedirlas.
const datos = {};

async function mover(clave, i, paso) {
    const filas = datos[clave];
    const j = i + paso;
    [filas[i], filas[j]] = [filas[j], filas[i]];
    await enviar(`/api/admin/${clave}/orden`, 'POST', { ids: filas.map(f => f.id) });
    await mostrarPestaña(clave);
}

const acciones = {
    'nueva-publicacion': () => formularioPublicacion(),
    'editar-publicacion': ({ id }) => formularioPublicacion(datos.publicaciones.find(p => p.id === Number(id))),
    'borrar-publicacion': async ({ id }) => {
        if (!confirm('¿Borrar esta publicación con todas sus fotos y videos? No se puede deshacer.')) return;
        await api(`/api/admin/publicaciones/${id}`, { method: 'DELETE' });
        avisar('Publicación borrada.');
        await mostrarPestaña('publicaciones');
    },

    'nuevo': ({ coleccion }) => formularioColeccion(coleccion),
    'editar': ({ coleccion, id }) => formularioColeccion(coleccion, datos[coleccion].find(f => f.id === Number(id))),
    'borrar': async ({ coleccion, id }) => {
        const fila = datos[coleccion].find(f => f.id === Number(id));
        if (!confirm(`¿Borrar "${COLECCIONES[coleccion].nombre(fila)}"? No se puede deshacer.`)) return;
        await api(`/api/admin/${coleccion}/${id}`, { method: 'DELETE' });
        avisar('Borrado.');
        await mostrarPestaña(coleccion);
    },
    'mover': ({ coleccion, i, paso }) => mover(coleccion, Number(i), Number(paso)),

    'editar-pagina': ({ slug }) => abrirEditorPagina(slug),
    'guardar-pagina': (dataset, boton) => guardarPagina(boton),
    'volver-paginas': () => mostrarPestaña('paginas'),

    'aprobar': async ({ id }) => { await enviar(`/api/admin/experiencias/${id}`, 'PATCH', { estado: 'aprobada' }); await mostrarPestaña('experiencias'); },
    'ocultar': async ({ id }) => { await enviar(`/api/admin/experiencias/${id}`, 'PATCH', { estado: 'pendiente' }); await mostrarPestaña('experiencias'); },
    'borrar-experiencia': async ({ id }) => {
        if (!confirm('¿Borrar esta experiencia para siempre?')) return;
        await api(`/api/admin/experiencias/${id}`, { method: 'DELETE' });
        await mostrarPestaña('experiencias');
    },
    'leida': async ({ id }) => { await enviar(`/api/admin/consultas/${id}`, 'PATCH', { leida: true }); await mostrarPestaña('consultas'); },
    'no-leida': async ({ id }) => { await enviar(`/api/admin/consultas/${id}`, 'PATCH', { leida: false }); await mostrarPestaña('consultas'); },
    'borrar-consulta': async ({ id }) => {
        if (!confirm('¿Borrar esta consulta para siempre?')) return;
        await api(`/api/admin/consultas/${id}`, { method: 'DELETE' });
        await mostrarPestaña('consultas');
    },

    'sincronizar': async (dataset, boton) => {
        boton.textContent = 'Sincronizando…';
        const { total } = await enviar('/api/admin/instagram/sincronizar', 'POST');
        avisar(`Listo: ${total} posteos sincronizados.`);
        await mostrarPestaña('instagram');
    },

    'nuevo-usuario': () => formularioUsuario(),
    'activar': async ({ id, valor }) => {
        if (valor === '0' && !confirm('¿Desactivar esta cuenta? No va a poder entrar al panel.')) return;
        await enviar(`/api/admin/usuarios/${id}`, 'PATCH', { activo: valor === '1' });
        await mostrarPestaña('usuarios');
    },
    'rol': async ({ id, valor }) => {
        if (!confirm(valor === 'admin' ? '¿Darle permisos de administrador?' : '¿Quitarle los permisos de administrador?')) return;
        await enviar(`/api/admin/usuarios/${id}`, 'PATCH', { rol: valor });
        await mostrarPestaña('usuarios');
    },
    'resetear': async ({ id, email }) => {
        if (!confirm(`¿Generar una contraseña nueva para ${email}? La actual deja de funcionar.`)) return;
        const { contrasena } = await enviar(`/api/admin/usuarios/${id}/resetear`, 'POST');
        claveParaMostrar = { email, contrasena };
        await mostrarPestaña('usuarios');
    },
    'copiar': async ({ texto }) => {
        await navigator.clipboard.writeText(texto);
        avisar('Contraseña copiada.');
    },
};

vista.addEventListener('click', async (ev) => {
    const boton = ev.target.closest('button[data-accion]');
    if (!boton) return;
    boton.disabled = true;
    try {
        await acciones[boton.dataset.accion](boton.dataset, boton);
    } catch (err) {
        avisar(err.message, { error: true });
    } finally {
        if (boton.isConnected) boton.disabled = false;
    }
});

vista.addEventListener('submit', async (ev) => {
    if (ev.target.id !== 'formToken') return;
    ev.preventDefault();
    const boton = ev.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    boton.textContent = 'Conectando…';
    try {
        const { usuario: cuenta, total } = await enviar('/api/admin/instagram/token', 'POST', { token: ev.target.token.value });
        avisar(`Instagram conectado (@${cuenta}). ${total} posteos sincronizados.`);
        await mostrarPestaña('instagram');
    } catch (err) {
        avisar(err.message, { error: true });
        boton.disabled = false;
        boton.textContent = 'Guardar token y sincronizar';
    }
});

// ---------- Pestañas, sesión y login ----------

const VISTAS = {
    publicaciones: vistaPublicaciones,
    cultivos: () => vistaColeccion('cultivos'),
    docentes: () => vistaColeccion('docentes'),
    paginas: vistaPaginas,
    inicio: () => vistaColeccion('inicio'),
    experiencias: vistaExperiencias,
    consultas: vistaConsultas,
    instagram: vistaInstagram,
    usuarios: vistaUsuarios,
};
const SOLO_ADMIN = ['instagram', 'usuarios'];

async function mostrarPestaña(nombre) {
    if (!VISTAS[nombre] || (SOLO_ADMIN.includes(nombre) && usuario.rol !== 'admin')) nombre = 'publicaciones';
    if (nombre !== pestaña || editorAbierto) {
        if (hayCambiosSinGuardar() && !confirm('Hay cambios sin guardar en la página. ¿Salir igual?')) return;
        cerrarEditor();
    }
    pestaña = nombre;
    history.replaceState(null, '', `#${nombre}`);
    document.querySelectorAll('.panel-tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === nombre)));
    try {
        datos[nombre] = await VISTAS[nombre]();
    } catch (err) {
        vista.innerHTML = `<p class="panel-error">${e(err.message)}</p>
            <button type="button" class="btn btn-secundario" data-accion="reintentar">Reintentar</button>`;
    }
}
acciones.reintentar = () => mostrarPestaña(pestaña);

document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        aviso.hidden = true;
        mostrarPestaña(tab.dataset.tab);
    });
});

function mostrarLogin() {
    cerrarEditor();
    if (modal.open) modal.close();
    usuario = null;
    document.getElementById('formLogin').hidden = false;
    document.getElementById('contenidoPanel').hidden = true;
}

async function mostrarPanel(datosUsuario) {
    usuario = datosUsuario;
    document.getElementById('formLogin').hidden = true;
    document.getElementById('contenidoPanel').hidden = false;
    document.getElementById('saludo').innerHTML = `Hola, <strong>${e(usuario.nombre)}</strong>
        <span class="etiqueta ${usuario.rol === 'admin' ? 'etiqueta--admin' : ''}">${usuario.rol === 'admin' ? 'Administrador' : 'Docente'}</span>`;
    document.querySelectorAll('[data-solo-admin]').forEach(el => { el.hidden = usuario.rol !== 'admin'; });
    secciones = await api('/api/secciones').catch(() => []);
    pestaña = null;
    await mostrarPestaña(location.hash.slice(1) || 'publicaciones');
}

document.getElementById('formLogin').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const error = document.getElementById('errorLogin');
    const boton = ev.target.querySelector('button');
    error.textContent = '';
    boton.disabled = true;
    try {
        await enviar('/api/admin/login', 'POST', { email: ev.target.email.value, password: ev.target.password.value });
        ev.target.reset();
        const { usuario: datosUsuario } = await api('/api/admin/sesion');
        await mostrarPanel(datosUsuario);
    } catch (err) {
        error.textContent = err.message;
    } finally {
        boton.disabled = false;
    }
});

document.getElementById('botonSalir').addEventListener('click', async () => {
    if (hayCambiosSinGuardar() && !confirm('Hay cambios sin guardar. ¿Cerrar sesión igual?')) return;
    await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
    mostrarLogin();
});

document.getElementById('botonContrasena').addEventListener('click', formularioMiContrasena);

api('/api/admin/sesion')
    .then(({ usuario: datosUsuario }) => datosUsuario ? mostrarPanel(datosUsuario) : mostrarLogin())
    .catch(mostrarLogin);
