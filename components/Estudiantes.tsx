'use client';
// Formularios de estudiantes.html: experiencia pública (con foto opcional) y buzón confidencial.
import { useState, type FormEvent } from 'react';
import { formatearFecha } from '@/lib/compartido/fechas';
import type { Experiencia } from '@/lib/compartido/tipos';

async function leerRespuesta(respuesta: Response) {
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.error || 'No se pudo conectar con el servidor.');
    return datos;
}

// "Con mi nombre" / "De forma anónima" + campo de nombre que se oculta.
function Identificacion({ pregunta, anonimo, setAnonimo, placeholder, idNombre }: {
    pregunta: string; anonimo: boolean; setAnonimo: (v: boolean) => void; placeholder: string; idNombre: string;
}) {
    return (
        <>
            <div className="form-control-group">
                <label>{pregunta}</label>
                <div className="anonimato-opciones">
                    <label><input type="radio" name="anonimo" value="nombre" checked={!anonimo} onChange={() => setAnonimo(false)} /> Con mi Nombre</label>
                    <label><input type="radio" name="anonimo" value="anonimo" checked={anonimo} onChange={() => setAnonimo(true)} /> De forma Anónima</label>
                </div>
            </div>
            {!anonimo && (
                <div className="form-control-group">
                    <label htmlFor={idNombre}>Nombre del Estudiante:</label>
                    <input type="text" id={idNombre} name="nombre" placeholder={placeholder} maxLength={80} required />
                </div>
            )}
        </>
    );
}

export function Estudiantes({ experiencias }: { experiencias: Experiencia[] }) {
    const [anonimoPublico, setAnonimoPublico] = useState(false);
    const [anonimoBuzon, setAnonimoBuzon] = useState(false);
    const [enviando, setEnviando] = useState(false);
    // La clave del buzón se valida en el servidor (no está escrita acá).
    const [claveBuzon, setClaveBuzon] = useState<string | null>(null);

    async function enviarExperiencia(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        if ((form.elements.namedItem('experiencia') as HTMLTextAreaElement).value.trim().length < 10) {
            alert('Por favor, escribe al menos 10 caracteres en el mensaje.');
            return;
        }
        setEnviando(true);
        try {
            // FormData incluye la foto (si se eligió una).
            await leerRespuesta(await fetch('/api/experiencias', { method: 'POST', body: new FormData(form) }));
            form.reset();
            setAnonimoPublico(false);
            alert('¡Gracias! Tu experiencia fue enviada. Se publicará cuando un docente la revise.');
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setEnviando(false);
        }
    }

    async function accederBuzon() {
        const clave = prompt('Ingresa tu clave de estudiante');
        if (!clave) return;
        try {
            await leerRespuesta(await fetch('/api/buzon/acceso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clave }),
            }));
        } catch {
            alert('¡Clave incorrecta! Acceso denegado.');
            return;
        }
        setClaveBuzon(clave);
        alert('Acceso exitoso. Ahora puedes enviar la consulta confidencial.');
    }

    async function enviarConsulta(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const datos = Object.fromEntries(new FormData(form));
        if (String(datos.consulta).trim().length < 20) {
            alert('Por favor, escribe al menos 20 caracteres en el mensaje.');
            return;
        }
        setEnviando(true);
        try {
            await leerRespuesta(await fetch('/api/buzon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...datos, clave: claveBuzon }),
            }));
            form.reset();
            setAnonimoBuzon(false);
            alert('¡Consulta enviada! Tu mensaje confidencial ha sido registrado por los docentes.');
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <>
            <form className="formulario-experiencia" onSubmit={enviarExperiencia}>
                <h2>Comparte tu Experiencia en la Escuela Profesional Secundaria</h2>
                <section className="formulario-introduccion">
                    <h3>¡Tu Voz es Importante!</h3>
                    <p>Este espacio es para que los estudiantes compartan sus vivencias, aprendizajes y sugerencias. Las experiencias se muestran públicamente abajo.</p>
                </section>

                <div className="form-control-group carga-foto-opcion">
                    <label htmlFor="foto">Cargar una Foto Opcional (de tu paso por la escuela):</label>
                    <input type="file" id="foto" name="foto" accept="image/jpeg,image/png,image/webp,image/gif" />
                </div>

                <Identificacion pregunta="¿Cómo quieres compartir tu experiencia?" anonimo={anonimoPublico} setAnonimo={setAnonimoPublico}
                                placeholder="Escribe tu nombre completo" idNombre="nombre" />

                <div className="form-control-group">
                    <label htmlFor="experiencia">Tu Experiencia en la Escuela:</label>
                    <textarea id="experiencia" name="experiencia" placeholder="¿Qué destacarías?..." minLength={10} maxLength={3000} required />
                </div>

                <button type="submit" disabled={enviando}>Enviar Experiencia</button>

                <section className="seccion-comentarios">
                    <h3>Experiencias Recientes de Estudiantes</h3>
                    {experiencias.length === 0 && <p className="comentario-meta">Todavía no hay experiencias publicadas. ¡Sé el primero!</p>}
                    {experiencias.map(exp => (
                        <div className="comentario-item" key={exp.id}>
                            <p className="comentario-meta">Enviado por: <strong>{exp.nombre || 'Anónimo'}</strong> el {formatearFecha(exp.creado_en)}</p>
                            <p className="comentario-texto">&quot;{exp.texto}&quot;</p>
                            {exp.foto_url && <img className="comentario-foto" src={exp.foto_url} alt="Foto compartida" style={{ maxWidth: '100%', borderRadius: 8 }} />}
                        </div>
                    ))}
                </section>
            </form>

            <div style={{ textAlign: 'center', margin: '40px auto 20px', maxWidth: 650 }}>
                {!claveBuzon && (
                    <button type="button" onClick={accederBuzon}
                            style={{ padding: '15px 30px', backgroundColor: '#6c5ce7', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '1.2em', fontWeight: 'bold' }}>
                        Acceder al Buzón
                    </button>
                )}
            </div>

            {claveBuzon && (
                <form className="formulario-consulta-confidencial" onSubmit={enviarConsulta}>
                    <h2>Buzón de Consultas y Sugerencias Confidenciales</h2>
                    <section className="consulta-introduccion">
                        <h3>Absoluta Confidencialidad</h3>
                        <p>Este formulario está diseñado para que solo los docentes puedan leer tus mensajes. Úsalo para plantear dudas, inquietudes o sugerencias que te dé vergüenza hablarlo en persona. ¡Tu identidad está protegida!</p>
                    </section>

                    <Identificacion pregunta="¿Cómo quieres que te identifiquemos (solo para docentes)?" anonimo={anonimoBuzon} setAnonimo={setAnonimoBuzon}
                                    placeholder="Escribe tu nombre (opcional si es anónimo)" idNombre="nombre-consulta" />

                    <div className="form-control-group">
                        <label htmlFor="consulta">Escribe tu duda, inquietud o sugerencia aquí:</label>
                        <textarea id="consulta" name="consulta" placeholder="Ej: Tengo una duda sobre el examen de física..." minLength={20} maxLength={5000} required />
                    </div>

                    <button type="submit" disabled={enviando}>Enviar Consulta Confidencial</button>
                </form>
            )}
        </>
    );
}
