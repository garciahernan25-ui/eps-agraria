'use client';
// Panel docente: login, pestañas y avisos. Cada pestaña es un componente aparte.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { Usuario } from '@/lib/compartido/tipos';
import { api, cuandoVenzaLaSesion } from './api';
import { ContextoAviso, ContextoUsuario } from './comun';
import { Campo, Modal } from './Modal';
import { VistaPublicaciones } from './VistaPublicaciones';
import { VistaColeccion } from './VistaColeccion';
import { VistaPaginas, cambiosSinGuardar } from './VistaPaginas';
import { VistaBuzon, VistaExperiencias } from './VistaEstudiantes';
import { VistaInstagram } from './VistaInstagram';
import { VistaUsuarios } from './VistaUsuarios';

const PESTAÑAS = [
    { id: 'publicaciones', texto: 'Publicaciones' },
    { id: 'cultivos', texto: 'Cultivos' },
    { id: 'docentes', texto: 'Docentes' },
    { id: 'paginas', texto: 'Páginas' },
    { id: 'inicio', texto: 'Inicio' },
    { id: 'experiencias', texto: 'Experiencias' },
    { id: 'consultas', texto: 'Buzón' },
    { id: 'instagram', texto: 'Instagram', soloAdmin: true },
    { id: 'usuarios', texto: 'Usuarios', soloAdmin: true },
] as const;

type IdPestaña = (typeof PESTAÑAS)[number]['id'];

function Vista({ id }: { id: IdPestaña }) {
    switch (id) {
        case 'publicaciones': return <VistaPublicaciones />;
        case 'cultivos': case 'docentes': case 'inicio': return <VistaColeccion key={id} clave={id} />;
        case 'paginas': return <VistaPaginas />;
        case 'experiencias': return <VistaExperiencias />;
        case 'consultas': return <VistaBuzon />;
        case 'instagram': return <VistaInstagram />;
        case 'usuarios': return <VistaUsuarios />;
    }
}

function Login({ alEntrar }: { alEntrar: (u: Usuario) => void }) {
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    async function entrar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const valor = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value;
        setError('');
        setEnviando(true);
        try {
            await api('/api/admin/login', 'POST', { email: valor('email'), password: valor('password') });
            const { usuario } = await api<{ usuario: Usuario }>('/api/admin/sesion');
            form.reset();
            alEntrar(usuario);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <form className="panel-login" onSubmit={entrar}>
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" autoComplete="username" required />
            <label htmlFor="password">Contraseña</label>
            <input type="password" id="password" name="password" autoComplete="current-password" required />
            <button type="submit" className="btn btn-principal" disabled={enviando}>Ingresar</button>
            <p className="panel-error" role="alert">{error}</p>
            <p className="panel-ayuda">¿No tenés cuenta o te olvidaste la contraseña? Pedísela a un administrador del sitio.</p>
        </form>
    );
}

function CambiarMiContrasena({ alCerrar, avisar }: { alCerrar: () => void; avisar: (m: string) => void }) {
    return (
        <Modal titulo="Cambiar mi contraseña" textoGuardar="Cambiar" onCerrar={alCerrar}
               onGuardar={async (form) => {
                   const valor = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value;
                   if (valor('nueva') !== valor('repetir')) throw new Error('Las contraseñas nuevas no coinciden.');
                   await api('/api/admin/mi-contrasena', 'POST', { actual: valor('actual'), nueva: valor('nueva') });
                   avisar('Tu contraseña se cambió. Las sesiones abiertas en otros dispositivos se cerraron.');
               }}>
            <Campo nombre="actual" etiqueta="Contraseña actual" tipo="password" requerido autoComplete="current-password" />
            <Campo nombre="nueva" etiqueta="Contraseña nueva" tipo="password" requerido minLength={8} autoComplete="new-password" ayuda="Al menos 8 caracteres." />
            <Campo nombre="repetir" etiqueta="Repetí la contraseña nueva" tipo="password" requerido minLength={8} autoComplete="new-password" />
        </Modal>
    );
}

export function Panel() {
    // undefined = todavía no se sabe si hay sesión
    const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
    const [pestaña, setPestaña] = useState<IdPestaña>('publicaciones');
    const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);
    const [cambiandoClave, setCambiandoClave] = useState(false);
    const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

    const avisar = useCallback((texto: string, { error = false } = {}) => {
        clearTimeout(temporizador.current);
        setAviso({ texto, error });
        if (!error) temporizador.current = setTimeout(() => setAviso(null), 6000);
    }, []);

    useEffect(() => {
        cuandoVenzaLaSesion(() => setUsuario(null));
        api<{ usuario: Usuario | null }>('/api/admin/sesion').then(r => setUsuario(r.usuario)).catch(() => setUsuario(null));
        // La pestaña queda en la dirección (#cultivos) para volver al recargar.
        const inicial = location.hash.slice(1);
        if (PESTAÑAS.some(p => p.id === inicial)) setPestaña(inicial as IdPestaña);
    }, []);

    function elegir(id: IdPestaña) {
        if (cambiosSinGuardar.hay && !confirm('Hay cambios sin guardar en la página. ¿Salir igual?')) return;
        setAviso(null);
        setPestaña(id);
        history.replaceState(null, '', `#${id}`);
    }

    async function salir() {
        if (cambiosSinGuardar.hay && !confirm('Hay cambios sin guardar. ¿Cerrar sesión igual?')) return;
        await api('/api/admin/logout', 'POST').catch(() => {});
        setUsuario(null);
    }

    if (usuario === undefined) return <p className="panel-vacio">Cargando…</p>;
    if (!usuario) return <Login alEntrar={setUsuario} />;

    const esAdmin = usuario.rol === 'admin';
    const actual = PESTAÑAS.find(p => p.id === pestaña && (!('soloAdmin' in p) || esAdmin))?.id ?? 'publicaciones';

    return (
        <ContextoUsuario.Provider value={usuario}>
            <ContextoAviso.Provider value={avisar}>
                <section>
                    <div className="panel-usuario">
                        <span>Hola, <strong>{usuario.nombre}</strong>{' '}
                            <span className={`etiqueta${esAdmin ? ' etiqueta--admin' : ''}`}>{esAdmin ? 'Administrador' : 'Docente'}</span>
                        </span>
                        <button type="button" className="btn btn-secundario" onClick={() => setCambiandoClave(true)}>Cambiar mi contraseña</button>
                        <button type="button" className="btn btn-secundario" onClick={salir}>Cerrar sesión</button>
                    </div>

                    <div className="panel-tabs" role="tablist" aria-label="Secciones del panel">
                        {PESTAÑAS.filter(p => !('soloAdmin' in p) || esAdmin).map(p => (
                            <button key={p.id} type="button" role="tab" className="panel-tab" aria-selected={p.id === actual}
                                    data-tab={p.id} onClick={() => elegir(p.id)}>{p.texto}</button>
                        ))}
                    </div>

                    {aviso && <div className={`panel-aviso${aviso.error ? ' panel-aviso--error' : ''}`} role="status" id="aviso">{aviso.texto}</div>}
                    <div className="panel-vista" id="vista" role="tabpanel"><Vista key={actual} id={actual} /></div>
                </section>
                {cambiandoClave && <CambiarMiContrasena alCerrar={() => setCambiandoClave(false)} avisar={avisar} />}
            </ContextoAviso.Provider>
        </ContextoUsuario.Provider>
    );
}
