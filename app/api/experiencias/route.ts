// Experiencia enviada por un estudiante (queda pendiente hasta que un docente la apruebe).
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { ErrorHttp, responder, ruta } from '@/lib/http';
import { texto } from '@/lib/util';

// Vercel no acepta cuerpos de más de 4.5 MB, así que las fotos se limitan a 4 MB.
const MAX_FOTO = 4 * 1024 * 1024;
const FORMATOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const POST = ruta(async (req) => {
    let form: FormData;
    try {
        form = await req.formData();
    } catch {
        throw new ErrorHttp(400, 'Datos inválidos.');
    }
    const contenido = texto(form.get('experiencia'), 3000);
    if (contenido.length < 10) throw new ErrorHttp(400, 'Escribí al menos 10 caracteres.');
    const nombre = form.get('anonimo') === 'anonimo' ? null : (texto(form.get('nombre'), 80) || null);

    let fotoUrl: string | null = null;
    const foto = form.get('foto');
    if (foto instanceof File && foto.size > 0) {
        if (!FORMATOS.includes(foto.type)) throw new ErrorHttp(400, 'Archivo inválido.');
        if (foto.size > MAX_FOTO) throw new ErrorHttp(400, 'La foto no puede pesar más de 4 MB.');
        if (!process.env.BLOB_READ_WRITE_TOKEN) throw new ErrorHttp(503, 'La subida de fotos no está habilitada todavía.');
        const blob = await put(`experiencias/foto.${foto.type.split('/')[1]}`, foto, {
            access: 'public',
            contentType: foto.type,
            addRandomSuffix: true,
        });
        fotoUrl = blob.url;
    }

    await db.execute({ sql: 'INSERT INTO experiencias (nombre, texto, foto_url) VALUES (?, ?, ?)', args: [nombre, contenido, fotoUrl] });
    return responder({ ok: true }, 201);
});
