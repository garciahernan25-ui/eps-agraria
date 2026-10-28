// Tarjetas de docentes.html, con el mismo HTML que tenían antes.
import { escaparHTML, pedirJSON, mostrarEstado, MENSAJE_ERROR } from './comun.js';

const lista = document.querySelector('.lista-profesores');
mostrarEstado(lista, 'Cargando...');

pedirJSON('/api/docentes')
    .then(docentes => {
        lista.innerHTML = docentes.map(d => `
            <div class="profesor-card">
                <img src="${escaparHTML(d.foto || 'Img 2/profeee.jpg')}" alt="Foto de ${escaparHTML(d.nombre)}" class="profesor-foto" loading="lazy">
                <h3>${escaparHTML(d.nombre)}</h3>
                <p class="profesor-cargo">${escaparHTML(d.descripcion)}</p>
            </div>`).join('');
    })
    .catch(() => mostrarEstado(lista, MENSAJE_ERROR, { error: true }));
