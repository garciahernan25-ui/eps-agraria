import type { NextConfig } from 'next';

// Fichas de cultivos que antes eran archivos sueltos (acelga.html, etc.): redirigen a la ficha nueva.
const CULTIVOS_VIEJOS = [
    'acelga', 'achicoria', 'ajo', 'anco', 'banana', 'berenjena', 'brocoli', 'cebolla', 'espinaca', 'frutilla',
    'lechuga', 'maiz', 'manzana', 'naranja', 'papa', 'perejil', 'remolacha', 'repollo morado', 'tomates', 'zanahoria',
];

const config: NextConfig = {
    // Que `next dev` no cree un AGENTS.md en el proyecto.
    agentRules: false,
    // libsql usa un módulo nativo: no se empaqueta, se usa tal cual desde node_modules.
    serverExternalPackages: ['@libsql/client', 'libsql'],
    // El sanitizador lee el CSS del sitio para saber qué clases permitir.
    outputFileTracingIncludes: {
        '/api/**/*': ['./public/css/*.css'],
    },
    // La URL de siempre tiene un espacio: se atiende con la ruta /test-vocacional sin cambiar la dirección.
    async rewrites() {
        return [{ source: '/test%20vocacional.html', destination: '/test-vocacional' }];
    },
    async redirects() {
        return [
            { source: '/index.html', destination: '/', permanent: true },
            ...CULTIVOS_VIEJOS.map(nombre => ({
                source: `/${encodeURIComponent(nombre)}.html`,
                destination: `/cultivo.html?slug=${nombre.replace(/ /g, '-')}`,
                permanent: true,
            })),
        ];
    },
};

export default config;
