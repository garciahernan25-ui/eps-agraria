// Limpia el HTML de las páginas antes de guardarlo: deja solo etiquetas,
// atributos y clases seguras. Así nadie puede meter scripts en el sitio,
// aunque edite el HTML a mano.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sanitizeHtml from 'sanitize-html';

// Clases que usa el CSS del sitio (las páginas importadas dependen de ellas).
// next.config.ts incluye public/css en las funciones para poder leerlo en Vercel.
function clasesDelCss(): string[] {
    const clases = new Set<string>();
    for (const archivo of ['styles.css', 'estilos.css']) {
        try {
            const css = readFileSync(path.join(process.cwd(), 'public', 'css', archivo), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
            for (const [, clase] of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) clases.add(clase);
        } catch {
            console.error(`No se pudo leer public/css/${archivo} para la lista de clases permitidas.`);
        }
    }
    return [...clases];
}

let opciones: sanitizeHtml.IOptions | null = null;

function obtenerOpciones(): sanitizeHtml.IOptions {
    if (opciones) return opciones;
    const clases = clasesDelCss();
    opciones = {
        allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'video'],
        allowedAttributes: {
            '*': ['class', 'style', 'data-label'],
            a: ['href', 'target', 'rel', 'title'],
            img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
            video: ['src', 'controls', 'preload', 'playsinline', 'poster', 'width', 'height'],
            td: ['colspan', 'rowspan'],
            th: ['colspan', 'rowspan', 'scope'],
        },
        // Si no se pudo leer el CSS, se permiten todas las clases (no son un riesgo de seguridad).
        ...(clases.length ? { allowedClasses: { '*': clases } } : {}),
        // El editor usa style solo para alinear el texto.
        allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/] } },
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        allowProtocolRelative: false,
        transformTags: {
            // Los enlaces que abren otra pestaña no pueden controlar esta página.
            a: (tagName, attribs) => attribs.target === '_blank'
                ? { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }
                : { tagName, attribs },
            video: (tagName, attribs) => ({
                tagName,
                attribs: { ...attribs, controls: '', preload: 'metadata', playsinline: '' },
            }),
        },
    };
    return opciones;
}

export function sanitizarHTML(html: unknown): string {
    return sanitizeHtml(String(html ?? ''), obtenerOpciones()).trim();
}
