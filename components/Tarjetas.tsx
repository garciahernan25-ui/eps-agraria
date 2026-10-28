// Grilla de tarjetas con foto (inicio y cultivos), con el mismo HTML que tenía el sitio.
import { hrefDe, srcDe } from '@/lib/compartido/paginas';
import { Estado } from './Sitio';

export interface Tarjeta {
    clave: string | number;
    enlace: string;
    imagen: string | null;
    titulo: string;
}

export function GrillaDeTarjetas({ tarjetas }: { tarjetas: Tarjeta[] }) {
    return (
        <div className="grid">
            {tarjetas.length === 0 && <Estado>Todavía no hay nada cargado.</Estado>}
            {tarjetas.map(t => {
                const externo = /^https:\/\//.test(t.enlace);
                return (
                    <div className="producto" key={t.clave}>
                        <a href={hrefDe(t.enlace)} {...(externo ? { target: '_blank', rel: 'noopener' } : {})}>
                            {t.imagen && <img className="producto__imagen" src={srcDe(t.imagen)} alt={t.titulo} loading="lazy" />}
                            <div className="producto__informacion">
                                <p className="producto__nombre">{t.titulo}</p>
                                <p className="producto__precio"></p>
                            </div>
                        </a>
                    </div>
                );
            })}
        </div>
    );
}
