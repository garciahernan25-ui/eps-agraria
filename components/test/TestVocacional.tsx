'use client';
// Test de inteligencias múltiples: 35 afirmaciones Verdadero/Falso, resultado por inteligencia,
// profesiones sugeridas, cursos del distrito y descarga en PDF (resultados y QR para imprimir).
import { useEffect, useState } from 'react';
import {
    AFIRMACIONES, CATEGORIAS, FORMATE_BROWN_URL, OFERTAS_LOCALES, PREGUNTAS_POR_CATEGORIA, type Categoria,
} from './datos';

type Pantalla = 'intro' | 'quiz' | 'resultados';
type Respuesta = 'V' | 'F' | null;
type Puntajes = Record<Categoria, number>;

const TOTAL = AFIRMACIONES.length;
const CATEGORIAS_ORDEN = Object.keys(PREGUNTAS_POR_CATEGORIA) as Categoria[];

function calcularPuntajes(respuestas: Respuesta[]): Puntajes {
    return Object.fromEntries(CATEGORIAS_ORDEN.map(cat =>
        [cat, PREGUNTAS_POR_CATEGORIA[cat].filter(n => respuestas[n - 1] === 'V').length])) as Puntajes;
}

// Las inteligencias con 4 o 5 puntos; si no hay ninguna, las dos más altas.
function destacadas(puntajes: Puntajes, orden: Categoria[]) {
    const fuertes = orden.filter(cat => puntajes[cat] >= 4);
    return fuertes.length
        ? { lista: fuertes, nota: 'Armadas a partir de las inteligencias donde marcaste habilidad (4/5) o sobresaliste (5/5).' }
        : { lista: orden.slice(0, 2), nota: 'Ninguna inteligencia llegó a 4 puntos, así que estas son orientativas según tus dos puntajes más altos.' };
}

function etiqueta(puntaje: number) {
    if (puntaje === 5) return { texto: 'sobresaliente', clase: ' top' };
    if (puntaje >= 4) return { texto: 'habilidad marcada', clase: ' marked' };
    return { texto: '', clase: '' };
}

// ---------- PDF ----------

