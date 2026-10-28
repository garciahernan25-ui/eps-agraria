import { manejadoresDe } from '@/lib/colecciones';

const { editar, borrar } = manejadoresDe('docentes');
export { editar as PUT, borrar as DELETE };
