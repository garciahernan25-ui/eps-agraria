'use client';
// Juego de preguntas sobre la huerta (juegos.html).
import { useState } from 'react';

interface Pregunta {
    pregunta: string;
    opciones: string[];
    respuestaCorrecta: string;
    explicacion: string;
}

const PREGUNTAS: Pregunta[] = [
    {
        pregunta: '¿Qué se forma al cavar en línea recta y arrojar la tierra hacia el centro en el Paso 1?',
        opciones: ['A) La rotación', 'B) El mulching', 'C) El lomo'],
        respuestaCorrecta: 'C) El lomo',
        explicacion: 'El lomo es el desnivel elevado donde se cultivará, creado al cavar los surcos.',
    },
    {
        pregunta: '¿Qué debes verificar sobre los cultivos en el Paso 2 antes de plantar?',
        opciones: ['A) Que sean exóticos y grandes.', 'B) Que sean de temporada y época del año.', 'C) Que tengan flores vistosas.'],
        respuestaCorrecta: 'B) Que sean de temporada y época del año.',
        explicacion: 'Es crucial elegir cultivos que se adapten a la temporada para asegurar su correcto crecimiento.',
    },
    {
        pregunta: '¿Cómo se llama el proceso de recubrir el suelo con pasto seco u hojas?',
        opciones: ['A) Rotación', 'B) Asociación', 'C) Mulching'],
        respuestaCorrecta: 'C) Mulching',
        explicacion: 'El mulching ayuda a evitar que la tierra se seque y mantiene la humedad del suelo.',
    },
    {
        pregunta: '¿Por qué se riega el suelo del lomo y no las hojas directamente?',
        opciones: ['A) Para ahorrar agua.', 'B) Porque el agua quema las hojas (efecto espejo).', 'C) Solo se riega por la noche.'],
        respuestaCorrecta: 'B) Porque el agua quema las hojas (efecto espejo).',
        explicacion: 'El sol puede quemar las hojas si tienen gotas de agua encima, debido al efecto lupa o espejo.',
    },
    {
        pregunta: '¿Qué concepto consiste en cultivar varios tipos de plantas distintas para que no compitan por nutrientes?',
        opciones: ['A) La Rotación', 'B) La Asociación', 'C) El Trasplante'],
        respuestaCorrecta: 'B) La Asociación',
        explicacion: 'La asociación es cultivar distintas plantas juntas (raíz, follaje, bulbo) que se complementen.',
    },
];

function resultadoFinal(puntaje: number) {
    const porcentaje = Math.round((puntaje / PREGUNTAS.length) * 100);
    if (porcentaje >= 80) return { mensaje: '¡Felicidades! Eres un experto en huertas. 💚', color: '#2e7d32' };
    if (porcentaje >= 50) return { mensaje: '¡Bien hecho! Tienes conocimientos sólidos. 🌿', color: '#f7b731' };
    return { mensaje: 'Sigue practicando. Repasa los pasos de la huerta. 🌱', color: '#c62828' };
}

export function QuizHuerta() {
    const [indice, setIndice] = useState(0);
    const [puntaje, setPuntaje] = useState(0);
    const [elegida, setElegida] = useState<string | null>(null);

    const terminado = indice >= PREGUNTAS.length;
    const actual = PREGUNTAS[indice];

    function responder(opcion: string) {
        if (elegida) return; // evita doble clic
        setElegida(opcion);
        if (opcion === actual.respuestaCorrecta) setPuntaje(p => p + 1);
    }

    function siguiente() {
        setIndice(i => i + 1);
        setElegida(null);
    }

    function reiniciar() {
        setIndice(0);
        setPuntaje(0);
        setElegida(null);
    }

    const final = terminado ? resultadoFinal(puntaje) : null;

    return (
        <section className="quiz-huerta">
            <h3>🌱 Pon a prueba tus conocimientos sobre la Huerta 🌱</h3>

            <div className="score-board">
                <p>Pregunta: <span>{Math.min(indice + 1, PREGUNTAS.length)}</span> / <span>{PREGUNTAS.length}</span></p>
                <p>Puntaje Actual: <span>{puntaje}</span></p>
            </div>

            {!terminado && (
                <div className="pregunta-contenedor">
                    <p className="pregunta-texto">{actual.pregunta}</p>
                    <div className="opciones-respuesta">
                        {actual.opciones.map(opcion => {
                            let clase = 'opcion-btn';
                            if (elegida && opcion === actual.respuestaCorrecta) clase += ' correcta';
                            else if (elegida === opcion) clase += ' incorrecta';
                            return (
                                <button key={opcion} type="button" className={clase} disabled={Boolean(elegida)} onClick={() => responder(opcion)}>
                                    {opcion}
                                </button>
                            );
                        })}
                        {elegida && (
                            <p style={{ marginTop: 15, color: elegida === actual.respuestaCorrecta ? '#2e7d32' : '#c62828' }}>
                                <strong>Feedback:</strong> {actual.explicacion}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {elegida && !terminado && (
                <button type="button" className="next-btn" style={{ display: 'block' }} onClick={siguiente}>Siguiente Pregunta</button>
            )}

            {final && (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <h3 style={{ color: final.color, fontSize: '2em' }}>Juego Terminado</h3>
                    <p style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '15px 0' }}>Puntaje Final: {puntaje} de {PREGUNTAS.length}</p>
                    <p style={{ fontSize: '1.2em' }}>{final.mensaje}</p>
                    <button type="button" className="next-btn" onClick={reiniciar}>Volver a Jugar</button>
                </div>
            )}
        </section>
    );
}
