import { manejadoresDe } from '@/lib/colecciones';

const { listar, crear } = manejadoresDe('inicio');
export { listar as GET, crear as POST };
