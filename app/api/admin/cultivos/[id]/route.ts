import { manejadoresDe } from '@/lib/colecciones';

const { editar, borrar } = manejadoresDe('cultivos');
export { editar as PUT, borrar as DELETE };
