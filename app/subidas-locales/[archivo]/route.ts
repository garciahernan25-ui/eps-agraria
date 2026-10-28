// Sirve los archivos subidos en tu compu (.subidas-locales/). En Vercel no se usa.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DIRECTORIO_LOCAL } from '@/lib/archivos';

const TIPOS: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
};

export async function GET(_req: Request, { params }: { params: Promise<{ archivo: string }> }) {
    const nombre = path.basename((await params).archivo);
    if (process.env.VERCEL || !/^[\w.-]+$/.test(nombre)) return new Response('No encontrado', { status: 404 });
    try {
        const contenido = await readFile(path.join(DIRECTORIO_LOCAL, nombre));
        return new Response(contenido, {
            headers: { 'Content-Type': TIPOS[path.extname(nombre).toLowerCase()] ?? 'application/octet-stream' },
        });
    } catch {
        return new Response('No encontrado', { status: 404 });
    }
}
