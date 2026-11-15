import { pullSyncChanges, pushSyncOperations } from '../api/client';
import {
  applyOperationResults,
  applySyncSnapshot,
  getLocalVersion,
  getPendingOperations,
  markPendingSyncFailure,
} from '../storage/database';
import { synchronizeOnce } from './coordinator';

export const runSynchronization = async (token: string) =>
  synchronizeOnce(
    token,
    {
      getPendingOperations,
      getLocalVersion,
      applyOperationResults,
      applySyncSnapshot,
      markFailure: markPendingSyncFailure,
    },
    {
      push: pushSyncOperations,
      pull: pullSyncChanges,
    },
  );
