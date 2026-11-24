/**
 * Normaliza fechas ISO y timestamps textuales de PostgreSQL.
 * Nunca inventa una fecha cuando el valor es invalido.
 */
export const formatNewsDate = (
  input: string | null | undefined,
  includeTime = false,
): string => {
  if (typeof input !== 'string' || !input.trim()) {
    return 'Fecha no disponible';
  }

  const raw = input.trim();
  const parts = raw.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/i,
  );

  let normalized = raw;

  if (parts) {
    const fraction = parts[3]
      ? '.' + parts[3].slice(0, 3).padEnd(3, '0')
      : '';

    const offset = parts[4] ?? '';
    let timezone = offset;

    if (offset && offset.toUpperCase() === 'Z') {
      timezone = 'Z';
    } else if (/^[+-]\d{2}$/.test(offset)) {
      timezone = offset + ':00';
    } else if (/^[+-]\d{4}$/.test(offset)) {
      timezone = offset.slice(0, 3) + ':' + offset.slice(3);
    }

    normalized = parts[1] + 'T' + parts[2] + fraction + timezone;
  }

  const date = new Date(normalized);

  if (!Number.isFinite(date.getTime())) {
    return 'Fecha no disponible';
  }

  return includeTime
    ? date.toLocaleString('es-MX')
    : date.toLocaleDateString('es-MX');
};
