// Consulta confidencial: solo la leen los docentes desde el panel.
import { db } from '@/lib/db';
import { claveCorrecta } from '@/lib/auth';
import { ErrorHttp, leerJSON, responder, ruta } from '@/lib/http';
import { texto } from '@/lib/util';

export const POST = ruta(async (req) => {
    const cuerpo = await leerJSON(req, 50_000);
    if (!claveCorrecta(cuerpo.clave, process.env.CLAVE_ESTUDIANTES)) throw new ErrorHttp(403, 'Clave incorrecta.');
    const contenido = texto(cuerpo.consulta, 5000);
    if (contenido.length < 20) throw new ErrorHttp(400, 'Escribí al menos 20 caracteres.');
    const nombre = cuerpo.anonimo === 'anonimo' ? null : (texto(cuerpo.nombre, 80) || null);
    await db.execute({ sql: 'INSERT INTO consultas (nombre, texto) VALUES (?, ?)', args: [nombre, contenido] });
    return responder({ ok: true }, 201);
});
