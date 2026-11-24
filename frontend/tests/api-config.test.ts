import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeApiUrl } from '../src/api/client';

test('normaliza una URL configurada', () => {
  assert.equal(
    normalizeApiUrl(' http://192.0.2.20:3000/ '),
    'http://192.0.2.20:3000',
  );
});

test('rechaza localhost para evitar apuntar al teléfono', () => {
  assert.throws(() => normalizeApiUrl('http://localhost:3000'));
});

test('requiere EXPO_PUBLIC_API_URL', () => {
  assert.throws(() => normalizeApiUrl(undefined));
});
