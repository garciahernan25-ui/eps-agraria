// Grilla de cultivos: se editan en el panel (pestaña Cultivos).
import { Sitio } from '@/components/Sitio';
import { GrillaDeTarjetas } from '@/components/Tarjetas';
import { listaDeCultivos } from '@/lib/datos';

export default async function Cultivos() {
    const cultivos = await listaDeCultivos();
    return (
        <Sitio menuActivo="cultivos.html">
            <h1>Nuestro cultivos</h1>
            <GrillaDeTarjetas tarjetas={cultivos.map(c => ({
                clave: c.id,
                enlace: `cultivo.html?slug=${encodeURIComponent(c.slug)}`,
                imagen: c.imagen,
                titulo: c.nombre,
            }))} />
        </Sitio>
    );
}
