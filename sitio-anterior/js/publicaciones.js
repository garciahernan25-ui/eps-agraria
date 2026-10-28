// Muestra publicaciones en cualquier elemento con data-publicaciones.
//   data-publicaciones="huerta"  → solo esa sección (si no hay ninguna, el bloque no se muestra)
//   data-publicaciones=""        → todas (página de Novedades), con el nombre de la sección
import { escaparHTML, formatearFecha, pedirJSON, htmlMedio, mostrarEstado, MENSAJE_ERROR } from './comun.js';

let secciones = null;

async function nombreSeccion(id) {
    secciones ??= pedirJSON('/api/secciones').catch(() => []);
    return (await secciones).find(s => s.id === id);
}

async function htmlPublicacion(p, mostrarSeccion) {
    let etiqueta = '';
    if (mostrarSeccion) {
        const s = await nombreSeccion(p.seccion);
        if (s) {
            etiqueta = s.pagina
                ? `<a class="publicacion__seccion" href="${escaparHTML(encodeURI(s.pagina))}">${escaparHTML(s.nombre)}</a>`
                : `<span class="publicacion__seccion">${escaparHTML(s.nombre)}</span>`;
        }
    }
    const medios = p.medios.length
        ? `<div class="publicacion__medios${p.medios.length === 1 ? ' publicacion__medios--uno' : ''}">
               ${p.medios.map(m => htmlMedio(m, p.titulo)).join('')}
           </div>`
        : '';
    return `
        <article class="publicacion">
            <header class="publicacion__encabezado">
                ${etiqueta}
                <h3 class="publicacion__titulo">${escaparHTML(p.titulo)}</h3>
                <p class="publicacion__meta">${formatearFecha(p.creado_en)}${p.autor ? ` · ${escaparHTML(p.autor)}` : ''}</p>
            </header>
            ${p.texto ? `<p class="publicacion__texto">${escaparHTML(p.texto)}</p>` : ''}
            ${medios}
        </article>`;
}

function htmlPaginacion(pagina, paginas) {
    if (paginas <= 1) return '';
    return `
        <nav class="paginacion" aria-label="Páginas">
            <button type="button" data-pagina="${pagina - 1}" ${pagina === 1 ? 'disabled' : ''}>« Más nuevas</button>
            <span>Página ${pagina} de ${paginas}</span>
            <button type="button" data-pagina="${pagina + 1}" ${pagina === paginas ? 'disabled' : ''}>Más viejas »</button>
        </nav>`;
}

async function cargar(bloque, pagina) {
    const seccion = bloque.dataset.publicaciones;
    const todas = seccion === '';
    const lista = bloque.querySelector('.publicaciones__lista');
    mostrarEstado(lista, 'Cargando publicaciones...');

    try {
        const params = new URLSearchParams({ pagina });
        if (!todas) params.set('seccion', seccion);
        const datos = await pedirJSON(`/api/publicaciones?${params}`);

        if (!datos.total) {
            if (todas) mostrarEstado(lista, 'Todavía no hay novedades publicadas.');
            else bloque.hidden = true;
            return;
        }
        bloque.hidden = false;
        lista.innerHTML = (await Promise.all(datos.publicaciones.map(p => htmlPublicacion(p, todas)))).join('')
            + htmlPaginacion(datos.pagina, datos.paginas);
    } catch {
        bloque.hidden = false;
        mostrarEstado(lista, MENSAJE_ERROR, { error: true });
    }
}

for (const bloque of document.querySelectorAll('[data-publicaciones]')) {
    if (!bloque.querySelector('.publicaciones__lista')) {
        bloque.insertAdjacentHTML('beforeend', '<div class="publicaciones__lista"></div>');
    }
    bloque.addEventListener('click', (e) => {
        const boton = e.target.closest('button[data-pagina]');
        if (!boton) return;
        cargar(bloque, Number(boton.dataset.pagina));
        bloque.scrollIntoView({ behavior: 'smooth' });
    });
    cargar(bloque, 1);
}
