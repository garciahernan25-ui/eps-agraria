import { manejadoresDe } from '@/lib/colecciones';

const { listar, crear } = manejadoresDe('docentes');
export { listar as GET, crear as POST };
