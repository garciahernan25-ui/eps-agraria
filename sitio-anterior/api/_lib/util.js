// Recorta y limpia un texto que viene del cliente. Si no es texto, devuelve ''.
export function texto(valor, max) {
    return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

// Convierte un id de la URL en número entero positivo, o null.
export function idValido(valor) {
    return /^\d{1,12}$/.test(String(valor)) ? Number(valor) : null;
}

export function emailValido(email) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
