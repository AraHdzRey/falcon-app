import assert from 'node:assert/strict';
import test from 'node:test';

import { createPostgresDirectoryRepository } from
  '../src/infrastructure/postgres/directory.repository';

import type { ModulesRepository } from '../src/types/modules';

test('infraestructura: el adaptador conserva el contrato', async () => {
  const calls: string[] = [];

  const repository: Pick<
    ModulesRepository,
    'listDirectory' | 'getProfile'
  > = {
    async listDirectory(filters) {
      calls.push(`directory:${filters.area}`);

      return [];
    },

    async getProfile(userId) {
      calls.push(`profile:${userId}`);

      return null;
    },
  };

  const adapter = createPostgresDirectoryRepository(repository);

  assert.deepEqual(
    await adapter.listDirectory({ area: 'TI' }),
    [],
  );

  assert.equal(await adapter.getProfile(10), null);

  assert.deepEqual(calls, [
    'directory:TI',
    'profile:10',
  ]);
});
