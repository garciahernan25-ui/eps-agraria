# Web E.P.S Agraria n°1 Alte. Brown

Sitio de la escuela con backend en **Node.js (Express)**, base de datos **Turso** y fotos/videos en **Vercel Blob**, desplegado en **Vercel**.

## Qué se edita desde el panel (`/admin.html`)

Cada profe entra con **su propio email y contraseña**.

| Pestaña | Qué maneja | Dónde se ve |
|---|---|---|
| Publicaciones | Posteos con texto, fotos y videos, cada uno en una sección | `novedades.html` (todas) y la página de su sección |
| Cultivos | Fichas de cultivos (crear, editar, borrar, ordenar, cambiar la foto) | `cultivos.html` y `cultivo.html?slug=...` |
| Docentes | Tarjetas con foto, nombre y cargo | `docentes.html` |
| Páginas | Editor visual de las páginas de texto con fotos | nosotros, agraria, cea 34, cursos, biopreparados, huerta, siembra y cosecha, excursiones, obra, antología, otras actividades, presentación de docentes |
| Inicio | Tarjetas de la grilla principal | `index.html` |
| Experiencias | Aprobar, ocultar o borrar lo que mandan los estudiantes | `estudiantes.html` |
| Buzón | Consultas confidenciales de estudiantes | solo en el panel |
| Instagram *(admin)* | Conectar la cuenta y sincronizar | `galeria.html` |
| Usuarios *(admin)* | Crear, activar/desactivar, cambiar rol y resetear contraseñas | — |

No se editan desde el panel: `juegos.html`, `test vocacional.html` y `estudiantes.html`.

Secciones de publicaciones: están en `api/_lib/secciones.js`. Para agregar una, sumala ahí (y, si tiene página propia, poné en esa página `<section class="publicaciones" data-publicaciones="<id>" hidden><h2>Publicaciones</h2></section>` y el script `js/publicaciones.js`).

## Estructura

```
api/index.js                 App Express (Vercel la usa como función en /api)
api/_lib/db.js               Conexión a Turso
api/_lib/auth.js             Contraseñas (scrypt), sesión con cookie firmada, permisos
api/_lib/schema.sql          Tablas
api/_lib/archivos.js         Reglas de fotos/videos y borrado en Blob
api/_lib/sanitizar.js        Limpieza del HTML de las páginas
api/_lib/instagram.js        Sincronización y renovación del token de Instagram
api/_lib/secciones.js        Secciones de las publicaciones
api/_lib/rutas/*.js          Rutas: usuarios, subidas, publicaciones, contenido, instagram
js/                          Scripts del navegador (cada página pública y el panel)
css/admin.css                Estilos del panel
scripts/migrate.js           Crea/actualiza las tablas (npm run db:migrate)
scripts/crear-admin.js       Crea un administrador (npm run crear-admin)
scripts/importar-contenido.js Carga el contenido de los HTML originales (npm run importar)
contenido-original/          Copia de los HTML como estaban antes (la usa el importador; no se publica)
server.js                    Servidor para probar en tu compu
```

## Probar en tu compu

```bash
npm install
cp .env.example .env        # y completá los valores (SESSION_SECRET como mínimo)
npm run db:migrate          # crea las tablas (se puede correr siempre, no borra datos)
npm run importar            # carga cultivos, docentes, páginas e inicio desde contenido-original/
npm run crear-admin         # te pide nombre, email y contraseña
npm run dev                 # http://localhost:3000  — panel en /admin.html
```

- Sin `TURSO_DATABASE_URL` se usa el archivo `local.db`.
- Sin `BLOB_READ_WRITE_TOKEN`, las fotos y videos del panel se guardan en `subidas-locales/` (solo en tu compu). El formulario de experiencias de estudiantes no acepta fotos.
- `npm run importar` no pisa lo que ya se editó. Para volver todo al contenido original: `npm run importar -- --forzar`.

## Publicar en Vercel

1. **Turso**: creá la base y sacá los datos de conexión.
   ```bash
   turso db create eps-agraria
   turso db show eps-agraria --url
   turso db tokens create eps-agraria
   ```
2. **Tablas y contenido**: poné esa URL y ese token en tu `.env` y corré, una vez:
   ```bash
   npm run db:migrate
   npm run importar
   npm run crear-admin
   ```
   (Si la base ya tenía datos, `db:migrate` solo agrega lo nuevo.)
