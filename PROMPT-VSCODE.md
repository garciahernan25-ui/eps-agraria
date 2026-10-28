Trabajá sobre este proyecto: la web de la E.P.S Agraria n°1 / C.E.A 34 de Almirante Brown. Está en esta carpeta (WEB Eps-agraria). Respondé y comentá el código en español.

## Estado actual (ya hecho, no rehacer)

- Unas 40 páginas HTML estáticas en la raíz, con CSS en `css/styles.css` e imágenes en `img/` y `Img 2/`. Todas repiten el mismo header, nav y footer.
- Backend Node.js con Express 5, base Turso (`@libsql/client`), fotos en Vercel Blob (`@vercel/blob` 2.x), deploy en Vercel:
  - `api/index.js`: app Express exportada por defecto. `vercel.json` reescribe `/api/(.*)` → `/api`.
  - `api/_lib/db.js`: cliente Turso. Sin `TURSO_DATABASE_URL` usa `file:local.db`.
  - `api/_lib/auth.js`: sesión con cookie firmada por HMAC (`SESSION_SECRET`) y login con una sola `ADMIN_PASSWORD`.
  - `api/_lib/schema.sql` + `scripts/migrate.js` (`npm run db:migrate`): tablas `experiencias` (con moderación pendiente/aprobada) y `consultas` (buzón confidencial).
  - `server.js`: servidor local (`npm run dev`) que sirve la API y los archivos estáticos.
  - `estudiantes.html`: experiencias públicas moderadas y buzón confidencial con `CLAVE_ESTUDIANTES` validada en el servidor.
  - `admin.html`: panel docente para aprobar/ocultar/borrar experiencias y leer el buzón.
  - `.env.example`, `.gitignore`, `.vercelignore`, `README.md`.
- Proyecto ESM (`"type": "module"`), Node 24. Todo el texto escrito por usuarios se escapa antes de mostrarlo (nunca usar innerHTML con datos sin escapar).

## Qué hay que construir

### 1. Cuentas por profe (reemplaza la contraseña compartida)
- Tabla `usuarios`: id, nombre, email (único), hash de contraseña (`crypto.scrypt` con salt, sin dependencias extra), rol (`admin` | `docente`), activo, creado_en.
- Login con email + contraseña. La cookie de sesión guarda el id del usuario (firmada y con vencimiento, como ahora).
- Un admin puede crear, desactivar y resetear cuentas desde el panel. Cada usuario puede cambiar su propia contraseña.
- Script `npm run crear-admin` para crear el primer admin desde la terminal.
- Las acciones de edición guardan quién las hizo (autor_id).

### 2. Publicaciones con fotos y videos
- Tablas `publicaciones` (id, titulo, texto, seccion, autor_id, publicada, creado_en, actualizado_en) y `publicacion_medios` (id, publicacion_id, url, tipo foto|video, orden).
- Secciones: Salidas educativas, Otras actividades, Cursos, Huerta, Biopreparados, C.E.A 34, General (sacarlas de una constante, fácil de ampliar).
- Cada publicación aparece en su sección (por ejemplo, en `excursiones.html` y `otras actividades.html`, debajo del contenido) y además en una página nueva `novedades.html` con todas, de la más nueva a la más vieja, paginadas. Agregar "Novedades" al nav de todas las páginas.
- Subida de archivos: Vercel no acepta cuerpos de más de 4.5 MB, así que fotos y videos se suben directo desde el navegador a Blob con `@vercel/blob/client` (`upload()` en el front + `handleUpload()` en `POST /api/subidas`). Validar en `onBeforeGenerateToken` que haya sesión de docente, restringir tipos (jpeg, png, webp, gif, mp4, webm, mov) y poner un tamaño máximo (fotos 10 MB, videos 200 MB).
- Al borrar una publicación o un medio, borrar también el archivo de Blob con `del()`.
- Videos con `<video controls preload="metadata" playsinline>`.

