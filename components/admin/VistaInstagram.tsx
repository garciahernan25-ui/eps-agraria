'use client';
// Pestaña Instagram (solo admin): estado, "Sincronizar ahora" y cargar un token nuevo.
import { useState } from 'react';
import { formatearFecha } from '@/lib/compartido/fechas';
import type { EstadoInstagram } from '@/lib/compartido/tipos';
import { api } from './api';
import { BotonAccion, Cargando, EncabezadoVista, EnlaceSitio, useAviso, useDatos } from './comun';

export function VistaInstagram() {
    const { datos: ig, error, recargar } = useDatos<EstadoInstagram>('/api/admin/instagram');
    const avisar = useAviso();
    const [conectando, setConectando] = useState(false);

    async function guardarToken(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        setConectando(true);
        try {
            const { usuario, total } = await api<{ usuario: string; total: number }>('/api/admin/instagram/token', 'POST', {
                token: (form.elements.namedItem('token') as HTMLTextAreaElement).value,
            });
            form.reset();
            avisar(`Instagram conectado (@${usuario}). ${total} posteos sincronizados.`);
            await recargar();
        } catch (err) {
            avisar((err as Error).message, { error: true });
        } finally {
            setConectando(false);
        }
    }

    const dias = ig?.vence ? Math.round((Date.parse(ig.vence) - Date.now()) / 86400000) : null;

    return (
        <>
            <EncabezadoVista titulo="Instagram" descripcion="La galería (galeria.html) copia los posteos de @epsagraria todos los días.">
                <EnlaceSitio href="galeria.html" texto="Ver galería" />
            </EncabezadoVista>
            {!ig ? <Cargando error={error} recargar={recargar} /> : (
                <>
                    <dl className="datos">
                        <dt>Cuenta</dt><dd>{ig.conectado ? (ig.usuario ? `@${ig.usuario}` : 'Conectada') : '❌ Sin conectar'}</dd>
                        <dt>El token vence</dt>
                        <dd>{ig.vence ? `${formatearFecha(ig.vence, { conHora: true })} (${dias! > 0 ? `en ${dias} días; se renueva solo` : 'vencido: pegá uno nuevo'})` : '—'}</dd>
                        <dt>Última sincronización</dt><dd>{formatearFecha(ig.ultimaSync, { conHora: true })}</dd>
                        <dt>Posteos en la galería</dt><dd>{ig.cantidad}</dd>
                        <dt>Sincronización diaria</dt><dd>{ig.cronConfigurado ? '✅ Activa' : '⚠️ Falta la variable CRON_SECRET en Vercel'}</dd>
                        {ig.ultimoError && <><dt>Último error</dt><dd className="panel-error">{ig.ultimoError}</dd></>}
                    </dl>
                    <div className="item__acciones">
                        <BotonAccion className="btn btn-principal" disabled={!ig.conectado} accion={async () => {
                            try {
                                const { total } = await api<{ total: number }>('/api/admin/instagram/sincronizar', 'POST');
                                avisar(`Listo: ${total} posteos sincronizados.`);
                            } finally {
                                await recargar();
                            }
                        }}>Sincronizar ahora</BotonAccion>
                    </div>
                </>
            )}
            <h3>Conectar o cambiar el token</h3>
            <form className="campo" onSubmit={guardarToken}>
                <label htmlFor="token">Token de larga duración de Instagram</label>
                <textarea id="token" name="token" rows={3} required autoComplete="off" spellCheck={false} />
                <small>Se genera en Meta for Developers (los pasos están en el README del proyecto). Dura 60 días y el sitio lo renueva solo.</small>
                <div>
                    <button type="submit" className="btn btn-principal" disabled={conectando}>
                        {conectando ? 'Conectando…' : 'Guardar token y sincronizar'}
                    </button>
                </div>
            </form>
        </>
    );
}
