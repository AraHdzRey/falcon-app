import { pullSyncChanges, pushSyncOperations } from '../api/client';
import {
  applyOperationResults,
  applySyncSnapshot,
  getLocalVersion,
  getPendingOperations,
  markPendingSyncFailure,
} from '../storage/database';
import { synchronizeOnce } from './coordinator';

export const runSynchronization = async (
  token: string,
  userId: number,
  isCurrent: () => boolean,
) =>
  synchronizeOnce(
    token,
    {
      getPendingOperations: () => getPendingOperations(userId),
      getLocalVersion: () => getLocalVersion(userId),
      applyOperationResults: (results) => applyOperationResults(userId, results),
      applySyncSnapshot: (snapshot) => applySyncSnapshot(userId, snapshot),
      markFailure: (message) => markPendingSyncFailure(userId, message),
    },
    {
      push: pushSyncOperations,
      pull: pullSyncChanges,
    },
    isCurrent,
  );
