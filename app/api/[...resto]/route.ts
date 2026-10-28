// Cualquier dirección de la API que no existe responde 404 en JSON (y no con la página HTML).
const noEncontrado = () => Response.json({ error: 'No encontrado.' }, { status: 404 });

export { noEncontrado as GET, noEncontrado as POST, noEncontrado as PUT, noEncontrado as PATCH, noEncontrado as DELETE };
