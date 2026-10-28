// Inicio: las tarjetas se editan en el panel (pestaña Inicio).
import { Sitio } from '@/components/Sitio';
import { GrillaDeTarjetas } from '@/components/Tarjetas';
import { tarjetasDeInicio } from '@/lib/datos';

export default async function Inicio() {
    const tarjetas = await tarjetasDeInicio();
    return (
        <Sitio>
            <h1>Educación profesional secundaria</h1>
            <GrillaDeTarjetas tarjetas={tarjetas.map(t => ({ clave: t.id, enlace: t.enlace, imagen: t.imagen, titulo: t.titulo }))} />
        </Sitio>
    );
}
