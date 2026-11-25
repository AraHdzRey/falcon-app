import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listNews, updateNews } from '../src/api/client';
import {
  NEWS_BODY_MAX_LENGTH,
  NEWS_SEARCH_MAX_LENGTH,
  NEWS_TITLE_MAX_LENGTH,
  filterNewsLocally,
  normalizeNewsSearch,
  validateNewsForm,
} from '../src/features/news/model';
import type { NewsItem } from '../src/sync/types';

const sampleNews: NewsItem[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    title: 'Mantenimiento de sistemas',
    body: 'Ventana programada para actualización de servidores internos.',
    version: 1,
    updatedAt: '2026-11-20T12:00:00.000Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    title: 'Aviso administrativo',
    body: 'Nuevo horario de atención en coordinación.',
    version: 2,
    updatedAt: '2026-11-21T12:00:00.000Z',
    pending: true,
  },
];

const withMockedFetch = async (
  handler: typeof fetch,
  action: () => Promise<void>,
): Promise<void> => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.20:3000';
  globalThis.fetch = handler;
  try {
    await action();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
    }
  }
};

test('filterNewsLocally filtra por título y contenido sin distinguir mayúsculas', () => {
  assert.equal(filterNewsLocally(sampleNews, '').length, 2);
  assert.equal(filterNewsLocally(sampleNews, '   ').length, 2);

  const byTitle = filterNewsLocally(sampleNews, 'MANTENIMIENTO');
  assert.equal(byTitle.length, 1);
  assert.equal(byTitle[0]?.id, sampleNews[0]?.id);

  const byBody = filterNewsLocally(sampleNews, 'COORDINACIÓN');
  assert.equal(byBody.length, 1);
  assert.equal(byBody[0]?.id, sampleNews[1]?.id);

  assert.deepEqual(filterNewsLocally(sampleNews, 'sin-resultados'), []);
});

test('normalizeNewsSearch limpia términos válidos y rechaza inválidos', () => {
  assert.deepEqual(normalizeNewsSearch('   '), { ok: true, value: undefined });
  assert.deepEqual(normalizeNewsSearch('  aviso TI  '), {
    ok: true,
    value: 'aviso TI',
  });
  assert.equal(
    normalizeNewsSearch('a'.repeat(NEWS_SEARCH_MAX_LENGTH)).ok,
    true,
  );
  assert.equal(
    normalizeNewsSearch('a'.repeat(NEWS_SEARCH_MAX_LENGTH + 1)).ok,
    false,
  );
  assert.equal(normalizeNewsSearch('aviso\u0000malo').ok, false);
  assert.equal(normalizeNewsSearch('aviso\nsalto').ok, false);
});

test('validateNewsForm aplica límites de título y contenido y caracteres permitidos', () => {
  const valid = validateNewsForm(
    '  Comunicado oficial  ',
    '  Línea 1\n\tLínea 2\r\nLínea 3  ',
  );
  assert.deepEqual(valid, {
    ok: true,
    value: {
      title: 'Comunicado oficial',
      body: 'Línea 1\n\tLínea 2\r\nLínea 3',
    },
  });

  assert.equal(validateNewsForm('   ', 'Contenido válido').ok, false);
  assert.equal(validateNewsForm('Título válido', '   ').ok, false);
  assert.equal(
    validateNewsForm('a'.repeat(NEWS_TITLE_MAX_LENGTH + 1), 'Contenido').ok,
    false,
  );
  assert.equal(
    validateNewsForm('Título', 'a'.repeat(NEWS_BODY_MAX_LENGTH + 1)).ok,
    false,
  );
  assert.equal(validateNewsForm('Título\ncon salto', 'Contenido').ok, false);
  assert.equal(validateNewsForm('Título', 'Contenido\u0000nulo').ok, false);
  assert.equal(validateNewsForm('Título', 'Contenido\u000bvertical').ok, false);
  assert.equal(validateNewsForm('Título', 'Contenido\u007fdel').ok, false);
});

