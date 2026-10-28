// Inicio: arriba, el carrusel con lo último de Instagram (solo si hay posteos sincronizados);
// abajo, las tarjetas que se editan en el panel (pestaña Inicio).
import { Sitio } from '@/components/Sitio';
import { CarruselInstagram } from '@/components/Galeria';
import { GrillaDeTarjetas } from '@/components/Tarjetas';
import { postsDeInstagram, tarjetasDeInicio } from '@/lib/datos';

export default async function Inicio() {
    const [tarjetas, instagram] = await Promise.all([tarjetasDeInicio(), postsDeInstagram(1)]);
    return (
        <Sitio>
            <h1>Educación profesional secundaria</h1>
            {instagram.posts.length > 0 && <CarruselInstagram posts={instagram.posts} />}
            <GrillaDeTarjetas tarjetas={tarjetas.map(t => ({ clave: t.id, enlace: t.enlace, imagen: t.imagen, titulo: t.titulo }))} />
        </Sitio>
    );
}
