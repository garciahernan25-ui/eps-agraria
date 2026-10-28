// Datos del test de inteligencias múltiples (modelo de Howard Gardner).

export type Categoria = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface InfoCategoria {
    name: string;
    bio: string;
    cap: string;
    hab: string;
    perf: string[];
}

export interface Oferta {
    course: string;
    place: string;
}

export const AFIRMACIONES: string[] = [
    "Prefiero hacer un mapa que explicarle a alguien cómo tiene que llegar.",
    "Si estoy enojado(a) o contento(a), generalmente sé exactamente por qué.",
    "Sé tocar (o antes sabía tocar) un instrumento musical.",
    "Asocio la música con mis estados de ánimo.",
    "Puedo sumar o multiplicar mentalmente con mucha rapidez.",
    "Puedo ayudar a un amigo a manejar sus sentimientos porque yo lo pude hacer antes en relación a sentimientos parecidos.",
    "Me gusta trabajar con calculadoras y computadoras.",
    "Aprendo rápido a bailar un ritmo nuevo.",
    "No me es difícil decir lo que pienso en el curso de una discusión o debate.",
    "Disfruto de una buena charla, discurso o sermón.",
    "Siempre distingo el norte del sur, esté donde esté.",
    "Me gusta reunir grupos de personas en una fiesta o en un evento especial.",
    "La vida me parece vacía sin música.",
    "Siempre entiendo los gráficos que vienen en las instrucciones de equipos o instrumentos.",
    "Me gusta hacer rompecabezas y entretenerme con juegos electrónicos.",
    "Me fue fácil aprender a andar en bicicleta (o patines).",
    "Me enojo cuando oigo una discusión o una afirmación que parece ilógica.",
    "Soy capaz de convencer a otros de que sigan mis planes.",
    "Tengo buen sentido de equilibrio y coordinación.",
    "Con frecuencia veo configuraciones y relaciones entre números con más rapidez y facilidad que otros.",
    "Me gusta construir modelos (o hacer esculturas).",
    "Tengo agudeza para encontrar el significado de las palabras.",
    "Puedo mirar un objeto de una manera y con la misma facilidad verlo desde otra perspectiva.",
    "Con frecuencia hago la conexión entre una pieza de música y algún evento de mi vida.",
    "Me gusta trabajar con números y figuras.",
    "Me gusta sentarme silenciosamente y reflexionar sobre mis sentimientos íntimos.",
    "Con sólo mirar la forma de construcciones y estructuras me siento a gusto.",
    "Me gusta tararear, silbar y cantar en la ducha o cuando estoy sola.",
    "Soy bueno(a) para el atletismo.",
    "Me gusta escribir cartas detalladas a mis amigos.",
    "Generalmente me doy cuenta de la expresión que tengo en la cara.",
    "Me doy cuenta de las expresiones en la cara de otras personas.",
    "Me mantengo \"en contacto\" con mis estados de ánimo. No me cuesta identificarlos.",
    "Me doy cuenta de los estados de ánimo de otros.",
    "Me doy cuenta bastante bien de lo que otros piensan de mí."
];

// Números de afirmación (desde 1) que suman a cada inteligencia.
export const PREGUNTAS_POR_CATEGORIA: Record<Categoria, number[]> = {
    A: [9,10,17,22,30],
    B: [5,7,15,20,25],
    C: [1,11,14,23,27],
    D: [8,16,19,21,29],
    E: [3,4,13,24,28],
    F: [2,6,26,31,33],
    G: [12,18,32,34,35]
};