test('listNews consulta GET /news con y sin ?search= usando Bearer token', async () => {
  const calls: Array<{ url: string; auth: string | undefined }> = [];

  await withMockedFetch(
    (async (input, init) => {
      const headers = new Headers(init?.headers);
      calls.push({
        url: String(input),
        auth: headers.get('Authorization') ?? undefined,
      });
      return new Response(
        JSON.stringify({
          status: 'ok',
          total: 1,
          items: [
            {
              id: sampleNews[0]!.id,
              title: sampleNews[0]!.title,
              body: sampleNews[0]!.body,
              active: true,
              version: 3,
              createdAt: '2026-11-20T12:00:00.000Z',
              updatedAt: '2026-11-20T12:00:00.000Z',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch,
    async () => {
      const all = await listNews('token-demo');
      assert.equal(all.length, 1);
      assert.equal(all[0]?.version, 3);
      assert.equal(all[0]?.pending, false);

      const filtered = await listNews('token-demo', '  mantenimiento TI  ');
      assert.equal(filtered.length, 1);

      await assert.rejects(
        () => listNews('token-demo', 'x'.repeat(NEWS_SEARCH_MAX_LENGTH + 1)),
        /120 caracteres/,
      );
    },
  );

  assert.deepEqual(calls, [
    { url: 'http://192.0.2.20:3000/news', auth: 'Bearer token-demo' },
    {
      url: 'http://192.0.2.20:3000/news?search=mantenimiento%20TI',
      auth: 'Bearer token-demo',
    },
  ]);
});

test('updateNews envía PATCH /news/:id con title y body y maneja errores HTTP', async () => {
  const calls: Array<{
    url: string;
    method: string | undefined;
    auth: string | undefined;
    body: string | undefined;
  }> = [];

  await withMockedFetch(
    (async (input, init) => {
      const headers = new Headers(init?.headers);
      const url = String(input);
      calls.push({
        url,
        method: init?.method,
        auth: headers.get('Authorization') ?? undefined,
        body: typeof init?.body === 'string' ? init.body : undefined,
      });

      if (url.endsWith('/forbidden-id')) {
        return new Response(
          JSON.stringify({ status: 'error', message: 'Permisos insuficientes' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/missing-id')) {
        return new Response(
          JSON.stringify({ status: 'error', message: 'Noticia no encontrada' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          status: 'ok',
          news: {
            id: sampleNews[0]!.id,
            title: 'Título actualizado',
            body: 'Contenido actualizado',
            active: true,
            version: 6,
            createdAt: '2026-11-20T12:00:00.000Z',
            updatedAt: '2026-11-24T16:00:00.000Z',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch,
    async () => {
      const updated = await updateNews('token-editor', sampleNews[0]!.id, {
        title: '  Título actualizado  ',
        body: '  Contenido actualizado  ',
      });
      assert.equal(updated.title, 'Título actualizado');
      assert.equal(updated.version, 6);
      assert.equal(updated.pending, false);

      await assert.rejects(
        () =>
          updateNews('token-editor', 'forbidden-id', {
            title: 'Título',
            body: 'Contenido',
          }),
        /permisos/,
      );

      await assert.rejects(
        () =>
          updateNews('token-editor', 'missing-id', {
            title: 'Título',
            body: 'Contenido',
          }),
        /no existe/,
      );

      await assert.rejects(
        () => updateNews('token-editor', sampleNews[0]!.id, { title: '', body: 'ok' }),
        /obligatorio/,
      );
    },
  );

  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], {
    url: `http://192.0.2.20:3000/news/${sampleNews[0]!.id}`,
    method: 'PATCH',
    auth: 'Bearer token-editor',
    body: JSON.stringify({
      title: 'Título actualizado',
      body: 'Contenido actualizado',
    }),
  });
});
