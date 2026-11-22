import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatNewsDate } from '../src/features/news/date';

test('interpreta timestamp PostgreSQL con microsegundos y offset corto', () => {
  const result = formatNewsDate('2026-11-22 00:05:58.123456+00');
  assert.notEqual(result, 'Fecha no disponible');
  assert.doesNotMatch(result, /Invalid Date/);
});

test('interpreta fechas ISO para noticias sincronizadas', () => {
  const result = formatNewsDate('2026-11-22T00:05:58.123Z', true);
  assert.notEqual(result, 'Fecha no disponible');
});

test('interpreta offset de PostgreSQL sin dos puntos', () => {
  const result = formatNewsDate('2026-11-22 00:05:58.123456-0600');
  assert.notEqual(result, 'Fecha no disponible');
});

test('no inventa fechas ausentes o invalidas', () => {
  assert.equal(formatNewsDate(''), 'Fecha no disponible');
  assert.equal(formatNewsDate(undefined), 'Fecha no disponible');
  assert.equal(formatNewsDate('valor-invalido'), 'Fecha no disponible');
  assert.equal(
    formatNewsDate('2026-13-99 00:05:58+00'),
    'Fecha no disponible',
  );
});
