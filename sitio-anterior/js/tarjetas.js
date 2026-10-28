// Grillas de tarjetas con foto (inicio y cultivos), con el mismo HTML que tenían antes.
//   <div class="grid" data-tarjetas="inicio">   → /api/inicio
//   <div class="grid" data-tarjetas="cultivos"> → /api/cultivos (cada una abre su ficha)
import { escaparHTML, pedirJSON, mostrarEstado, MENSAJE_ERROR } from './comun.js';

const FUENTES = {
    inicio: {
        url: '/api/inicio',
        tarjeta: t => ({ enlace: t.enlace, imagen: t.imagen, titulo: t.titulo }),
    },
    cultivos: {
        url: '/api/cultivos',
        tarjeta: c => ({ enlace: `cultivo.html?slug=${encodeURIComponent(c.slug)}`, imagen: c.imagen, titulo: c.nombre }),
    },
};

// Las páginas del sitio tienen espacios en el nombre ("cea 34.html"): se codifican para el href.
function hrefSeguro(enlace) {
    if (/^https:\/\//.test(enlace)) return enlace;
    try {
        return encodeURI(decodeURI(enlace)); // por si ya venía codificado
    } catch {
        return encodeURI(enlace);
    }
}

function htmlTarjeta({ enlace, imagen, titulo }) {
    const externo = /^https:\/\//.test(enlace) ? ' target="_blank" rel="noopener"' : '';
    return `
        <div class="producto">
            <a href="${escaparHTML(hrefSeguro(enlace))}"${externo}>
                ${imagen ? `<img class="producto__imagen" src="${escaparHTML(imagen)}" alt="${escaparHTML(titulo)}" loading="lazy">` : ''}
                <div class="producto__informacion">
                    <p class="producto__nombre">${escaparHTML(titulo)}</p>
                    <p class="producto__precio"></p>
                </div>
            </a>
        </div>`;
}

for (const grilla of document.querySelectorAll('[data-tarjetas]')) {
    const fuente = FUENTES[grilla.dataset.tarjetas];
    mostrarEstado(grilla, 'Cargando...');
    pedirJSON(fuente.url)
        .then(filas => {
            grilla.innerHTML = filas.length
                ? filas.map(f => htmlTarjeta(fuente.tarjeta(f))).join('')
                : '<p class="estado-carga">Todavía no hay nada cargado.</p>';
        })
        .catch(() => mostrarEstado(grilla, MENSAJE_ERROR, { error: true }));
}
