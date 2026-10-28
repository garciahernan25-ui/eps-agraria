import { manejadoresDe } from '@/lib/colecciones';

const { editar, borrar } = manejadoresDe('inicio');
export { editar as PUT, borrar as DELETE };
