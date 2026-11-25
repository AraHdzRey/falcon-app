import type { NewsItem } from '../../sync/types';

export const NEWS_SEARCH_MAX_LENGTH = 120;
export const NEWS_TITLE_MAX_LENGTH = 160;
export const NEWS_BODY_MAX_LENGTH = 2000;

export interface NewsApiItem {
  id: string;
  title: string;
  body: string;
  active?: boolean;
  version: number;
  createdAt?: string;
  updatedAt: string;
}

export interface NewsFormInput {
  title: string;
  body: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const hasAsciiControlChars = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
};

const hasDangerousBodyControlChars = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (
      code <= 0x08 ||
      code === 0x0b ||
      code === 0x0c ||
      (code >= 0x0e && code <= 0x1f) ||
      code === 0x7f
    ) {
      return true;
    }
  }
  return false;
};

export const normalizeNewsSearch = (
  raw: string,
): ValidationResult<string | undefined> => {
  if (hasAsciiControlChars(raw)) {
    return {
      ok: false,
      error: 'La búsqueda contiene caracteres no permitidos.',
    };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: true, value: undefined };
  }
  if (trimmed.length > NEWS_SEARCH_MAX_LENGTH) {
    return {
      ok: false,
      error: `La búsqueda no puede superar ${NEWS_SEARCH_MAX_LENGTH} caracteres.`,
    };
  }
  return { ok: true, value: trimmed };
};

export const filterNewsLocally = (
  items: readonly NewsItem[],
  query: string,
): NewsItem[] => {
  const term = query.trim().toLocaleLowerCase('es');
  if (!term) {
    return [...items];
  }
  return items.filter(
    (item) =>
      item.title.toLocaleLowerCase('es').includes(term) ||
      item.body.toLocaleLowerCase('es').includes(term),
  );
};

export const validateNewsForm = (
  rawTitle: string,
  rawBody: string,
): ValidationResult<NewsFormInput> => {
  if (hasAsciiControlChars(rawTitle)) {
    return {
      ok: false,
      error: 'El título contiene caracteres no permitidos.',
    };
  }
  if (hasDangerousBodyControlChars(rawBody)) {
    return {
      ok: false,
      error: 'El contenido contiene caracteres no permitidos.',
    };
  }

  const title = rawTitle.trim();
  const body = rawBody.trim();

  if (title.length === 0) {
    return { ok: false, error: 'El título es obligatorio.' };
  }
  if (title.length > NEWS_TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `El título no puede superar ${NEWS_TITLE_MAX_LENGTH} caracteres.`,
    };
  }
  if (body.length === 0) {
    return { ok: false, error: 'El contenido es obligatorio.' };
  }
  if (body.length > NEWS_BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `El contenido no puede superar ${NEWS_BODY_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true, value: { title, body } };
};

export const adaptNewsItem = (item: NewsApiItem): NewsItem => ({
  id: item.id,
  title: item.title,
  body: item.body,
  version: item.version,
  updatedAt: item.updatedAt,
  pending: false,
});
