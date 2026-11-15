import type { FalconUser } from '../api/client';

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
  pending?: boolean;
}

export interface OutboxOperation {
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
  profile: FalconUser;
  directory: DirectoryEntry[];
  news: NewsItem[];
}

export interface LocalDashboard {
  profile: FalconUser | null;
  directory: DirectoryEntry[];
  news: NewsItem[];
  pendingCount: number;
  conflictCount: number;
  lastSync: string | null;
}