export const CATEGORIAS: Record<Categoria, InfoCategoria> = {
    A: {
        name: "Inteligencia verbal-lingüística",
        bio: "Se apoya en ambos hemisferios del cerebro; una zona llamada área de Broca es responsable de construir oraciones gramaticales.",
        cap: "Comprender el orden y el significado de las palabras al leer, escribir, hablar y escuchar.",
        hab: "Hablar y escribir eficazmente.",
        perf: [
            "Periodista",
            "Escritor/a",
            "Abogado/a",
            "Docente de Lengua",
            "Locutor/a",
            "Guionista",
            "Traductor/a"
        ]
    },
    B: {
        name: "Inteligencia lógico-matemática",
        bio: "Usa principalmente el hemisferio lógico del cerebro; es la más cercana al concepto tradicional de inteligencia.",
        cap: "Identificar modelos, calcular, formular y verificar hipótesis, usar el método científico y el razonamiento inductivo y deductivo.",
        hab: "Formular calendarios, medir el tiempo y estimar cantidades y distancias con exactitud.",
        perf: [
            "Ingeniero/a",
            "Programador/a",
            "Economista",
            "Contador/a",
            "Físico/a",
            "Analista de datos"
        ]
    },
    C: {
        name: "Inteligencia visual-espacial",
        bio: "El hemisferio derecho es la sede más importante del cálculo espacial; las lesiones en la región posterior derecha afectan la orientación y el reconocimiento de caras y escenas.",
        cap: "Presentar ideas visualmente, crear imágenes mentales, percibir detalles visuales, dibujar y confeccionar bocetos.",
        hab: "Realizar creaciones visuales y visualizar con precisión, incluso construir un modelo mental en tres dimensiones del mundo.",
        perf: [
            "Arquitecto/a",
            "Diseñador/a gráfico",
            "Fotógrafo/a",
            "Publicista",
            "Urbanista",
            "Piloto"
        ]
    },
    D: {
        name: "Inteligencia corporal-kinestésica",
        bio: "El control del movimiento se localiza en la corteza motora; cada hemisferio domina el lado opuesto del cuerpo.",
        cap: "Realizar actividades que requieren fuerza, rapidez, flexibilidad, coordinación óculo-manual y equilibrio.",
        hab: "Usar las manos para crear o hacer reparaciones, expresarse a través del cuerpo.",
        perf: [
            "Cirujano/a",
            "Bailarín/ina",
            "Deportista",
            "Kinesiólogo/a",
            "Actor/actriz",
            "Profesor/a de Educación Física"
        ]
    },
    E: {
        name: "Inteligencia musical-rítmica",
        bio: "Las áreas implicadas suelen ubicarse en el hemisferio derecho, aunque menos localizadas que el lenguaje; su pérdida se conoce como amusia.",
        cap: "Escuchar, cantar y tocar instrumentos con sensibilidad.",
        hab: "Crear y analizar música.",
        perf: [
            "Músico/a",
            "Compositor/a",
            "Productor/a musical",
            "Cantante",
            "Técnico/a de sonido",
            "Docente de Música"
        ]
    },
    F: {
        name: "Inteligencia intrapersonal",
        bio: "Los lóbulos frontales cumplen un papel central en la personalidad y en la regulación de las emociones.",
        cap: "Plantearse metas, evaluar las propias habilidades y desventajas, y controlar el pensamiento propio.",
        hab: "Meditar, exhibir disciplina personal, conservar la compostura y dar lo mejor de sí mismo.",
        perf: [
            "Psicólogo/a",
            "Escritor/a",
            "Filósofo/a",
            "Investigador/a",
            "Emprendedor/a",
            "Coach"
        ]
    },
    G: {
        name: "Inteligencia interpersonal",
        bio: "Los lóbulos frontales también son clave en el conocimiento interpersonal; una lesión en esta área puede cambiar profundamente la personalidad.",
        cap: "Trabajar con gente, ayudar a las personas a identificar y superar problemas.",
        hab: "Reconocer y responder a los sentimientos y personalidades de otros.",
        perf: [
            "Docente",
            "Psicólogo/a",
            "Administrador/a",
            "Terapeuta",
            "Recursos Humanos",
            "Trabajador/a social",
            "Vendedor/a"
        ]
    }
};

// Cursos del distrito para cada inteligencia.
export const OFERTAS_LOCALES: Record<Categoria, Oferta[]> = {
    A: [
        {
            course: "Inglés para negocios nivel II",
            place: "Junín 1837, Burzaco — CFP N.º 401"
        },
        {
            course: "Operador de herramientas de marketing y venta digital",
            place: "Bollini y Salaberry 99, Claypole — CFP N.º 402"
        }
    ],
    B: [
        {
            course: "Programador de sistemas informáticos multimediales",
            place: "Garibaldi 220, Almirante Brown — CFP N.º 401"
        },
        {
            course: "Auxiliar en liquidación de impuestos",
            place: "Lapacho 551, Malvinas Argentinas — CFP N.º 401"
        },
        {
            course: "Pensamiento computacional - programación",
            place: "Tomás Guido y Junín, Almirante Brown — CFP N.º 403"
        },
        {
            course: "Habilidades digitales",
            place: "Tomás Guido y Junín, Almirante Brown — CFP N.º 403"
        }
    ],
    C: [
        {
            course: "Diseño gráfico de sistemas informáticos nivel II",
            place: "Esteban Adrogué 1224, Adrogué — CFP N.º 401"
        },
        {
            course: "Diseño de productos impresos en 3D",
            place: "Mitre 1458, Adrogué — CFP N.º 401"
        },
        {
            course: "Diseño proyectual asistido por computadora avanzado",
            place: "Esteban Adrogué 1224, Adrogué — CFP N.º 401"
        },
        {
            course: "Diseño de página web",
            place: "Figueroa 781 y Araujo, Don Orione — CFP N.º 402"
        },
        {
            course: "Diseño y fabricación digital",
            place: "Tomás Guido y Junín, Almirante Brown — CFP N.º 403"
        }
    ],
    D: [
        {
            course: "Soldador básico",
            place: "Junín 1837, Burzaco — CFP N.º 401"
        },
        {
            course: "Gasista domiciliario",
            place: "Figueroa 781 y Araujo, Don Orione — CFP N.º 402"
        },
        {
            course: "Ebanista",
            place: "Jorge 3838, Rafael Calzada — CFP N.º 404"
        },
        {
            course: "Instalador de sistemas eléctricos de energías renovables",
            place: "Jorge 3838, Rafael Calzada — CFP N.º 404"
        },
        {
            course: "Cocinero/a para comedor escolar",
            place: "Lapacho 551, Malvinas Argentinas — CFP N.º 401"
        },
        {
            course: "Elaborador/a de alfajores regionales",
            place: "Pedro Goyena 1120, Almirante Brown — CFP N.º 401"
        }
    ],
    E: [],
    F: [],
    G: [
        {
            course: "Práctico en organización de eventos",
            place: "Esteban Adrogué 1224, Adrogué — CFP N.º 401"
        },
        {
            course: "Auxiliar de sommelier",
            place: "Lapacho 551, Malvinas Argentinas — CFP N.º 401"
        },
        {
            course: "Auxiliar en instituciones educativas",
            place: "Lapacho 551, Malvinas Argentinas — CFP N.º 401"
        },
        {
            course: "Mucama/o para establecimientos de salud",
            place: "Garibaldi 220, Almirante Brown — CFP N.º 401"
        }
    ]
};

export const FORMATE_BROWN_URL = "https://formate.brown.gob.ar/";