### 3. Poder editar todo lo que ya está cargado
Migrar el contenido actual a la base con un script (`scripts/importar-contenido.js`) que lea los HTML existentes y cargue las tablas. Mantener las mismas URLs y el mismo diseño/CSS.
- **Cultivos** (20 fichas iguales: acelga, achicoria, ajo, anco, banana, berenjena, brócoli, cebolla, espinaca, frutilla, lechuga, maíz, manzana, naranja, papa, perejil, remolacha, repollo morado, tomates, zanahoria): tabla `cultivos` (slug, nombre, imagen, nombre_vulgar, nombre_cientifico, origen, caracteristicas, siembra, cosecha, orden). `cultivos.html` arma la grilla desde la API y una plantilla `cultivo.html?slug=...` muestra la ficha. Las URLs viejas (`acelga.html`, etc.) redirigen a la nueva con `redirects` en `vercel.json` (y lo mismo en `server.js`). En el panel: crear, editar y borrar cultivos, y cambiar la foto.
- **Docentes** (`docentes.html`, tarjetas con foto, nombre y descripción): tabla `docentes`, editable desde el panel (agregar, editar, borrar, reordenar).
- **Páginas de texto con fotos** (nosotros, agraria, cea 34, cursos, biopreparados, paso apaso huerta, siembra y cosecha, excursiones, una obra para recordar, antologia literaria, otras actividades): tabla `paginas` (slug, titulo, contenido_html, actualizado_en, autor_id). El HTML de cada página se carga desde la API dentro de su `<main>`. En el panel, un editor visual (TipTap o Quill desde CDN con versión fija) que permita títulos, negrita, listas, links e insertar fotos subidas a Blob. Sanitizar el HTML en el servidor antes de guardarlo (por ejemplo con `sanitize-html`, permitiendo las clases que ya usa `styles.css`).
- **Inicio** (`index.html`): las tarjetas de la grilla (imagen, título, link) editables desde el panel.
- **No editables**: `juegos.html`, `test vocacional.html`, `estudiantes.html` (se quedan como están).
- Si el contenido no carga desde la API, mostrar un mensaje claro en vez de una página vacía.

### 4. Galería de Instagram automática (@epsagraria)
- Usar la **Instagram API with Instagram Login** (la Basic Display API ya no existe). Requiere que la cuenta sea Profesional (Creador o Empresa) y una app en Meta for Developers.
- Tabla `instagram_posts` (id de IG, tipo IMAGE|VIDEO|CAROUSEL_ALBUM, media_url, thumbnail_url, permalink, caption, timestamp) y tabla `ajustes` (clave/valor) donde se guarda el token de larga duración y su vencimiento.
- Sincronización: `GET https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}` con paginación. Upsert en la tabla.
- El token dura 60 días: renovarlo con `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=...` cuando falten menos de 15 días.
- Endpoint `GET /api/cron/instagram` protegido con `Authorization: Bearer ${CRON_SECRET}` y un cron diario en `vercel.json` (`"crons"`). Botón "Sincronizar ahora" en el panel (solo admin) y un campo para pegar el token inicial.
- Página nueva `galeria.html` (agregarla al nav): grilla responsive con las fotos y miniaturas de video; al hacer clic se abre una vista ampliada (los videos se reproducen) con el texto y un link al posteo original. Las URLs de Instagram vencen, por eso se sincroniza todos los días.
- Variables nuevas: `INSTAGRAM_TOKEN` (solo el inicial, opcional), `CRON_SECRET`.

### 5. Panel (`admin.html`)
Pestañas: Publicaciones, Cultivos, Docentes, Páginas, Inicio, Experiencias, Buzón, Instagram, Usuarios (solo admin). Formularios simples, previsualización de fotos/videos antes de guardar, confirmación antes de borrar, mensajes de error claros. Que funcione bien en el celular.

## Reglas
- Mantener el estilo del código existente (español, ESM, Express 5, consultas con parámetros `?`, nunca concatenar SQL).
- Todas las rutas que modifican datos exigen sesión. Las de usuarios e Instagram exigen rol admin.
- Agregar las tablas nuevas a `schema.sql` (con `CREATE TABLE IF NOT EXISTS`) y que `npm run db:migrate` siga funcionando sobre una base que ya tiene datos.
- Actualizar `.env.example` y `README.md` con las variables nuevas y los pasos para configurar Instagram (cuenta profesional, app de Meta, permiso `instagram_business_basic`, generar el token).
- No subir `.env` ni `local.db`.
- Al terminar, probar en local con `npm run dev`: crear admin, crear un docente, subir una publicación con foto y video, editar un cultivo, una página y un docente, y verificar que las páginas públicas muestran los cambios.

Hacelo por partes, en este orden: 1 → 2 → 3 → 4 → 5, y mostrame qué cambiaste al terminar cada parte.
