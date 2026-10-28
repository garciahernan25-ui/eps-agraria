import { TestVocacional } from '@/components/test/TestVocacional';
import { INSTAGRAM } from '@/components/Sitio';

const MENU = [
    ['cultivos.html', 'cultivos'], ['biopreparados.html', 'biopreparados'], ['nosotros.html', 'NOSOTROS'],
    ['novedades.html', 'Novedades'], ['galeria.html', 'Galería'],
];

export default function PaginaTestVocacional() {
    return (
        <>
            <header className="header">
                <a href="/"><img className="header__logo" src="/img/Horticultura.jpg" alt="logotipo" /></a>
            </header>
            <nav className="navegacion">
                {MENU.map(([href, texto]) => <a key={href} className="navegacion__enlace" href={`/${href}`}>{texto}</a>)}
            </nav>

            <TestVocacional />

            <footer>
                <div className="footer-contenido">
                    <a href="#inicio" className="btn-inicio">Volver al Inicio</a>
                    <p>&copy; 2025, E.P.S Agraria n°1/C.E.A 34 Alte.Brown</p>
                    <div className="redes-sociales">
                        <a href={INSTAGRAM} target="_blank" rel="noopener" aria-label="Síguenos en Instagram">
                            <i className="fab fa-instagram"></i>
                        </a>
                        <p>¡Seguinos en nuestro instagram!</p>
                    </div>
                </div>
            </footer>
        </>
    );
}
