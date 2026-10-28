// Panel docente.
import type { Metadata } from 'next';
import { Encabezado } from '@/components/Sitio';
import { Panel } from '@/components/admin/Panel';

export const metadata: Metadata = {
    title: 'Panel docente - E.P.S Agraria n°1 Alte. Brown',
    robots: { index: false, follow: false },
};

export default function PaginaPanel() {
    return (
        <>
            <link rel="stylesheet" href="/css/admin.css" precedence="pagina" />
            <Encabezado />
            <main className="contenedor panel">
                <h1>Panel docente</h1>
                <Panel />
            </main>
            <footer>
                <div className="footer-contenido">
                    <p>&copy; 2025, E.P.S Agraria n°1/C.E.A 34 Alte.Brown</p>
                </div>
            </footer>
        </>
    );
}
