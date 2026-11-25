import type { SessionUser } from './auth';

export interface DirectoryEntry {
  id: number;
  employeeId: string;
  name: string;
  role: string;
  updatedAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  version: number;
  updatedAt: string;
}

export interface SyncOperation {
  id: string;
  deviceId: string;
  entity: 'news';
  operation: 'upsert';
  baseVersion: number | null;
  payload: {
    id: string;
    title: string;
    body: string;
  };
}

export interface OperationResult {
  id: string;
  status: 'applied' | 'duplicate' | 'conflict';
  version: number | null;
  current?: NewsItem;
}

export interface SyncSnapshot {
  serverVersion: number;
  profile: {
    id: number;
    collaboratorId: number;
    employeeNumber: string;
    name: string;
    role: string;
  };
  directory: DirectoryEntry[];
  news: NewsItem[];
  removedNewsIds: string[];
}

export interface SyncRepository {
  getChanges(user: SessionUser, sinceVersion: number): Promise<SyncSnapshot>;
  applyOperations(
    user: SessionUser,
    operations: SyncOperation[],
  ): Promise<OperationResult[]>;
}
