// Secciones donde puede aparecer una publicación. Para agregar una nueva,
// sumala acá; si tiene página propia, agregale `seccion` en lib/compartido/paginas.ts
// y sus publicaciones aparecen solas al final de esa página.
export const SECCIONES = [
    { id: 'salidas', nombre: 'Salidas educativas', pagina: 'excursiones.html' },
    { id: 'actividades', nombre: 'Otras actividades', pagina: 'otras actividades.html' },
    { id: 'cursos', nombre: 'Cursos', pagina: 'cursos.html' },
    { id: 'huerta', nombre: 'Huerta', pagina: 'paso apaso huerta.html' },
    { id: 'biopreparados', nombre: 'Biopreparados', pagina: 'biopreparados.html' },
    { id: 'cea34', nombre: 'C.E.A 34', pagina: 'cea 34.html' },
    { id: 'general', nombre: 'General', pagina: null },
] as const;

export type IdSeccion = (typeof SECCIONES)[number]['id'];

export function seccionValida(id: unknown): id is IdSeccion {
    return SECCIONES.some(s => s.id === id);
}

export function buscarSeccion(id: string) {
    return SECCIONES.find(s => s.id === id);
}
