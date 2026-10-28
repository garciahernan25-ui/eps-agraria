// Ficha de un cultivo: cultivo.html?slug=acelga
import { escaparHTML, pedirJSON, mostrarEstado, MENSAJE_ERROR } from './comun.js';

const contenedor = document.getElementById('ficha');
const slug = new URLSearchParams(location.search).get('slug');

// Los textos son planos: se escapan y los saltos de línea se respetan con CSS.
const t = (valor) => escaparHTML(valor || '—');

function htmlFicha(c) {
    return `
        <div class="cultivo-ficha">
            <header class="cultivo-header">
                <h1>${escaparHTML(c.nombre)}</h1>
            </header>
            ${c.imagen ? `
            <section class="cultivo-imagen">
                <img src="${escaparHTML(c.imagen)}" alt="Foto del cultivo de ${escaparHTML(c.nombre)}">
            </section>` : ''}
            <div class="cultivo-contenido">
                <article class="info-general">
                    <h2>🌱 Información General</h2>
                    <ul>
                        <li><strong>Nombre Vulgar:</strong> ${t(c.nombre_vulgar)}</li>
                        <li><strong>Nombre Científico:</strong> <em>${t(c.nombre_cientifico)}</em></li>
                        <li><strong>Origen:</strong> ${t(c.origen)}</li>
                        <li><strong>Otras Características:</strong> ${t(c.caracteristicas)}</li>
                    </ul>
                </article>
                <article class="info-fechas">
                    <h2>🗓️ Ciclo de Cultivo</h2>
                    <p><strong>Siembra:</strong> ${t(c.siembra)}</p>
                    <p><strong>Cosecha:</strong> ${t(c.cosecha)}</p>
                </article>
            </div>
        </div>`;
}

if (!slug) {
    location.replace('cultivos.html');
} else {
    mostrarEstado(contenedor, 'Cargando...');
    pedirJSON(`/api/cultivos/${encodeURIComponent(slug)}`)
        .then(cultivo => {
            contenedor.innerHTML = htmlFicha(cultivo);
            document.title = `${cultivo.nombre} - E.P.S Agraria n°1 Alte. Brown`;
        })
        .catch(err => mostrarEstado(contenedor,
            err.status === 404 ? 'No encontramos ese cultivo. Volvé a la lista de cultivos.' : MENSAJE_ERROR,
            { error: true }));
}
