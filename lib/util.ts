// Recorta y limpia un texto que viene del cliente. Si no es texto, devuelve ''.
export function texto(valor: unknown, max: number): string {
    return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

// Convierte un id de la URL en número entero positivo, o null.
export function idValido(valor: unknown): number | null {
    return /^\d{1,12}$/.test(String(valor)) ? Number(valor) : null;
}

export function emailValido(email: string): boolean {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

// "Repollo Morado" → "repollo-morado"
export function crearSlug(original: string): string {
    return original.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'cultivo';
}

// Número de página a partir de ?pagina=
export function numeroDePagina(valor: unknown): number {
    return Math.max(1, Math.min(1000, Number.parseInt(String(valor ?? ''), 10) || 1));
}
