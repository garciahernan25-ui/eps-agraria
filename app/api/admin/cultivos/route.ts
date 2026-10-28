import { manejadoresDe } from '@/lib/colecciones';

const { listar, crear } = manejadoresDe('cultivos');
export { listar as GET, crear as POST };
