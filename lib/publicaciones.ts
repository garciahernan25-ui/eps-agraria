// Validación de lo que manda el formulario de publicaciones del panel.
import type { InStatement } from '@libsql/client';
import { urlArchivoValida } from './archivos';
import { ErrorHttp } from './http';
import { texto } from './util';
import { seccionValida } from './compartido/secciones';
import type { Medio } from './compartido/tipos';

const MAX_MEDIOS = 30;

export interface DatosPublicacion {
    titulo: string;
    texto: string;
    seccion: string;
    publicada: number;
    medios: Medio[];
}

export function leerPublicacion(cuerpo: Record<string, unknown>): DatosPublicacion {
    const titulo = texto(cuerpo.titulo, 200);
    const medios = Array.isArray(cuerpo.medios) ? cuerpo.medios as Partial<Medio>[] : [];

    if (!titulo) throw new ErrorHttp(400, 'Falta el título.');
    if (!seccionValida(cuerpo.seccion)) throw new ErrorHttp(400, 'Elegí una sección.');
    if (medios.length > MAX_MEDIOS) throw new ErrorHttp(400, `Como máximo ${MAX_MEDIOS} fotos o videos por publicación.`);
    for (const m of medios) {
        if (!(m?.tipo === 'foto' || m?.tipo === 'video') || !urlArchivoValida(m?.url)) {
            throw new ErrorHttp(400, 'Hay un archivo inválido. Volvé a subirlo.');
        }
    }
    return {
        titulo,
        texto: texto(cuerpo.texto, 10000),
        seccion: cuerpo.seccion,
        publicada: cuerpo.publicada === false ? 0 : 1,
        medios: medios.map(m => ({ url: m.url!, tipo: m.tipo! })),
    };
}

export function insertarMedios(id: number, medios: Medio[]): InStatement[] {
    return medios.map((m, orden) => ({
        sql: 'INSERT INTO publicacion_medios (publicacion_id, url, tipo, orden) VALUES (?, ?, ?, ?)',
        args: [id, m.url, m.tipo, orden],
    }));
}
