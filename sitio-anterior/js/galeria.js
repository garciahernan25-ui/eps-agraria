// Galería de Instagram: grilla de miniaturas y vista ampliada (los videos se reproducen ahí).
import { escaparHTML, formatearFecha, pedirJSON, mostrarEstado, MENSAJE_ERROR } from './comun.js';

const galeria = document.getElementById('galeria');
const botonMas = document.getElementById('cargarMas');
const visor = document.getElementById('visor');

const posts = new Map();
let pagina = 0;
let actual = null; // { post, medios, indice }

// Un carrusel muestra sus hijos; los demás, el propio posteo.
function mediosDe(post) {
    const lista = post.tipo === 'CAROUSEL_ALBUM' && post.hijos.length ? post.hijos : [post];
    return lista.filter(m => m.media_url || m.thumbnail_url);
}

function miniatura(post) {
    const imagen = post.tipo === 'VIDEO' ? post.thumbnail_url : (post.media_url || post.thumbnail_url);
    if (!imagen) return '';
    const icono = { VIDEO: 'fa-play', CAROUSEL_ALBUM: 'fa-clone' }[post.tipo];
    const descripcion = (post.caption || 'Posteo de Instagram').slice(0, 120);
    return `
        <button type="button" class="galeria__item" data-id="${escaparHTML(post.id)}">
            <img src="${escaparHTML(imagen)}" alt="${escaparHTML(descripcion)}" loading="lazy">
            ${icono ? `<span class="galeria__icono"><i class="fas ${icono}"></i></span>` : ''}
        </button>`;
}

async function cargar() {
    botonMas.disabled = true;
    if (!pagina) mostrarEstado(galeria, 'Cargando la galería...');
    try {
        const datos = await pedirJSON(`/api/instagram?pagina=${pagina + 1}`);
        if (!pagina) galeria.innerHTML = '';
        pagina = datos.pagina;
        for (const post of datos.posts) posts.set(post.id, post);
        galeria.insertAdjacentHTML('beforeend', datos.posts.map(miniatura).join(''));
        if (!posts.size) mostrarEstado(galeria, 'Todavía no hay fotos en la galería.');
        botonMas.hidden = pagina >= datos.paginas;
    } catch {
        if (!pagina) mostrarEstado(galeria, MENSAJE_ERROR, { error: true });
        else alert('No se pudieron cargar más fotos. Probá de nuevo.');
    } finally {
        botonMas.disabled = false;
    }
}

function mostrarMedio() {
    const { post, medios, indice } = actual;
    const medio = medios[indice];
    const contenedor = document.getElementById('visorMedio');
    if (medio.tipo === 'VIDEO' && medio.media_url) {
        contenedor.innerHTML = `<video src="${escaparHTML(medio.media_url)}" poster="${escaparHTML(medio.thumbnail_url || '')}"
            controls autoplay preload="metadata" playsinline></video>`;
    } else {
        contenedor.innerHTML = `<img src="${escaparHTML(medio.media_url || medio.thumbnail_url)}" alt="${escaparHTML((post.caption || '').slice(0, 120))}">`;
    }
    document.getElementById('visorFlechas').hidden = medios.length < 2;
    document.getElementById('visorPosicion').textContent = `${indice + 1} / ${medios.length}`;
}

function abrir(post) {
    const medios = mediosDe(post);
    if (!medios.length) return;
    actual = { post, medios, indice: 0 };
    document.getElementById('visorFecha').textContent = formatearFecha(post.timestamp);
    document.getElementById('visorCaption').textContent = post.caption || '';
    document.getElementById('visorEnlace').href = /^https:\/\//.test(post.permalink)
        ? post.permalink : 'https://www.instagram.com/epsagraria/';
    mostrarMedio();
    visor.showModal();
}

function mover(paso) {
    if (!actual || actual.medios.length < 2) return;
    actual.indice = (actual.indice + paso + actual.medios.length) % actual.medios.length;
    mostrarMedio();
}

galeria.addEventListener('click', (e) => {
    const item = e.target.closest('.galeria__item');
    if (item) abrir(posts.get(item.dataset.id));
});
botonMas.addEventListener('click', cargar);

document.getElementById('visorCerrar').addEventListener('click', () => visor.close());
document.getElementById('visorAnterior').addEventListener('click', () => mover(-1));
document.getElementById('visorSiguiente').addEventListener('click', () => mover(1));
// Clic afuera de la caja: cerrar.
visor.addEventListener('click', (e) => { if (e.target === visor) visor.close(); });
visor.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') mover(-1);
    if (e.key === 'ArrowRight') mover(1);
});
// Al cerrar se corta el video.
visor.addEventListener('close', () => { document.getElementById('visorMedio').innerHTML = ''; actual = null; });

cargar();
