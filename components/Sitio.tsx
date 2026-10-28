// Estructura común de las páginas: encabezado con el logo, menú, contenido y pie.
// Los enlaces son <a> comunes (no <Link>): cada página carga su propio CSS y así no se mezclan.
import type { ReactNode } from 'react';

const MENU = [
    { href: 'cultivos.html', texto: 'Cultivos' },
    { href: 'biopreparados.html', texto: 'biopreparados' },
    { href: 'nosotros.html', texto: 'NOSOTROS' },
    { href: 'novedades.html', texto: 'Novedades' },
    { href: 'galeria.html', texto: 'Galería' },
];

export const INSTAGRAM = 'https://www.instagram.com/epsagraria/';

export function Encabezado({ menuActivo }: { menuActivo?: string }) {
    return (
        <>
            <header className="header">
                <a href="/">
                    <img className="header__logo" src="/img/Horticultura.jpg" alt="logotipo" />
                </a>
            </header>
            <nav className="navegacion">
                {MENU.map(({ href, texto }) => (
                    <a key={href} className={`navegacion__enlace${href === menuActivo ? ' navegacion__enlace--activo' : ''}`} href={`/${href}`}>
                        {texto}
                    </a>
                ))}
            </nav>
        </>
    );
}

export function Pie() {
    return (
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
    );
}

// Página completa: encabezado + <main class="contenedor"> + pie.
export function Sitio({ menuActivo, children, cssExtra }: { menuActivo?: string; children: ReactNode; cssExtra?: string }) {
    return (
        <>
            {/* React ubica esta hoja de estilos en el <head> */}
            {cssExtra && <link rel="stylesheet" href={cssExtra} precedence="pagina" />}
            <Encabezado menuActivo={menuActivo} />
            <main className="contenedor">{children}</main>
            <Pie />
        </>
    );
}

// Mensaje de "vacío" o de error dentro del contenido.
export function Estado({ children, error = false }: { children: ReactNode; error?: boolean }) {
    return <p className={`estado-carga${error ? ' estado-carga--error' : ''}`}>{children}</p>;
}
