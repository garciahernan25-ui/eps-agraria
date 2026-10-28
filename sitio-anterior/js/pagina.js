// Carga el contenido de una página de texto en <div data-pagina="slug">.
// El HTML viene sanitizado por el servidor (api/_lib/sanitizar.js) al guardarlo.
import { pedirJSON, mostrarEstado, MENSAJE_ERROR } from './comun.js';

for (const contenedor of document.querySelectorAll('[data-pagina]')) {
    mostrarEstado(contenedor, 'Cargando...');
    pedirJSON(`/api/paginas/${encodeURIComponent(contenedor.dataset.pagina)}`)
        .then(pagina => {
            contenedor.innerHTML = pagina.contenido_html || '<p class="estado-carga">Esta página todavía no tiene contenido.</p>';
        })
        .catch(() => mostrarEstado(contenedor, MENSAJE_ERROR, { error: true }));
}
