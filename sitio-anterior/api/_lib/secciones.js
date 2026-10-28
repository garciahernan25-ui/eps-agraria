// Secciones donde puede aparecer una publicación. Para agregar una nueva,
// sumala acá; si tiene página propia, poné en esa página
// <section class="publicaciones" data-publicaciones="<id>"></section>
// y el script js/publicaciones.js la completa solo.
export const SECCIONES = [
    { id: 'salidas', nombre: 'Salidas educativas', pagina: 'excursiones.html' },
    { id: 'actividades', nombre: 'Otras actividades', pagina: 'otras actividades.html' },
    { id: 'cursos', nombre: 'Cursos', pagina: 'cursos.html' },
    { id: 'huerta', nombre: 'Huerta', pagina: 'paso apaso huerta.html' },
    { id: 'biopreparados', nombre: 'Biopreparados', pagina: 'biopreparados.html' },
    { id: 'cea34', nombre: 'C.E.A 34', pagina: 'cea 34.html' },
    { id: 'general', nombre: 'General', pagina: null },
];

export function seccionValida(id) {
    return SECCIONES.some(s => s.id === id);
}
