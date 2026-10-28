// Las fechas de la base están en UTC ("AAAA-MM-DD HH:MM:SS" o ISO). Se muestran en hora argentina.
export function formatearFecha(fecha: string | null | undefined, { conHora = false } = {}): string {
    if (!fecha) return '—';
    const d = new Date(fecha.includes('T') ? fecha : fecha.replace(' ', 'T') + 'Z');
    return d.toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit', month: '2-digit', year: 'numeric',
        ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
}
