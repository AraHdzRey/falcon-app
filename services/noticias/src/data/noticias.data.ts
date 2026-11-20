import type { Noticia } from '../types/noticia.types';

// Datos de demostración en memoria.
// Replican NOTICIAS_DEMO de apps/mobile/src/screens/noticias.screen.tsx.
// Para migrar a PostgreSQL solo hay que sustituir este módulo
// (o la capa de acceso que lo consuma en noticias.service.ts).
const NOTICIAS_DEMO: readonly Noticia[] = [
  {
    id: 1,
    titulo: 'Mantenimiento de sistemas',
    fecha: '16 oct. 2026',
    categoria: 'TI',
    imagen: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=950&q=75',
    contenido: 'El próximo 20 de octubre se realizará mantenimiento en los sistemas internos de TI. Durante este periodo puede haber interrupciones en el servicio.',
  },
  {
    id: 2,
    titulo: 'Actualización de herramientas',
    fecha: '12 oct. 2026',
    categoria: 'TI',
    imagen: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=950&q=75',
    contenido: 'Se implementarán nuevas versiones de herramientas internas para facilitar las tareas del equipo.',
  },
  {
    id: 3,
    titulo: 'Actividades del departamento',
    fecha: '05 oct. 2026',
    categoria: 'Administrativas',
    imagen: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=950&q=75',
    contenido: 'Te invitamos a participar en la reunión general del área.',
  },
  {
    id: 4,
    titulo: 'Aviso importante',
    fecha: '28 sep. 2026',
    categoria: 'Administrativas',
    imagen: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=950&q=75',
    contenido: 'Se modifica el horario de atención en el área de soporte. Consulta con tu coordinación para más detalles.',
  },
];

// Devuelve copias para que nadie pueda mutar el almacén en memoria.
export const obtenerTodasLasNoticias = (): Noticia[] =>
  NOTICIAS_DEMO.map((noticia) => ({ ...noticia }));
