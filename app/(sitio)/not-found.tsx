import { Sitio, Estado } from '@/components/Sitio';

export default function NoEncontrada() {
    return (
        <Sitio>
            <h1>Página no encontrada</h1>
            <Estado>La página que buscás no existe o cambió de lugar. <a href="/" className="paginacion__boton">Ir al inicio</a></Estado>
        </Sitio>
    );
}
