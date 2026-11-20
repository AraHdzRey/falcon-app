export type CategoriaNoticia = 'TI' | 'Administrativas';

export type FiltroCategoria = 'Todas' | CategoriaNoticia;

// Debe mantenerse idéntico al tipo Noticia de apps/mobile.
export type Noticia = {
  id: number;
  titulo: string;
  fecha: string;
  categoria: CategoriaNoticia;
  imagen: string;
  contenido: string;
};

export const FILTROS_CATEGORIA: readonly FiltroCategoria[] = [
  'Todas',
  'TI',
  'Administrativas',
];

export const MAX_LONGITUD_BUSQUEDA = 100;
