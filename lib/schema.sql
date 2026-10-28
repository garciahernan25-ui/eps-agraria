-- Este archivo se puede correr muchas veces sobre una base con datos:
-- todo es "IF NOT EXISTS". Las columnas nuevas de tablas que ya existían
-- se agregan desde scripts/esquema.ts (SQLite no tiene ADD COLUMN IF NOT EXISTS).

-- Cuentas de docentes. rol: 'admin' puede administrar cuentas e Instagram.
CREATE TABLE IF NOT EXISTS usuarios (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT NOT NULL,
    email            TEXT NOT NULL UNIQUE,  -- siempre en minúsculas
    contrasena_hash  TEXT NOT NULL,         -- scrypt$<salt>$<hash>
    rol              TEXT NOT NULL DEFAULT 'docente' CHECK (rol IN ('admin', 'docente')),
    activo           INTEGER NOT NULL DEFAULT 1,
    creado_en        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Publicaciones del panel. seccion: ver lib/compartido/secciones.ts
CREATE TABLE IF NOT EXISTS publicaciones (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo          TEXT NOT NULL,
    texto           TEXT NOT NULL DEFAULT '',
    seccion         TEXT NOT NULL,
    autor_id        INTEGER REFERENCES usuarios(id),  -- quién la editó por última vez
    publicada       INTEGER NOT NULL DEFAULT 1,
    creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_publicaciones_seccion ON publicaciones (publicada, seccion, creado_en);

-- Fotos y videos de cada publicación (los archivos están en Vercel Blob).
CREATE TABLE IF NOT EXISTS publicacion_medios (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    publicacion_id  INTEGER NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    tipo            TEXT NOT NULL CHECK (tipo IN ('foto', 'video')),
    orden           INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_medios_publicacion ON publicacion_medios (publicacion_id, orden);

-- Fichas de cultivos (cultivos.html y cultivo.html?slug=...).
CREATE TABLE IF NOT EXISTS cultivos (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    slug               TEXT NOT NULL UNIQUE,
    nombre             TEXT NOT NULL,
    imagen             TEXT,
    nombre_vulgar      TEXT NOT NULL DEFAULT '',
    nombre_cientifico  TEXT NOT NULL DEFAULT '',
    origen             TEXT NOT NULL DEFAULT '',
    caracteristicas    TEXT NOT NULL DEFAULT '',
    siembra            TEXT NOT NULL DEFAULT '',
    cosecha            TEXT NOT NULL DEFAULT '',
    orden              INTEGER NOT NULL DEFAULT 0,
    autor_id           INTEGER REFERENCES usuarios(id),
    actualizado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tarjetas de docentes.html.
CREATE TABLE IF NOT EXISTS docentes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre          TEXT NOT NULL,
    descripcion     TEXT NOT NULL DEFAULT '',  -- cargo o materia
    foto            TEXT,
    orden           INTEGER NOT NULL DEFAULT 0,
    autor_id        INTEGER REFERENCES usuarios(id),
    actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Páginas de texto con fotos. contenido_html ya está sanitizado.
CREATE TABLE IF NOT EXISTS paginas (
    slug            TEXT PRIMARY KEY,
    titulo          TEXT NOT NULL,
    contenido_html  TEXT NOT NULL DEFAULT '',
    actualizado_en  TEXT NOT NULL DEFAULT (datetime('now')),
    autor_id        INTEGER REFERENCES usuarios(id)
);

-- Tarjetas de la grilla de inicio (index.html).
CREATE TABLE IF NOT EXISTS inicio_tarjetas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo          TEXT NOT NULL,
    imagen          TEXT,
    enlace          TEXT NOT NULL,
    orden           INTEGER NOT NULL DEFAULT 0,
    autor_id        INTEGER REFERENCES usuarios(id),
    actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Posteos de Instagram (@epsagraria), copiados por la sincronización diaria.
-- Las URLs de Instagram vencen: por eso se vuelven a pedir todos los días.
CREATE TABLE IF NOT EXISTS instagram_posts (
    id               TEXT PRIMARY KEY,  -- id de Instagram
    tipo             TEXT NOT NULL CHECK (tipo IN ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM')),
    media_url        TEXT,
    thumbnail_url    TEXT,
    permalink        TEXT NOT NULL,
    caption          TEXT,
    timestamp        TEXT NOT NULL,
    hijos            TEXT,              -- JSON con las fotos/videos de un carrusel
    sincronizado_en  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_instagram_fecha ON instagram_posts (timestamp);

-- Ajustes sueltos (clave/valor). Por ejemplo: el token de Instagram y su vencimiento.
CREATE TABLE IF NOT EXISTS ajustes (
    clave  TEXT PRIMARY KEY,
    valor  TEXT
);

-- Experiencias públicas de estudiantes. Solo se muestran las aprobadas.
CREATE TABLE IF NOT EXISTS experiencias (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre     TEXT,                -- NULL = anónimo
    texto      TEXT NOT NULL,
    foto_url   TEXT,
    estado     TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada')),
    creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_experiencias_estado ON experiencias (estado, creado_en);

-- Buzón confidencial: solo lo leen los docentes desde el panel.
CREATE TABLE IF NOT EXISTS consultas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre     TEXT,                -- NULL = anónimo
    texto      TEXT NOT NULL,
    leida      INTEGER NOT NULL DEFAULT 0,
    creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);
