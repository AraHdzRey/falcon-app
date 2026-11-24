import assert from 'node:assert/strict';
import test from 'node:test';
import { synchronizeOnce, type SyncRemote, type SyncStorage } from '../src/sync/coordinator';
import type {
  OperationResult,
  OutboxOperation,
  SyncSnapshot,
} from '../src/sync/types';

const operation: OutboxOperation = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  deviceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  entity: 'news',
  operation: 'upsert',
  baseVersion: null,
  payload: {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    title: 'Noticia sintética',
    body: 'Contenido de prueba',
  },
};

const snapshot: SyncSnapshot = {
  serverVersion: 8,
  profile: {
    id: 1,
    collaboratorId: 2,
    employeeNumber: 'TI001',
    name: 'Usuario Demo',
    role: 'administrador',
  },
  directory: [],
  news: [],
};

test('sube el outbox antes de descargar cambios', async () => {
  const events: string[] = [];
  const storage: SyncStorage = {
    async getPendingOperations() {
      events.push('pending');
      return [operation];
    },
    async getLocalVersion() {
      events.push('version');
      return 3;
    },
    async applyOperationResults(results: OperationResult[]) {
      assert.equal(results[0].status, 'applied');
      events.push('ack');
    },
    async applySyncSnapshot(received: SyncSnapshot) {
      assert.equal(received.serverVersion, 8);
      events.push('snapshot');
    },
    async markFailure() {
      events.push('failure');
    },
  };
  const remote: SyncRemote = {
    async push(_token, deviceId, operations) {
      assert.equal(deviceId, operation.deviceId);
      assert.equal(operations.length, 1);
      events.push('push');
      return [{ id: operation.id, status: 'applied', version: 8 }];
    },
    async pull(_token, sinceVersion) {
      assert.equal(sinceVersion, 3);
      events.push('pull');
      return snapshot;
    },
  };
  const result = await synchronizeOnce('token-sintético', storage, remote);
  assert.deepEqual(events, [
    'pending',
    'push',
    'ack',
    'version',
    'pull',
    'snapshot',
  ]);
  assert.deepEqual(result, { uploaded: 1, serverVersion: 8 });
});

test('conserva pendientes y registra el fallo cuando la API no responde', async () => {
  let failure = '';
  const storage: SyncStorage = {
    async getPendingOperations() {
      return [];
    },
    async getLocalVersion() {
      return 3;
    },
    async applyOperationResults() {},
    async applySyncSnapshot() {
      assert.fail('No debe aplicar snapshot sin API');
    },
    async markFailure(message) {
      failure = message;
    },
  };
  const remote: SyncRemote = {
    async push() {
      return [];
    },
    async pull() {
      throw new Error('API no disponible');
    },
  };
  await assert.rejects(
    synchronizeOnce('token-sintético', storage, remote),
    /API no disponible/,
  );
  assert.equal(failure, 'API no disponible');
});
