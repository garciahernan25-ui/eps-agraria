'use client';
// Campos de archivos del panel. Los archivos se previsualizan al elegirlos y se suben al guardar.
// Si se subieron pero no se guardó el formulario, se descartan al cerrarlo.
import { useEffect, useRef, useState } from 'react';
import { ACEPTA_FOTOS, ACEPTA_MEDIOS, type Carpeta } from '@/lib/compartido/formatos';
import { srcDe } from '@/lib/compartido/paginas';
import type { Medio, TipoMedio } from '@/lib/compartido/tipos';
import { descartarArchivo, subirArchivo, validarArchivo } from './subir';

type Progreso = (texto: string) => void;

// Libera las vistas previas y descarta lo que se subió sin guardar.
function useLimpieza() {
    const subidas = useRef<string[]>([]);
    const previas = useRef<string[]>([]);
    return {
        subidas,
        previas,
        cerrar(guardado: boolean) {
            previas.current.forEach(URL.revokeObjectURL);
            if (!guardado) subidas.current.forEach(descartarArchivo);
        },
    };
}

// ---------- Una foto ----------

export function useCampoFoto(urlActual: string | null, carpeta: Carpeta, alError: (m: string) => void) {
    const [url, setUrl] = useState(urlActual);
    const [archivo, setArchivo] = useState<{ file: File; previa: string } | null>(null);
    const limpieza = useLimpieza();

    async function elegir(file: File | undefined) {
        if (!file) return;
        try {
            await validarArchivo(file, { soloFotos: true });
        } catch (err) {
            alError((err as Error).message);
            return;
        }
        alError('');
        const previa = URL.createObjectURL(file);
        limpieza.previas.current.push(previa);
        setArchivo({ file, previa });
    }

    return {
        vista: archivo?.previa ?? (url ? srcDe(url) : null),
        elegir,
        quitar: () => { setArchivo(null); setUrl(null); },
        // Sube la foto nueva (si hay) y devuelve la URL final.
        async valor(progreso: Progreso): Promise<string | null> {
            if (!archivo) return url;
            const subida = await subirArchivo(archivo.file, carpeta, {
                soloFotos: true,
                alProgreso: p => progreso(`Subiendo foto: ${Math.round(p)}%`),
            });
            limpieza.subidas.current.push(subida.url);
            setArchivo(null);
            setUrl(subida.url); // si falla el guardado, no se vuelve a subir
            return subida.url;
        },
        cerrar: limpieza.cerrar,
    };
}

