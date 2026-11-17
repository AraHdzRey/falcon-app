import type { FalconRole } from '../types/auth';

const FALCON_ROLES: ReadonlySet<string> = new Set([
  'colaborador',
  'capital_humano',
  'responsable_quejas',
  'editor_noticias',
  'administrador',
  'director',
  'auditor',
]);

export const readString = (
  value: unknown,
  minLength: number,
  maxLength: number,
): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length >= minLength && normalized.length <= maxLength
    ? normalized
    : null;
};

export const readOptionalString = (
  value: unknown,
  maxLength: number,
): string | null | undefined => {
  if (value === undefined || value === null || value === '') return null;
  return readString(value, 1, maxLength) ?? undefined;
};

export const readRole = (value: unknown): FalconRole | null =>
  typeof value === 'string' && FALCON_ROLES.has(value)
    ? (value as FalconRole)
    : null;

export const readPositiveInteger = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : null;
};

export const readPagination = (
  pageValue: unknown,
  pageSizeValue: unknown,
): { page: number; pageSize: number } | null => {
  const page = pageValue === undefined ? 1 : readPositiveInteger(pageValue);
  const pageSize = pageSizeValue === undefined
    ? 25
    : readPositiveInteger(pageSizeValue);
  if (!page || !pageSize || pageSize > 100) return null;
  return { page, pageSize };
};

export const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const FOLIO_PATTERN = /^FLC-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export const readRouteParam = (value: string | string[] | undefined): string | null =>
  typeof value === 'string' ? value : null;
