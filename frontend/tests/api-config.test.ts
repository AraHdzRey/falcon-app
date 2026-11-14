import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeApiUrl } from '../src/api/client';

test('normaliza una URL LAN configurada', () => {
  assert.equal(
    normalizeApiUrl(' http://192.168.1.20:3000/ '),
    'http://192.168.1.20:3000',
  );
});

test('rechaza localhost para evitar apuntar al teléfono', () => {
  assert.throws(() => normalizeApiUrl('http://localhost:3000'));
});

test('requiere EXPO_PUBLIC_API_URL', () => {
  assert.throws(() => normalizeApiUrl(undefined));
});