async function descargarResultados(puntajes: Puntajes, orden: Categoria[]) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const anchoPagina = 210;
    let y = 20;
    const saltoSiHaceFalta = () => { if (y > 270) { doc.addPage(); y = 20; } };
    const titulo = (texto: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(5, 121, 82);
        doc.text(texto, 20, y);
        y += 8;
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(5, 121, 82);
    doc.text('Resultados del Test de Inteligencias Múltiples', anchoPagina / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text('Fecha: ' + fecha, anchoPagina / 2, y, { align: 'center' });
    y += 12;

    titulo('Puntajes obtenidos');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    for (const cat of orden) {
        const puntaje = puntajes[cat];
        doc.text(CATEGORIAS[cat].name + ':', 20, y);
        doc.text(puntaje + '/5   ' + '█'.repeat(puntaje) + '░'.repeat(5 - puntaje), 100, y);
        y += 7;
        saltoSiHaceFalta();
    }
    y += 6;

    const { lista } = destacadas(puntajes, orden);
    titulo('Profesiones recomendadas');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    for (const cat of lista) {
        doc.setFont('helvetica', 'bold');
        doc.text('• ' + CATEGORIAS[cat].name + ':', 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        const lineas = doc.splitTextToSize(CATEGORIAS[cat].perf.join(', '), 170);
        doc.text(lineas, 25, y);
        y += lineas.length * 5 + 2;
        saltoSiHaceFalta();
    }

    if (lista.some(cat => OFERTAS_LOCALES[cat].length > 0)) {
        y += 4;
        titulo('Formación disponible en Almirante Brown');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        for (const cat of lista) {
            const ofertas = OFERTAS_LOCALES[cat];
            if (!ofertas.length) continue;
            doc.setFont('helvetica', 'bold');
            doc.text(CATEGORIAS[cat].name + ':', 20, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            for (const o of ofertas) {
                const lineas = doc.splitTextToSize(`• ${o.course} (${o.place})`, 170);
                doc.text(lineas, 25, y);
                y += lineas.length * 5 + 1;
                saltoSiHaceFalta();
            }
            y += 2;
        }
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Test vocacional · E.P.S Agraria n°1 Alte. Brown', anchoPagina / 2, 285, { align: 'center' });
    doc.save('Resultados-Test-Vocacional.pdf');
}

async function descargarQR() {
    const [{ jsPDF }, QRCode] = await Promise.all([import('jspdf'), import('qrcode')]);
    const url = window.location.href;
    const qr = await QRCode.toDataURL(url, { width: 800, margin: 1 });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const ancho = 210, alto = 297;

    doc.setFillColor(10, 170, 95);
    doc.rect(0, 0, ancho, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text('E.P.S AGRARIA N°1 · ALTE. BROWN', ancho / 2, 21, { align: 'center' });

    doc.setTextColor(5, 121, 82);
    doc.setFontSize(34);
    doc.text('Test Vocacional', ancho / 2, 62, { align: 'center' });

    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    doc.text('Test de Inteligencias Múltiples', ancho / 2, 74, { align: 'center' });

    const lado = 115, x = (ancho - lado) / 2, y = 90;
    doc.setDrawColor(10, 170, 95);
    doc.setLineWidth(0.8);
    doc.rect(x - 4, y - 4, lado + 8, lado + 8);
    doc.addImage(qr, 'PNG', x, y, lado, lado);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Escaneá el código con la cámara de tu celular', ancho / 2, y + lado + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(90, 90, 90);
    doc.text('Descubrí qué carreras, oficios y cursos del distrito van con vos.', ancho / 2, y + lado + 32, { align: 'center' });

    doc.setFillColor(5, 121, 82);
    doc.rect(0, alto - 20, ancho, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(url, ancho / 2, alto - 8, { align: 'center' });
    doc.save('Test-vocacional-QR-A4.pdf');
}

// ---------- Componente ----------

export function TestVocacional() {
    const [pantalla, setPantalla] = useState<Pantalla>('intro');
    const [respuestas, setRespuestas] = useState<Respuesta[]>(() => new Array(TOTAL).fill(null));
    const [actual, setActual] = useState(0);
    const [detalle, setDetalle] = useState<Categoria | null>(null);
    const [barrasLlenas, setBarrasLlenas] = useState(false);
    const [generando, setGenerando] = useState<'resultados' | 'qr' | null>(null);

    const puntajes = calcularPuntajes(respuestas);
    const orden = [...CATEGORIAS_ORDEN].sort((a, b) => puntajes[b] - puntajes[a]);

    function mostrar(nueva: Pantalla) {
        setPantalla(nueva);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Las barras arrancan vacías y se llenan con una pequeña animación.
    useEffect(() => {
        if (pantalla !== 'resultados') return setBarrasLlenas(false);
        const t = setTimeout(() => setBarrasLlenas(true), 30);
        return () => clearTimeout(t);
    }, [pantalla]);

    function elegir(valor: 'V' | 'F') {
        setRespuestas(r => r.map((x, i) => i === actual ? valor : x));
    }

    function siguiente() {
        if (respuestas[actual] === null) return;
        if (actual === TOTAL - 1) {
            setDetalle(orden[0]);
            mostrar('resultados');
        } else {
            setActual(actual + 1);
        }
    }

    function reiniciar() {
        setRespuestas(new Array(TOTAL).fill(null));
        setActual(0);
        setDetalle(null);
        mostrar('intro');
    }

    async function generar(tipo: 'resultados' | 'qr') {
        setGenerando(tipo);
        try {
            if (tipo === 'resultados') await descargarResultados(puntajes, orden);
            else await descargarQR();
        } catch (err) {
            console.error('Error al generar PDF:', err);
            alert('Ocurrió un error al generar el PDF: ' + (err as Error).message);
        } finally {
            setGenerando(null);
        }
    }

    const porcentaje = Math.round((actual / TOTAL) * 100);
    const { lista, nota } = destacadas(puntajes, orden);
    const info = detalle ? CATEGORIAS[detalle] : null;
    const puntajeDetalle = detalle ? puntajes[detalle] : 0;

    return (
        <div className="stage">
            <div className="masthead">
                <div className="compass"></div>
                <div className="kicker">Orientación vocacional</div>
            </div>

            {/* INTRO */}
            <section id="intro" className={`screen${pantalla === 'intro' ? ' active' : ''}`}>
                <h1>Test de Inteligencias Múltiples</h1>
                <div className="subtitle">Según el modelo de Howard Gardner</div>
                <div className="instructions">
                    Leé cada afirmación y decidí si describe una característica <strong>fuerte y verdadera</strong> en vos.
                    Si te representa, marcá <strong>Verdadero</strong>; si no, marcá <strong>Falso</strong>. No hay
                    respuestas correctas o incorrectas — respondé con lo primero que te parezca cierto, sin pensarlo demasiado.
                </div>
                <div className="meta-row">
                    <div><span className="num">35</span>afirmaciones</div>
                    <div><span className="num">7</span>inteligencias</div>
                    <div><span className="num">~6</span>minutos</div>
                </div>
                <button className="btn-primary" type="button" onClick={() => { setActual(0); mostrar('quiz'); }}>Empezar el test</button>
                <button className="btn-secondary" type="button" disabled={generando === 'qr'} onClick={() => generar('qr')}>
                    {generando === 'qr'
                        ? <><i className="fas fa-spinner fa-spin"></i> Generando QR…</>
                        : <><i className="fas fa-qrcode"></i> Descargar QR para imprimir (PDF A4)</>}
                </button>
            </section>

            {/* PREGUNTAS */}
            <section id="quiz" className={`screen${pantalla === 'quiz' ? ' active' : ''}`}>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${porcentaje}%` }}></div></div>
                <div className="progress-label">
                    <span>Pregunta {actual + 1} de {TOTAL}</span>
                    <span>{porcentaje}%</span>
                </div>
                <div className="q-number">N.º {String(actual + 1).padStart(2, '0')}</div>
                <div className="q-statement">{AFIRMACIONES[actual]}</div>
                <div className="choices">
                    <button type="button" className={`choice-btn${respuestas[actual] === 'V' ? ' selected' : ''}`} onClick={() => elegir('V')}>Verdadero</button>
                    <button type="button" className={`choice-btn${respuestas[actual] === 'F' ? ' selected' : ''}`} onClick={() => elegir('F')}>Falso</button>
                </div>
                <div className="nav-row">
                    <button type="button" className="nav-btn" disabled={actual === 0} onClick={() => setActual(actual - 1)}>← anterior</button>
                    <button type="button" className="nav-btn next" disabled={respuestas[actual] === null} onClick={siguiente}>
                        {actual === TOTAL - 1 ? 'ver resultado →' : 'siguiente →'}
                    </button>
                </div>
            </section>

            {/* RESULTADOS */}
            <section id="results" className={`screen${pantalla === 'resultados' ? ' active' : ''}`}>
                <h2>Tu mapa de inteligencias</h2>
                <div className="subtitle">Tocá una barra para ver el detalle de esa inteligencia</div>

                <div className="career-panel">
                    <h3>Profesiones que podrían interesarte</h3>
                    <div className="career-note">{nota}</div>
                    {lista.map(cat => (
                        <div className="career-group" key={cat}>
                            <div className="career-cat">{CATEGORIAS[cat].name}</div>
                            <div className="chip-row">{CATEGORIAS[cat].perf.map(p => <span className="chip" key={p}>{p}</span>)}</div>
                            <div className="local-offers">
                                <div className="local-label">Formación disponible en Almirante Brown (trayectos que comienzan después del receso)</div>
                                {OFERTAS_LOCALES[cat].length
                                    ? <ul>{OFERTAS_LOCALES[cat].map(o => <li key={o.course}>{o.course} <span className="place">— {o.place}</span></li>)}</ul>
                                    : <div className="empty">Por ahora no encontramos un curso específico del distrito para esta inteligencia — vale la pena revisar el buscador de Formate Brown o las diplomaturas de la UNAB.</div>}
                            </div>
                        </div>
                    ))}
                    <a className="portal-link" href={FORMATE_BROWN_URL} target="_blank" rel="noopener noreferrer">Ver toda la oferta oficial en Formate Brown →</a>
                </div>

                <div>
                    {orden.map((cat, i) => {
                        const { texto, clase } = etiqueta(puntajes[cat]);
                        return (
                            <button type="button" className="bar-row" key={cat} onClick={() => setDetalle(cat)}>
                                <div className="bar-label-row">
                                    <span className="name">{CATEGORIAS[cat].name}</span>
                                    <span className="tag">{texto ? texto + ' · ' : ''}{puntajes[cat]}/5</span>
                                </div>
                                <div className="bar-track">
                                    <div className={`bar-fill${clase}`}
                                         style={{ width: barrasLlenas ? `${(puntajes[cat] / 5) * 100}%` : '0%', transitionDelay: `${i * 60}ms` }}></div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className={`detail-panel${info ? ' visible' : ''}`}>
                    {info && (
                        <>
                            <h3>{info.name}</h3>
                            <p>{puntajeDetalle === 5 ? 'Puntaje sobresaliente (5/5).'
                                : puntajeDetalle >= 4 ? `Habilidad marcada (${puntajeDetalle}/5).` : `Puntaje: ${puntajeDetalle}/5.`}</p>
                            <p><span className="field-label">Aspectos biológicos: </span>{info.bio}</p>
                            <p><span className="field-label">Capacidades implicadas: </span>{info.cap}</p>
                            <p><span className="field-label">Habilidades relacionadas: </span>{info.hab}</p>
                            <p><span className="field-label">Perfiles profesionales: </span>{info.perf.join(', ')}</p>
                        </>
                    )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 30 }}>
                    <button type="button" className="btn-download-results" disabled={generando === 'resultados'} onClick={() => generar('resultados')}>
                        {generando === 'resultados'
                            ? <><i className="fas fa-spinner fa-spin"></i> Generando PDF…</>
                            : <><i className="fas fa-file-pdf"></i> Descargar resultados en PDF</>}
                    </button>
                    <button type="button" className="btn-secondary" style={{ marginTop: 0 }} onClick={reiniciar}>Volver a empezar</button>
                </div>
            </section>
        </div>
    );
}