3. **Vercel**: subí la carpeta a GitHub e importala en vercel.com (Framework: *Other*, sin build).
4. **Blob**: en el proyecto de Vercel, *Storage → Create → Blob*, y conectalo al proyecto (crea `BLOB_READ_WRITE_TOKEN` solo).
5. **Variables**: en *Settings → Environment Variables* cargá `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CLAVE_ESTUDIANTES`, `SESSION_SECRET` y `CRON_SECRET` (ver `.env.example`). `ADMIN_PASSWORD` ya no se usa: si estaba cargada, se puede borrar. Después hacé *Redeploy*.

El panel queda en `https://<tu-sitio>.vercel.app/admin.html`.

Las URLs viejas de los cultivos (`acelga.html`, `repollo morado.html`, etc.) redirigen solas a la ficha nueva (`redirects` en `vercel.json`).

### Subida de fotos y videos

Vercel no acepta pedidos de más de 4.5 MB, así que los archivos van **directo del navegador a Vercel Blob** (`upload()` de `@vercel/blob/client`). El servidor solo da el permiso en `POST /api/subidas`, y únicamente si hay una sesión de docente. Límites: fotos JPG/PNG/WEBP/GIF hasta 10 MB y videos MP4/WEBM/MOV hasta 200 MB. Cuando se borra una publicación, un medio o se cambia una foto, el archivo también se borra de Blob (salvo que otro contenido lo use).

## Galería de Instagram (@epsagraria)

Usa la **Instagram API with Instagram Login** (la vieja *Basic Display API* ya no existe). Los pasos se hacen una sola vez:

1. **Cuenta profesional**: en la app de Instagram, *Configuración → Tipo de cuenta y herramientas → Cambiar a cuenta profesional* (Creador o Empresa). Es gratis y no cambia nada de lo publicado.
2. **App de Meta**: entrá a [developers.facebook.com](https://developers.facebook.com/apps), *Crear app*, y elegí el caso de uso **"Administrar mensajes y contenido en Instagram"** (Instagram API with Instagram Login). Tipo de app: *Empresa*.
3. **Permiso**: en *Instagram → Configuración de la API con inicio de sesión de Instagram*, la app tiene que tener el permiso **`instagram_business_basic`** (alcanza para leer los posteos propios; no hace falta App Review porque la cuenta es tuya).
4. **Agregar la cuenta**: en *Roles de la app → Roles*, agregá la cuenta @epsagraria como **Evaluador de Instagram** (*Instagram Tester*) y aceptá la invitación desde Instagram (*Configuración → Apps y sitios web → Invitaciones de evaluador*).
5. **Generar el token**: en *Instagram → Configuración de la API con inicio de sesión de Instagram → 1. Generar tokens de acceso*, tocá **Agregar cuenta**, iniciá sesión con @epsagraria y después **Generar token**. Ese token ya es de **larga duración** (60 días).
6. **Pegarlo en el panel**: entrá como administrador a `/admin.html` → pestaña **Instagram** → pegá el token → *Guardar token y sincronizar*. (Otra opción: cargarlo en la variable `INSTAGRAM_TOKEN`; se usa solo la primera vez).
7. **Cron diario**: con `CRON_SECRET` cargada en Vercel, el cron de `vercel.json` llama todos los días a `/api/cron/instagram` (6:00 de Argentina). Ese llamado vuelve a traer los posteos (las URLs de las fotos de Instagram vencen) y **renueva el token** cuando faltan menos de 15 días para que venza. El botón *Sincronizar ahora* hace lo mismo a mano.

Si el token llega a vencer (por ejemplo, si la sincronización estuvo caída más de 60 días), la pestaña Instagram lo avisa: hay que generar uno nuevo (paso 5) y pegarlo.

## Seguridad

- Contraseñas guardadas con `scrypt` y salt. Las sesiones duran 8 horas; cambiar o resetear una contraseña cierra las sesiones abiertas de esa cuenta.
- Todas las rutas que modifican datos piden sesión; las de usuarios e Instagram, rol de administrador.
- Todo lo que escriben los usuarios se escapa antes de mostrarse. El HTML de las páginas se limpia en el servidor (`sanitize-html`) antes de guardarlo: solo quedan etiquetas, atributos y clases de `css/styles.css`/`css/estilos.css`.
- No subir `.env` ni `local.db` (están en `.gitignore` y `.vercelignore`).
