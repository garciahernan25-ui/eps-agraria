// Carga en la base el contenido que estaba escrito en los HTML del sitio viejo
// (copias en contenido-original/).
//
// Uso: npm run importar             → solo carga lo que falta (no pisa lo editado en el panel)
//      npm run importar -- --forzar → vuelve a cargar todo desde los HTML originales
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import type { InStatement } from '@libsql/client';
import { db } from '../lib/db';
import { sanitizarHTML } from '../lib/sanitizar';
import { crearSlug } from '../lib/util';
import { PAGINAS_DE_TEXTO, PAGINAS_DEL_SITIO } from '../lib/compartido/paginas';
import { aplicarEsquema } from './esquema';

const ORIGEN = new URL('../contenido-original/', import.meta.url);
const forzar = process.argv.includes('--forzar');

// ---------- Ayudas ----------

const leer = (archivo: string) => readFile(new URL(archivo, ORIGEN), 'utf8');

// En Windows "img/acelga.jpg" encuentra "img/Acelga.jpg", pero en Vercel no:
// se corrige cada ruta con el nombre real del archivo (y de las páginas del sitio).
const archivosReales = new Map<string, string>(PAGINAS_DEL_SITIO.map(p => [p.toLowerCase(), p]));
for (const carpeta of ['img', 'Img 2']) {
    const ruta = new URL(`../public/${carpeta}/`, import.meta.url);
    if (!existsSync(ruta)) continue;
    for (const archivo of readdirSync(ruta)) archivosReales.set(`${carpeta}/${archivo}`.toLowerCase(), `${carpeta}/${archivo}`);
}
const rutaReal = (ruta: string) => archivosReales.get(ruta.toLowerCase()) ?? ruta;

