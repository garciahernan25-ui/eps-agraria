'use client';
// Ventana de formulario (crear/editar). Se abre al montarse y avisa al cerrarse
// si se guardó o no (para descartar archivos subidos que no se usaron).
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
    titulo: string;
    textoGuardar?: string;
    // Puede lanzar un Error: se muestra en la ventana y no se cierra.
    onGuardar: (form: HTMLFormElement) => Promise<void>;
    onCerrar: (guardado: boolean) => void;
    error?: string;           // errores de los campos (por ejemplo, un archivo inválido)
    children: ReactNode;
}

export function Modal({ titulo, textoGuardar = 'Guardar', onGuardar, onCerrar, error, children }: Props) {
    const dialogo = useRef<HTMLDialogElement>(null);
    const guardado = useRef(false);
    const [errorGuardar, setErrorGuardar] = useState('');
    const [guardando, setGuardando] = useState(false);
    // El aviso de un campo (por ejemplo, un archivo inválido) se borra al tocar Guardar.
    const [ocultarErrorCampo, setOcultarErrorCampo] = useState(false);

    useEffect(() => {
        const d = dialogo.current;
        if (d && !d.open) d.showModal();
    }, []);

    useEffect(() => { setOcultarErrorCampo(false); }, [error]);

    async function enviar(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        if (!form.reportValidity()) return;
        setErrorGuardar('');
        setOcultarErrorCampo(true);
        setGuardando(true);
        try {
            await onGuardar(form);
            guardado.current = true;
            dialogo.current?.close();
        } catch (err) {
            setErrorGuardar((err as Error).message);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <dialog className="modal" ref={dialogo} onClose={() => onCerrar(guardado.current)}>
            <form className="modal__form" noValidate onSubmit={enviar}>
                <header className="modal__encabezado">
                    <h2>{titulo}</h2>
                    <button type="button" className="modal__cerrar" aria-label="Cerrar" onClick={() => dialogo.current?.close()}>&times;</button>
                </header>
                <div className="modal__cuerpo">{children}</div>
                <p className="panel-error" role="alert">{errorGuardar || (ocultarErrorCampo ? '' : error)}</p>
                {/* div y no footer: styles.css les da fondo verde a todos los <footer> */}
                <div className="modal__pie">
                    <button type="button" className="btn btn-secundario" onClick={() => dialogo.current?.close()}>Cancelar</button>
                    <button type="submit" className="btn btn-principal" disabled={guardando}>{textoGuardar}</button>
                </div>
            </form>
        </dialog>
    );
}

// Campo de texto o área de texto con su etiqueta.
export function Campo({ nombre, etiqueta, valor = '', requerido = false, area = false, tipo = 'text', ayuda, ...extra }: {
    nombre: string; etiqueta: string; valor?: string; requerido?: boolean; area?: boolean; tipo?: string; ayuda?: string;
} & Record<string, unknown>) {
    const id = `campo-${nombre}`;
    return (
        <div className="campo">
            <label htmlFor={id}>{etiqueta}{requerido ? ' *' : ''}</label>
            {area
                ? <textarea id={id} name={nombre} defaultValue={valor} required={requerido} {...extra} />
                : <input type={tipo} id={id} name={nombre} defaultValue={valor} required={requerido} {...extra} />}
            {ayuda && <small>{ayuda}</small>}
        </div>
    );
}
