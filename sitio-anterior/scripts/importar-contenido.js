// Carga en la base el contenido que estaba escrito en los HTML del sitio.
// Lee las copias de contenido-original/ (las páginas de la raíz ahora
// cargan su contenido desde la API).
//
// Uso: npm run importar             → solo carga lo que falta (no pisa lo editado en el panel)
//      npm run importar -- --forzar → vuelve a cargar todo desde los HTML originales
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { db } from '../api/_lib/db.js';
import { sanitizarHTML } from '../api/_lib/sanitizar.js';
import { crearSlug } from '../api/_lib/rutas/contenido.js';
import { aplicarEsquema } from './_esquema.js';

const ORIGEN = new URL('../contenido-original/', import.meta.url);
const forzar = process.argv.includes('--forzar');

// [archivo original, slug, título para el panel]
const PAGINAS = [
    ['nosotros.html', 'nosotros', 'Nosotros'],
    ['agraria.html', 'agraria', 'E.E.S.A n°1'],
    ['cea 34.html', 'cea-34', 'C.E.A 34'],
    ['cursos.html', 'cursos', 'Cursos'],
    ['biopreparados.html', 'biopreparados', 'Biopreparados'],
    ['paso apaso huerta.html', 'huerta', 'Huerta paso a paso'],
    ['siembra y cosecha.html', 'siembra-y-cosecha', 'Calendario de siembra y cosecha'],
    ['excursiones.html', 'salidas-educativas', 'Salidas educativas'],
    ['una obra para recordar.html', 'una-obra-para-recordar', 'Una obra para recordar'],
    ['antologia literaria.html', 'antologia-literaria', 'Antología literaria'],
    ['otras actividades.html', 'otras-actividades', 'Otras actividades'],
];

// ---------- Ayudas ----------

const leer = (archivo) => readFile(new URL(archivo, ORIGEN), 'utf8');

// En Windows "img/acelga.jpg" encuentra "img/Acelga.jpg", pero en Vercel no:
// se corrige cada ruta con el nombre real del archivo.
const archivosReales = new Map();
for (const carpeta of ['img', 'Img 2', '.']) {
    const ruta = new URL(`../${carpeta}/`, import.meta.url);
    if (!existsSync(ruta)) continue;
    for (const archivo of readdirSync(ruta)) {
        const relativo = carpeta === '.' ? archivo : `${carpeta}/${archivo}`;
        archivosReales.set(relativo.toLowerCase(), relativo);
    }
}
const rutaReal = (ruta) => archivosReales.get(ruta.toLowerCase()) ?? ruta;