export function CampoFoto({ control, etiqueta = 'Foto' }: { control: ReturnType<typeof useCampoFoto>; etiqueta?: string }) {
    const entrada = useRef<HTMLInputElement>(null);
    return (
        <div className="campo">
            <span>{etiqueta}</span>
            <div className="foto-campo">
                {control.vista ? <img src={control.vista} alt="Vista previa" /> : <div className="foto-vacia">Sin foto</div>}
                <div className="foto-campo__botones">
                    <label className="btn btn-secundario selector-archivo">
                        {control.vista ? 'Cambiar foto' : 'Elegir foto'}
                        <input ref={entrada} type="file" accept={ACEPTA_FOTOS}
                               onChange={e => { control.elegir(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                    {control.vista && <button type="button" className="btn btn-secundario btn-chico" onClick={control.quitar}>Quitar foto</button>}
                </div>
            </div>
            <small>JPG, PNG, WEBP o GIF, hasta 10 MB. La foto se sube al tocar &quot;Guardar&quot;.</small>
        </div>
    );
}

// ---------- Fotos y videos de una publicación ----------

interface Item {
    clave: string;
    tipo: TipoMedio;
    url?: string;                          // ya subido
    archivo?: { file: File; previa: string }; // nuevo
}

let siguienteClave = 0;
const nuevaClave = () => `m${siguienteClave++}`;

export function useMedios(iniciales: Medio[], alError: (m: string) => void) {
    const [items, setItems] = useState<Item[]>(() => iniciales.map(m => ({ clave: nuevaClave(), url: m.url, tipo: m.tipo })));
    const limpieza = useLimpieza();
    const actuales = useRef(items);
    useEffect(() => { actuales.current = items; }, [items]);

    async function agregar(archivos: FileList | null) {
        const errores: string[] = [];
        const nuevos: Item[] = [];
        for (const file of Array.from(archivos ?? [])) {
            try {
                const tipo = await validarArchivo(file);
                const previa = URL.createObjectURL(file);
                limpieza.previas.current.push(previa);
                nuevos.push({ clave: nuevaClave(), tipo, archivo: { file, previa } });
            } catch (err) {
                errores.push((err as Error).message);
            }
        }
        alError(errores.join(' '));
        setItems(lista => [...lista, ...nuevos]);
    }

    function mover(i: number, paso: number) {
        setItems(lista => {
            const copia = [...lista];
            [copia[i], copia[i + paso]] = [copia[i + paso], copia[i]];
            return copia;
        });
    }

    return {
        items,
        agregar,
        mover,
        quitar: (i: number) => setItems(lista => lista.filter((_, j) => j !== i)),
        // Sube los archivos nuevos (uno por uno, mostrando el avance) y devuelve la lista final.
        async valor(progreso: Progreso): Promise<Medio[]> {
            const lista = [...actuales.current];
            const pendientes = lista.filter(m => m.archivo);
            let n = 0;
            for (const m of pendientes) {
                n++;
                const { url } = await subirArchivo(m.archivo!.file, 'publicaciones', {
                    alProgreso: p => progreso(`Subiendo ${n} de ${pendientes.length}: ${Math.round(p)}%`),
                });
                limpieza.subidas.current.push(url);
                Object.assign(m, { url, archivo: undefined }); // si falla el guardado, no se vuelve a subir
            }
            setItems(lista);
            progreso('');
            return lista.map(m => ({ url: m.url!, tipo: m.tipo }));
        },
        cerrar: limpieza.cerrar,
    };
}

export function CampoMedios({ control }: { control: ReturnType<typeof useMedios> }) {
    const { items } = control;
    return (
        <div className="campo">
            <span>Fotos y videos</span>
            <label className="btn btn-secundario selector-archivo">
                + Agregar fotos o videos
                <input type="file" accept={ACEPTA_MEDIOS} multiple onChange={e => { control.agregar(e.target.files); e.target.value = ''; }} />
            </label>
            <small>Fotos JPG, PNG, WEBP o GIF (hasta 10 MB) y videos MP4, WEBM o MOV (hasta 200 MB). Se suben al guardar.</small>
            <div className="medios-lista">
                {items.length === 0 && <p className="panel-ayuda">Todavía no agregaste fotos ni videos.</p>}
                {items.map((m, i) => {
                    const src = m.archivo ? m.archivo.previa : m.url!;
                    return (
                        <div className="medio" key={m.clave}>
                            {m.tipo === 'video'
                                ? <video src={src} controls preload="metadata" playsInline muted />
                                : <img src={src} alt="" />}
                            <div className="medio__info">
                                {m.archivo ? <><span className="medio__nuevo">Nuevo</span> · {m.archivo.file.name}</> : (m.tipo === 'video' ? 'Video' : 'Foto')}
                            </div>
                            <div className="medio__acciones">
                                <button type="button" className="btn btn-secundario btn-icono" disabled={i === 0} aria-label="Mover antes" onClick={() => control.mover(i, -1)}>←</button>
                                <button type="button" className="btn btn-peligro btn-chico" onClick={() => control.quitar(i)}>Quitar</button>
                                <button type="button" className="btn btn-secundario btn-icono" disabled={i === items.length - 1} aria-label="Mover después" onClick={() => control.mover(i, 1)}>→</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
