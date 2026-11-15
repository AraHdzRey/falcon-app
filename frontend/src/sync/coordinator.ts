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
): Promise<{ uploaded: number; serverVersion: number }> => {
  try {
    const pending = await storage.getPendingOperations();
    if (pending.length > 0) {
      const deviceId = pending[0].deviceId;
      const results = await remote.push(token, deviceId, pending);
      await storage.applyOperationResults(results);
    }
    const sinceVersion = await storage.getLocalVersion();
    const snapshot = await remote.pull(token, sinceVersion);
    await storage.applySyncSnapshot(snapshot);
    return { uploaded: pending.length, serverVersion: snapshot.serverVersion };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error de sincronización';
    await storage.markFailure(message);
    throw error;
  }
};
