import type {
  OperationResult,
  OutboxOperation,
  SyncSnapshot,
} from './types';

export interface SyncStorage {
  getPendingOperations(): Promise<OutboxOperation[]>;
  getLocalVersion(): Promise<number>;
  applyOperationResults(results: OperationResult[]): Promise<void>;
  applySyncSnapshot(snapshot: SyncSnapshot): Promise<void>;
  markFailure(message: string): Promise<void>;
}

export interface SyncRemote {
  push(
    token: string,
    deviceId: string,
    operations: OutboxOperation[],
  ): Promise<OperationResult[]>;
  pull(token: string, sinceVersion: number): Promise<SyncSnapshot>;
}

export const synchronizeOnce = async (
  token: string,
  storage: SyncStorage,
  remote: SyncRemote,
  isCurrent: () => boolean = () => true,
): Promise<{ uploaded: number; serverVersion: number }> => {
  const assertCurrent = () => {
    if (!isCurrent()) {
      throw new Error('Sincronizacion cancelada por cambio de sesion');
    }
  };

  try {
    assertCurrent();
    const pending = await storage.getPendingOperations();
    assertCurrent();
    if (pending.length > 0) {
      const deviceId = pending[0].deviceId;
      const results = await remote.push(token, deviceId, pending);
      assertCurrent();
      await storage.applyOperationResults(results);
      assertCurrent();
    }
    assertCurrent();
    const sinceVersion = await storage.getLocalVersion();
    assertCurrent();
    const snapshot = await remote.pull(token, sinceVersion);
    assertCurrent();
    await storage.applySyncSnapshot(snapshot);
    assertCurrent();
    return { uploaded: pending.length, serverVersion: snapshot.serverVersion };
  } catch (error) {
    if (!isCurrent()) {
      throw new Error('Sincronizacion cancelada por cambio de sesion');
    }
    const message = error instanceof Error ? error.message : 'Error de sincronización';
    await storage.markFailure(message);
    throw error;
  }
};