function corregirRutas(html: string): string {
    return html.replace(/(src|href)="([^"#:]+)"/g, (_todo, atributo: string, ruta: string) => `${atributo}="${rutaReal(ruta)}"`);
}

function textoPlano(html: string): string {
    return html.replace(/<[^>]*>/g, '')
        .replaceAll('&nbsp;', ' ').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')
        .replace(/\s+/g, ' ').trim();
}

function contenidoDeMain(html: string): string {
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    if (!main) throw new Error('No se encontró <main>.');
    // Se saca el bloque de publicaciones: lo agrega la página, no es parte del texto.
    return main[1].replace(/<!-- Publicaciones[\s\S]*?<\/section>/, '');
}

const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const alActualizar = (columnas: string) => forzar ? `UPDATE SET ${columnas}` : 'NOTHING';
const sumar = (resultados: { rowsAffected: number }[]) => resultados.reduce((t, r) => t + r.rowsAffected, 0);

// ---------- Importación ----------

await aplicarEsquema();

async function importarPaginas() {
    const sentencias: InStatement[] = [];
    for (const { ruta, slug, titulo } of PAGINAS_DE_TEXTO) {
        sentencias.push({
            sql: `INSERT INTO paginas (slug, titulo, contenido_html) VALUES (?, ?, ?)
                  ON CONFLICT (slug) DO ${alActualizar("titulo = excluded.titulo, contenido_html = excluded.contenido_html, actualizado_en = datetime('now')")}`,
            args: [slug, titulo, sanitizarHTML(corregirRutas(contenidoDeMain(await leer(ruta))))],
        });
    }
    // Texto de presentación de docentes.html (las tarjetas van en su propia tabla).
    const intro = (await leer('docentes.html')).match(/<div class="introduccion-equipo">([\s\S]*?)<\/div>/);
    sentencias.push({
        sql: `INSERT INTO paginas (slug, titulo, contenido_html) VALUES ('docentes', 'Docentes (presentación)', ?)
              ON CONFLICT (slug) DO ${alActualizar('contenido_html = excluded.contenido_html')}`,
        args: [sanitizarHTML(intro?.[1] ?? '')],
    });
    console.log(`Páginas: ${sumar(await db.batch(sentencias, 'write'))} cargadas.`);
}

async function importarCultivos() {
    // El orden y la foto salen de la grilla de cultivos.html.
    const grilla = await leer('cultivos.html');
    const tarjetas = [...grilla.matchAll(/<a href="([^"]+)\.html">\s*<img class="producto__imagen" src="([^"]+)"/g)];

    const sentencias: InStatement[] = [];
    for (const [orden, [, archivo, imagen]] of tarjetas.entries()) {
        const ficha = await leer(`cultivos/${archivo}.html`);
        const campo = (etiqueta: string) =>
            textoPlano(ficha.match(new RegExp(`<strong>${etiqueta}:</strong>([\\s\\S]*?)</(?:li|p)>`))?.[1] ?? '');
        const nombre = capitalizar(textoPlano(ficha.match(/<header class="cultivo-header">\s*<h1>([\s\S]*?)<\/h1>/)?.[1] ?? archivo));

        sentencias.push({
            sql: `INSERT INTO cultivos (slug, nombre, imagen, nombre_vulgar, nombre_cientifico, origen, caracteristicas, siembra, cosecha, orden)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT (slug) DO ${alActualizar(`nombre = excluded.nombre, imagen = excluded.imagen,
                      nombre_vulgar = excluded.nombre_vulgar, nombre_cientifico = excluded.nombre_cientifico,
                      origen = excluded.origen, caracteristicas = excluded.caracteristicas, siembra = excluded.siembra,
                      cosecha = excluded.cosecha, orden = excluded.orden, actualizado_en = datetime('now')`)}`,
            args: [
                crearSlug(archivo), nombre, rutaReal(imagen),
                campo('Nombre Vulgar'),
                campo('Nombre Científico').replaceAll('*', ''), // venía con *asteriscos* de Markdown
                campo('Origen'), campo('Otras Características'),
                campo('Siembra'), campo('Cosecha'), orden,
            ],
        });
    }
    console.log(`Cultivos: ${sumar(await db.batch(sentencias, 'write'))} cargados de ${tarjetas.length}.`);
}

// Docentes e inicio no tienen una clave natural: se cargan solo si la tabla está vacía (o con --forzar).
async function cargarLista(tabla: string, columnas: string[], lista: string[][]) {
    const { rows } = await db.execute(`SELECT COUNT(*) AS n FROM ${tabla}`);
    if (rows[0].n && !forzar) {
        console.log(`${tabla}: ya tenía datos, no se tocó.`);
        return;
    }
    await db.batch([
        `DELETE FROM ${tabla}`,
        ...lista.map((valores, orden) => ({
            sql: `INSERT INTO ${tabla} (${columnas.join(', ')}, orden) VALUES (${columnas.map(() => '?').join(', ')}, ?)`,
            args: [...valores, orden],
        })),
    ], 'write');
    console.log(`${tabla}: ${lista.length} cargados.`);
}

async function importarDocentes() {
    const html = await leer('docentes.html');
    const lista = [...html.matchAll(/<div class="profesor-card">\s*<img src="([^"]+)"[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<p class="profesor-cargo">([\s\S]*?)<\/p>/g)]
        .map(([, foto, nombre, cargo]) => [textoPlano(nombre), textoPlano(cargo), rutaReal(foto)]);
    await cargarLista('docentes', ['nombre', 'descripcion', 'foto'], lista);
}

async function importarInicio() {
    const html = await leer('index.html');
    const lista = [...html.matchAll(/<a href="([^"]+)">\s*<img class="producto__imagen" src="([^"]+)"[\s\S]*?<p class="producto__nombre">([\s\S]*?)<\/p>/g)]
        .map(([, enlace, imagen, titulo]) => [textoPlano(titulo), rutaReal(imagen), rutaReal(enlace)]);
    await cargarLista('inicio_tarjetas', ['titulo', 'imagen', 'enlace'], lista);
}

await importarPaginas();
await importarCultivos();
await importarDocentes();
await importarInicio();
console.log(forzar ? 'Listo (se pisó el contenido con los HTML originales).' : 'Listo.');
