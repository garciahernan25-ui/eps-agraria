// Listas ordenables con foto del panel: cultivos, docentes y tarjetas de inicio.
// Arma los manejadores para listar, crear, editar, borrar y reordenar.
// Los nombres de tabla y columnas vienen de acá, nunca del cliente.
import { db, fila, filas } from './db';
import { exigirDocente } from './auth';
import { borrarSiNoSeUsan, urlArchivoValida } from './archivos';
import { ErrorHttp, leerJSON, responder, ruta, type ConParams } from './http';
import { crearSlug, idValido, texto } from './util';

interface Campo {
    max: number;
    requerido?: boolean;
    etiqueta?: string;
}

interface Coleccion {
    tabla: string;
    imagen: string;                                   // columna con la foto
    campos: Record<string, Campo>;
    validar?: (datos: Record<string, string | null>) => string | null;
    alCrear?: (datos: Record<string, string | null>) => Promise<Record<string, string>>;
}

const COLECCIONES = {
    cultivos: {
        tabla: 'cultivos',
        imagen: 'imagen',
        campos: {
            nombre: { max: 100, requerido: true, etiqueta: 'el nombre' },
            nombre_vulgar: { max: 300 },
            nombre_cientifico: { max: 200 },
            origen: { max: 1000 },
            caracteristicas: { max: 3000 },
            siembra: { max: 3000 },
            cosecha: { max: 3000 },
        },
        // El slug se arma con el nombre al crear y no cambia después (es la URL de la ficha).
        alCrear: async ({ nombre }) => {
            const base = crearSlug(nombre ?? '');
            let slug = base;
            for (let n = 2; await fila('SELECT 1 FROM cultivos WHERE slug = ?', [slug]); n++) slug = `${base}-${n}`;
            return { slug };
        },
    },
    docentes: {
        tabla: 'docentes',
        imagen: 'foto',
        campos: {
            nombre: { max: 100, requerido: true, etiqueta: 'el nombre' },
            descripcion: { max: 300 },
        },
    },
    inicio: {
        tabla: 'inicio_tarjetas',
        imagen: 'imagen',
        campos: {
            titulo: { max: 100, requerido: true, etiqueta: 'el título' },
            enlace: { max: 300, requerido: true, etiqueta: 'el enlace' },
        },
        // Una página del sitio ("cursos.html") o una dirección de otro sitio (https://...).
        validar: ({ enlace }) =>
            /^[\w .%()-]+\.html(\?[\w=&.%-]*)?$/i.test(enlace ?? '') || /^https:\/\/[^\s"'<>]+$/.test(enlace ?? '') || enlace === '/'
                ? null
                : 'El enlace tiene que ser una página del sitio (por ejemplo "cursos.html") o empezar con https://',
    },
} satisfies Record<string, Coleccion>;

export type NombreColeccion = keyof typeof COLECCIONES;

function leer(c: Coleccion, cuerpo: Record<string, unknown>) {
    const datos: Record<string, string | null> = {};
    for (const [columna, { max, requerido, etiqueta }] of Object.entries(c.campos)) {
        datos[columna] = texto(cuerpo[columna], max);
        if (requerido && !datos[columna]) throw new ErrorHttp(400, `Falta ${etiqueta}.`);
    }
    const imagen = cuerpo[c.imagen] || null;
    if (imagen !== null && !urlArchivoValida(imagen, { delSitio: true })) throw new ErrorHttp(400, 'La foto no es válida. Volvé a subirla.');
    datos[c.imagen] = imagen;
    const error = c.validar?.(datos);
    if (error) throw new ErrorHttp(400, error);
    return datos;
}

type ConId = ConParams<{ id: string }>;

export function manejadoresDe(nombre: NombreColeccion) {
    const c: Coleccion = COLECCIONES[nombre];
    const columnas = Object.keys(c.campos);
    const imagenDe = (id: number) => fila<{ imagen: string | null }>(`SELECT ${c.imagen} AS imagen FROM ${c.tabla} WHERE id = ?`, [id]);

    return {
        listar: ruta(async () => {
            await exigirDocente();
            return responder(await filas(`SELECT * FROM ${c.tabla} ORDER BY orden, id`));
        }),

        crear: ruta(async (req) => {
            const usuario = await exigirDocente();
            const datos = leer(c, await leerJSON(req));
            Object.assign(datos, await c.alCrear?.(datos));
            const nombres = Object.keys(datos);
            const { lastInsertRowid } = await db.execute({
                sql: `INSERT INTO ${c.tabla} (${nombres.join(', ')}, autor_id, orden)
                      VALUES (${nombres.map(() => '?').join(', ')}, ?, (SELECT COALESCE(MAX(orden), 0) + 1 FROM ${c.tabla}))`,
                args: [...Object.values(datos), usuario.id],
            });
            return responder({ ok: true, id: Number(lastInsertRowid) }, 201);
        }),

        editar: ruta<ConId>(async (req, { params }) => {
            const usuario = await exigirDocente();
            const id = idValido((await params).id);
            const datos = leer(c, await leerJSON(req));
            const anterior = id ? await imagenDe(id) : undefined;
            if (!id || !anterior) throw new ErrorHttp(404, 'Ya no existe. Recargá la lista.');

            const asignaciones = [...columnas, c.imagen].map(col => `${col} = ?`).join(', ');
            await db.execute({
                sql: `UPDATE ${c.tabla} SET ${asignaciones}, autor_id = ?, actualizado_en = datetime('now') WHERE id = ?`,
                args: [...columnas.map(col => datos[col]), datos[c.imagen], usuario.id, id],
            });
            // Si se cambió la foto, la vieja se borra de Blob (si nadie más la usa).
            if (anterior.imagen !== datos[c.imagen]) await borrarSiNoSeUsan([anterior.imagen]);
            return responder({ ok: true });
        }),

        borrar: ruta<ConId>(async (_req, { params }) => {
            await exigirDocente();
            const id = idValido((await params).id);
            if (!id) throw new ErrorHttp(404, 'Ya no existe. Recargá la lista.');
            const anterior = await imagenDe(id);
            await db.execute({ sql: `DELETE FROM ${c.tabla} WHERE id = ?`, args: [id] });
            await borrarSiNoSeUsan([anterior?.imagen]);
            return responder({ ok: true });
        }),

        // Recibe { ids: [3, 1, 2] } con el orden nuevo completo.
        ordenar: ruta(async (req) => {
            const usuario = await exigirDocente();
            const { ids } = await leerJSON(req, 50_000);
            const lista = Array.isArray(ids) ? ids.map(idValido) : [];
            if (!lista.length || lista.includes(null)) throw new ErrorHttp(400, 'Orden inválido.');
            await db.batch(lista.map((id, orden) => ({
                sql: `UPDATE ${c.tabla} SET orden = ?, autor_id = ? WHERE id = ?`,
                args: [orden, usuario.id, id],
            })), 'write');
            return responder({ ok: true });
        }),
    };
}
