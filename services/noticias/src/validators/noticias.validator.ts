import {
  FILTROS_CATEGORIA,
  MAX_LONGITUD_BUSQUEDA,
  type FiltroCategoria,
} from '../types/noticia.types';

export type ResultadoValidacion<T> =
  | { ok: true; valor: T }
  | { ok: false; message: string };

const REGEX_ID = /^[1-9]\d*$/;

// Caracteres de control (incluye nulos y saltos de línea).
const REGEX_CONTROL = /[\u0000-\u001f\u007f]/;

export const validarCategoria = (
  valor: unknown
): ResultadoValidacion<FiltroCategoria> => {
  if (valor === undefined) {
    return { ok: true, valor: 'Todas' };
  }

  if (
    typeof valor !== 'string' ||
    !FILTROS_CATEGORIA.includes(valor as FiltroCategoria)
  ) {
    return {
      ok: false,
      message:
        "Categoría inválida. Valores permitidos: 'Todas', 'TI', 'Administrativas'",
    };
  }

  return { ok: true, valor: valor as FiltroCategoria };
};

export const validarBusqueda = (
  valor: unknown
): ResultadoValidacion<string | null> => {
  if (valor === undefined) {
    return { ok: true, valor: null };
  }

  if (typeof valor !== 'string' || REGEX_CONTROL.test(valor)) {
    return { ok: false, message: 'Parámetro q inválido' };
  }

  const texto = valor.trim();

  if (texto.length > MAX_LONGITUD_BUSQUEDA) {
    return {
      ok: false,
      message: `El parámetro q no puede exceder ${MAX_LONGITUD_BUSQUEDA} caracteres`,
    };
  }

  return { ok: true, valor: texto.length === 0 ? null : texto };
};

export const validarId = (
  valor: unknown
): ResultadoValidacion<number> => {
  if (typeof valor !== 'string' || !REGEX_ID.test(valor)) {
    return { ok: false, message: 'Identificador de noticia inválido' };
  }

  const id = Number(valor);

  if (!Number.isSafeInteger(id)) {
    return { ok: false, message: 'Identificador de noticia inválido' };
  }

  return { ok: true, valor: id };
};