function corregirRutas(html) {
    return html.replace(/(src|href)="([^"#:]+)"/g, (todo, atributo, ruta) => `${atributo}="${rutaReal(ruta)}"`);
}

function textoPlano(html) {
    return html.replace(/<[^>]*>/g, '')
        .replaceAll('&nbsp;', ' ').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')
        .replace(/\s+/g, ' ').trim();
}

function contenidoDeMain(html) {
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    if (!main) throw new Error('No se encontró <main>.');
    // Se saca el bloque de publicaciones: lo agrega la página, no es parte del texto.
    return main[1].replace(/<!-- Publicaciones[\s\S]*?<\/section>/, '');
}

const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ---------- Importación ----------

await aplicarEsquema();

async function importarPaginas() {
    let n = 0;
    for (const [archivo, slug, titulo] of PAGINAS) {
        const html = sanitizarHTML(corregirRutas(contenidoDeMain(await leer(archivo))));
        const { rowsAffected } = await db.execute({
            sql: `INSERT INTO paginas (slug, titulo, contenido_html) VALUES (?, ?, ?)
                  ON CONFLICT (slug) DO ${forzar ? "UPDATE SET titulo = excluded.titulo, contenido_html = excluded.contenido_html, actualizado_en = datetime('now')" : 'NOTHING'}`,
            args: [slug, titulo, html],
        });
        n += rowsAffected;
    }

    // Texto de presentación de docentes.html (las tarjetas van en su propia tabla).
    const docentes = await leer('docentes.html');
    const intro = docentes.match(/<div class="introduccion-equipo">([\s\S]*?)<\/div>/);
    const { rowsAffected } = await db.execute({
        sql: `INSERT INTO paginas (slug, titulo, contenido_html) VALUES ('docentes', 'Docentes (presentación)', ?)
              ON CONFLICT (slug) DO ${forzar ? 'UPDATE SET contenido_html = excluded.contenido_html' : 'NOTHING'}`,
        args: [sanitizarHTML(intro[1])],
    });
    console.log(`Páginas: ${n + rowsAffected} cargadas.`);
}

async function importarCultivos() {
    // El orden y la foto salen de la grilla de cultivos.html.
    const grilla = await leer('cultivos.html');
    const tarjetas = [...grilla.matchAll(/<a href="([^"]+)\.html">\s*<img class="producto__imagen" src="([^"]+)"/g)];

    const sentencias = [];
    for (const [orden, [, archivo, imagen]] of tarjetas.entries()) {
        const ficha = await leer(`cultivos/${archivo}.html`);
        const campo = (etiqueta) => textoPlano(ficha.match(new RegExp(`<strong>${etiqueta}:</strong>([\\s\\S]*?)</(?:li|p)>`))?.[1] ?? '');
        const nombre = capitalizar(textoPlano(ficha.match(/<header class="cultivo-header">\s*<h1>([\s\S]*?)<\/h1>/)[1]));

        sentencias.push({
            sql: `INSERT INTO cultivos (slug, nombre, imagen, nombre_vulgar, nombre_cientifico, origen, caracteristicas, siembra, cosecha, orden)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT (slug) DO ${forzar ? `UPDATE SET nombre = excluded.nombre, imagen = excluded.imagen,
                      nombre_vulgar = excluded.nombre_vulgar, nombre_cientifico = excluded.nombre_cientifico,
                      origen = excluded.origen, caracteristicas = excluded.caracteristicas, siembra = excluded.siembra,
                      cosecha = excluded.cosecha, orden = excluded.orden, actualizado_en = datetime('now')` : 'NOTHING'}`,
            args: [
                crearSlug(archivo), nombre, rutaReal(imagen),
                campo('Nombre Vulgar'),
                campo('Nombre Científico').replaceAll('*', ''), // venía con *asteriscos* de Markdown
                campo('Origen'), campo('Otras Características'),
                campo('Siembra'), campo('Cosecha'), orden,
            ],
        });
    }
    const resultados = await db.batch(sentencias, 'write');
    console.log(`Cultivos: ${resultados.reduce((t, r) => t + r.rowsAffected, 0)} cargados de ${tarjetas.length}.`);
}

// Docentes e inicio no tienen una clave natural: se cargan solo si la tabla está vacía (o con --forzar).
async function cargarLista(tabla, columnas, filas) {
    const { rows } = await db.execute(`SELECT COUNT(*) AS n FROM ${tabla}`);
    if (rows[0].n && !forzar) {
        console.log(`${tabla}: ya tenía datos, no se tocó.`);
        return;
    }
    await db.batch([
        `DELETE FROM ${tabla}`,
        ...filas.map((fila, orden) => ({
            sql: `INSERT INTO ${tabla} (${columnas.join(', ')}, orden) VALUES (${columnas.map(() => '?').join(', ')}, ?)`,
            args: [...fila, orden],
        })),
    ], 'write');
    console.log(`${tabla}: ${filas.length} cargados.`);
}

async function importarDocentes() {
    const html = await leer('docentes.html');
    const filas = [...html.matchAll(/<div class="profesor-card">\s*<img src="([^"]+)"[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<p class="profesor-cargo">([\s\S]*?)<\/p>/g)]
        .map(([, foto, nombre, cargo]) => [textoPlano(nombre), textoPlano(cargo), rutaReal(foto)]);
    await cargarLista('docentes', ['nombre', 'descripcion', 'foto'], filas);
}

async function importarInicio() {
    const html = await leer('index.html');
    const filas = [...html.matchAll(/<a href="([^"]+)">\s*<img class="producto__imagen" src="([^"]+)"[\s\S]*?<p class="producto__nombre">([\s\S]*?)<\/p>/g)]
        .map(([, enlace, imagen, titulo]) => [textoPlano(titulo), rutaReal(imagen), rutaReal(enlace)]);
    await cargarLista('inicio_tarjetas', ['titulo', 'imagen', 'enlace'], filas);
}

await importarPaginas();
await importarCultivos();
await importarDocentes();
await importarInicio();
console.log(forzar ? 'Listo (se pisó el contenido con los HTML originales).' : 'Listo.');
