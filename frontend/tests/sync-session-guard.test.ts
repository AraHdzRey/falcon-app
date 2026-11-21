import assert from 'node:assert/strict';
import test from 'node:test';
import {
  synchronizeOnce,
  type SyncRemote,
  type SyncStorage,
} from '../src/sync/coordinator';
import type {
  OperationResult,
  OutboxOperation,
  SyncSnapshot,
} from '../src/sync/types';

const snapshot: SyncSnapshot = {
  serverVersion: 4,
  profile: {
    id: 10,
    collaboratorId: 1,
    employeeNumber: 'FALCON001',
    name: 'Usuario de prueba',
    role: 'colaborador',
  },
  directory: [],
  news: [],
};

const storageFor = (
  calls: string[],
  pending: OutboxOperation[] = [],
): SyncStorage => ({
  getPendingOperations: async () => pending,
  getLocalVersion: async () => 0,
  applyOperationResults: async () => {
    calls.push('apply-results');
  },
  applySyncSnapshot: async () => {
    calls.push('apply-snapshot');
  },
  markFailure: async () => {
    calls.push('mark-failure');
  },
});

test('una respuesta pull tardia no modifica datos locales', async () => {
  const calls: string[] = [];
  let active = true;
  let release!: (value: SyncSnapshot) => void;
  let notifyStarted!: () => void;

  const started = new Promise<void>((resolve) => {
    notifyStarted = resolve;
  });

  const remote: SyncRemote = {
    push: async () => [],
    pull: () => {
      notifyStarted();
      return new Promise<SyncSnapshot>((resolve) => {
        release = resolve;
      });
    },
  };

  const operation = synchronizeOnce(
    'token-A',
    storageFor(calls),
    remote,
    () => active,
  );

  await started;
  active = false;
  release(snapshot);

  await assert.rejects(operation, /cambio de sesion/);
  assert.deepEqual(calls, []);
});

test('una respuesta push tardia no altera el outbox local', async () => {
  const calls: string[] = [];
  let active = true;
  let release!: (value: OperationResult[]) => void;
  let notifyStarted!: () => void;

  const started = new Promise<void>((resolve) => {
    notifyStarted = resolve;
  });

  const pending: OutboxOperation[] = [{
    id: 'operation-1',
    deviceId: 'device-1',
    entity: 'news',
    operation: 'upsert',
    baseVersion: null,
    payload: {
      id: 'news-1',
      title: 'Prueba',
      body: 'Contenido',
    },
  }];

  const remote: SyncRemote = {
    push: () => {
      notifyStarted();
      return new Promise<OperationResult[]>((resolve) => {
        release = resolve;
      });
    },
    pull: async () => {
      throw new Error('No debe ejecutarse pull');
    },
  };

  const operation = synchronizeOnce(
    'token-A',
    storageFor(calls, pending),
    remote,
    () => active,
  );

  await started;
  active = false;
  release([]);

  await assert.rejects(operation, /cambio de sesion/);
  assert.deepEqual(calls, []);
});
