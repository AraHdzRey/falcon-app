import { obtenerTodasLasNoticias } from '../data/noticias.data';
import type {
  FiltroCategoria,
  Noticia,
} from '../types/noticia.types';

export const listarNoticias = (
  categoria: FiltroCategoria,
  busqueda: string | null
): Noticia[] => {
  const termino = busqueda?.toLowerCase() ?? null;

  return obtenerTodasLasNoticias().filter((noticia) => {
    if (categoria !== 'Todas' && noticia.categoria !== categoria) {
      return false;
    }

    if (termino === null) {
      return true;
    }

    return (
      noticia.titulo.toLowerCase().includes(termino) ||
      noticia.contenido.toLowerCase().includes(termino)
    );
  });
};

export const obtenerNoticiaPorId = (id: number): Noticia | null =>
  obtenerTodasLasNoticias().find((noticia) => noticia.id === id) ??
  null;
