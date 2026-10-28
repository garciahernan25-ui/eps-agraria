// Experiencias de estudiantes (públicas y moderadas) y buzón confidencial.
import { Sitio } from '@/components/Sitio';
import { Estudiantes } from '@/components/Estudiantes';
import { experienciasAprobadas } from '@/lib/datos';

export default async function PaginaEstudiantes() {
    return (
        <Sitio>
            <Estudiantes experiencias={await experienciasAprobadas()} />
        </Sitio>
    );
}
