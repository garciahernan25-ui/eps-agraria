'use client';
// Pestaña Usuarios (solo admin): crear cuentas, activar/desactivar, cambiar rol y resetear contraseñas.
import { useState } from 'react';
import type { UsuarioListado } from '@/lib/compartido/tipos';
import { api } from './api';
import { BotonAccion, Cargando, EncabezadoVista, useAviso, useDatos, useUsuario } from './comun';
import { Campo, Modal } from './Modal';

function FormularioCuenta({ alCrear, alCerrar }: { alCrear: (email: string, contrasena: string) => void; alCerrar: () => void }) {
    return (
        <Modal titulo="Nueva cuenta" textoGuardar="Crear cuenta" onCerrar={alCerrar}
               onGuardar={async (form) => {
                   const valor = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value;
                   const { contrasena } = await api<{ contrasena: string }>('/api/admin/usuarios', 'POST', {
                       nombre: valor('nombre'), email: valor('email'), rol: valor('rol'),
                   });
                   alCrear(valor('email').trim().toLowerCase(), contrasena);
               }}>
            <Campo nombre="nombre" etiqueta="Nombre y apellido" requerido maxLength={100} />
            <Campo nombre="email" etiqueta="Email" tipo="email" requerido maxLength={200} autoComplete="off" />
            <div className="campo">
                <label htmlFor="campo-rol">Rol</label>
                <select id="campo-rol" name="rol" defaultValue="docente">
                    <option value="docente">Docente (publica y edita contenido)</option>
                    <option value="admin">Administrador (además maneja cuentas e Instagram)</option>
                </select>
            </div>
            <p className="panel-ayuda">Se crea con una contraseña temporal que vas a ver al guardar.</p>
        </Modal>
    );
}

export function VistaUsuarios() {
    const yo = useUsuario();
    const avisar = useAviso();
    const { datos, error, recargar } = useDatos<UsuarioListado[]>('/api/admin/usuarios');
    const [creando, setCreando] = useState(false);
    // Contraseña temporal recién creada o reseteada (se muestra una sola vez).
    const [clave, setClave] = useState<{ email: string; contrasena: string } | null>(null);

    async function cambiar(id: number, cambios: { activo?: boolean; rol?: string }) {
        await api(`/api/admin/usuarios/${id}`, 'PATCH', cambios);
        await recargar();
    }

    return (
        <>
            <EncabezadoVista titulo="Usuarios" descripcion="Cuentas de docentes que pueden entrar al panel.">
                <button type="button" className="btn btn-principal" onClick={() => setCreando(true)}>+ Nueva cuenta</button>
            </EncabezadoVista>

            {clave && (
                <div className="clave-temporal" role="alert">
                    <p>Contraseña temporal de <strong>{clave.email}</strong>:</p>
                    <p>
                        <code>{clave.contrasena}</code>{' '}
                        <button type="button" className="btn btn-secundario btn-chico"
                                onClick={async () => { await navigator.clipboard.writeText(clave.contrasena); avisar('Contraseña copiada.'); }}>Copiar</button>
                    </p>
                    <p>Pasásela a la persona por un medio privado. Se muestra <strong>una sola vez</strong>;
                        al entrar puede cambiarla con &quot;Cambiar mi contraseña&quot;.</p>
                </div>
            )}

            {!datos ? <Cargando error={error} recargar={recargar} /> : (
                <div className="lista">
                    {datos.map(u => (
                        <article key={u.id} className={`item${u.activo ? '' : ' item--inactivo'}`}>
                            <div className="item__cuerpo">
                                <p className="item__titulo">{u.nombre} {u.id === yo.id ? '(vos)' : ''}</p>
                                <p className="item__meta">{u.email} ·{' '}
                                    <span className={`etiqueta${u.rol === 'admin' ? ' etiqueta--admin' : ''}`}>{u.rol === 'admin' ? 'Administrador' : 'Docente'}</span>
                                    {!u.activo && <span className="etiqueta">Desactivada</span>}
                                </p>
                                {u.id !== yo.id && (
                                    <div className="item__acciones">
                                        <BotonAccion confirmar={u.activo ? '¿Desactivar esta cuenta? No va a poder entrar al panel.' : undefined}
                                                     accion={() => cambiar(u.id, { activo: !u.activo })}>{u.activo ? 'Desactivar' : 'Activar'}</BotonAccion>
                                        <BotonAccion confirmar={u.rol === 'admin' ? '¿Quitarle los permisos de administrador?' : '¿Darle permisos de administrador?'}
                                                     accion={() => cambiar(u.id, { rol: u.rol === 'admin' ? 'docente' : 'admin' })}>
                                            {u.rol === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                                        </BotonAccion>
                                        <BotonAccion confirmar={`¿Generar una contraseña nueva para ${u.email}? La actual deja de funcionar.`}
                                                     accion={async () => {
                                                         const { contrasena } = await api<{ contrasena: string }>(`/api/admin/usuarios/${u.id}/resetear`, 'POST');
                                                         setClave({ email: u.email, contrasena });
                                                     }}>Resetear contraseña</BotonAccion>
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {creando && (
                <FormularioCuenta alCerrar={() => setCreando(false)}
                                  alCrear={(email, contrasena) => { setClave({ email, contrasena }); recargar(); }} />
            )}
        </>
    );
}
