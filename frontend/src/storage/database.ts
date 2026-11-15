import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import type { FalconUser } from '../api/client';
import type {
  LocalDashboard,
  NewsItem,
  OperationResult,
  OutboxOperation,
  SyncSnapshot,
} from '../sync/types';

const DATABASE_NAME = 'falcon_local.db';
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const database = (): Promise<SQLite.SQLiteDatabase> => {
  databasePromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);
  return databasePromise;
};

interface MetadataRow {
  value: string;
}

interface OutboxRow {
  id: string;
  device_id: string;
  entity: 'news';
  operation: 'upsert';
  payload: string;
  base_version: number | null;
}

export const initializeDatabase = async (): Promise<void> => {
  const db = await database();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS directory_cache (
      id INTEGER PRIMARY KEY NOT NULL,
      employee_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS news_cache (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      pending INTEGER NOT NULL DEFAULT 0 CHECK (pending IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY NOT NULL,
      device_id TEXT NOT NULL,
      entity TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      base_version INTEGER,
      created_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (sync_status IN ('pending', 'conflict')),
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
  `);
};

const getMetadata = async (key: string): Promise<string | null> => {
  const db = await database();
  const row = await db.getFirstAsync<MetadataRow>(
    'SELECT value FROM sync_metadata WHERE key = ?',
    key,
  );
  return row?.value ?? null;
};

const setMetadata = async (key: string, value: string): Promise<void> => {
  const db = await database();
  await db.runAsync(
    `INSERT INTO sync_metadata (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
};

export const getOrCreateDeviceId = async (): Promise<string> => {
  const existing = await getMetadata('device_id');
  if (existing) return existing;
  const value = Crypto.randomUUID();
  await setMetadata('device_id', value);
  return value;
};

export const cacheProfile = async (
  profile: FalconUser,
  expiresAt: number,
): Promise<void> => {
  const db = await database();
  await db.runAsync(
    `INSERT INTO cached_profile (id, data, expires_at, updated_at)
     VALUES (1, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       data = excluded.data,
       expires_at = excluded.expires_at,
       updated_at = excluded.updated_at`,
    JSON.stringify(profile),
    expiresAt,
    new Date().toISOString(),
  );
};

export const queueDemoNews = async (
  title: string,
  body: string,
): Promise<NewsItem> => {
  const db = await database();
  const deviceId = await getOrCreateDeviceId();
  const newsId = Crypto.randomUUID();
  const operationId = Crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  const payload = { id: newsId, title, body };
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO news_cache
         (id, title, body, version, updated_at, pending)
       VALUES (?, ?, ?, 0, ?, 1)`,
      newsId,
      title,
      body,
      updatedAt,
    );
    await transaction.runAsync(
      `INSERT INTO outbox
         (id, device_id, entity, operation, payload, base_version, created_at)
       VALUES (?, ?, 'news', 'upsert', ?, NULL, ?)`,
      operationId,
      deviceId,
      JSON.stringify(payload),
      updatedAt,
    );
  });
  return { id: newsId, title, body, version: 0, updatedAt, pending: true };
};

export const getPendingOperations = async (): Promise<OutboxOperation[]> => {
  const db = await database();
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT id, device_id, entity, operation, payload, base_version
     FROM outbox WHERE sync_status = 'pending'
     ORDER BY created_at, id LIMIT 50`,
  );
  return rows.map((row) => ({
    id: row.id,
    deviceId: row.device_id,
    entity: row.entity,
    operation: row.operation,
    baseVersion: row.base_version,
    payload: JSON.parse(row.payload) as OutboxOperation['payload'],
  }));
};

export const getLocalVersion = async (): Promise<number> => {
  const value = await getMetadata('server_version');
  const version = Number(value ?? 0);
  return Number.isSafeInteger(version) && version >= 0 ? version : 0;
};

export const applyOperationResults = async (
  results: OperationResult[],
): Promise<void> => {
  const db = await database();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    for (const result of results) {
      const operation = await transaction.getFirstAsync<OutboxRow>(
        `SELECT id, device_id, entity, operation, payload, base_version
         FROM outbox WHERE id = ?`,
        result.id,
      );
      if (!operation) continue;
      const payload = JSON.parse(operation.payload) as OutboxOperation['payload'];
      if (result.status === 'conflict') {
        await transaction.runAsync(
          `UPDATE outbox SET sync_status = 'conflict',
             last_error = 'Conflicto: prevalece la versión del servidor'
           WHERE id = ?`,
          result.id,
        );
        if (result.current) {
          await transaction.runAsync(
            `INSERT INTO news_cache
               (id, title, body, version, updated_at, pending)
             VALUES (?, ?, ?, ?, ?, 0)
             ON CONFLICT (id) DO UPDATE SET
               title = excluded.title,
               body = excluded.body,
               version = excluded.version,
               updated_at = excluded.updated_at,
               pending = 0`,
            result.current.id,
            result.current.title,
            result.current.body,
            result.current.version,
            result.current.updatedAt,
          );
        }
        continue;
      }
      await transaction.runAsync('DELETE FROM outbox WHERE id = ?', result.id);
      await transaction.runAsync(
        `UPDATE news_cache SET pending = 0, version = COALESCE(?, version)
         WHERE id = ?`,
        result.version,
        payload.id,
      );
    }
  });
};

export const applySyncSnapshot = async (
  snapshot: SyncSnapshot,
): Promise<void> => {
  const db = await database();
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      'UPDATE cached_profile SET data = ?, updated_at = ? WHERE id = 1',
      JSON.stringify(snapshot.profile),
      now,
    );
    await transaction.runAsync('DELETE FROM directory_cache');
    for (const entry of snapshot.directory) {
      await transaction.runAsync(
        `INSERT INTO directory_cache
           (id, employee_id, name, role, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        entry.id,
        entry.employeeId,
        entry.name,
        entry.role,
        entry.updatedAt,
      );
    }
    for (const news of snapshot.news) {
      await transaction.runAsync(
        `INSERT INTO news_cache
           (id, title, body, version, updated_at, pending)
         VALUES (?, ?, ?, ?, ?, 0)
         ON CONFLICT (id) DO UPDATE SET
           title = excluded.title,
           body = excluded.body,
           version = excluded.version,
           updated_at = excluded.updated_at,
           pending = 0`,
        news.id,
        news.title,
        news.body,
        news.version,
        news.updatedAt,
      );
    }
    await transaction.runAsync(
      `INSERT INTO sync_metadata (key, value) VALUES ('server_version', ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      String(snapshot.serverVersion),
    );
    await transaction.runAsync(
      `INSERT INTO sync_metadata (key, value) VALUES ('last_sync', ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      now,
    );
  });
};

export const markPendingSyncFailure = async (message: string): Promise<void> => {
  const db = await database();
  await db.runAsync(
    `UPDATE outbox SET retry_count = retry_count + 1, last_error = ?
     WHERE sync_status = 'pending'`,
    message.slice(0, 300),
  );
};

export const loadLocalDashboard = async (): Promise<LocalDashboard> => {
  const db = await database();
  const [profileRow, directory, news, pendingRow, conflictRow, lastSync] =
    await Promise.all([
      db.getFirstAsync<{ data: string }>('SELECT data FROM cached_profile WHERE id = 1'),
      db.getAllAsync<{
        id: number;
        employee_id: string;
        name: string;
        role: string;
        updated_at: string;
      }>('SELECT * FROM directory_cache ORDER BY name, id'),
      db.getAllAsync<{
        id: string;
        title: string;
        body: string;
        version: number;
        updated_at: string;
        pending: number;
      }>('SELECT * FROM news_cache ORDER BY updated_at DESC, id'),
      db.getFirstAsync<{ total: number }>(
        "SELECT COUNT(*) AS total FROM outbox WHERE sync_status = 'pending'",
      ),
      db.getFirstAsync<{ total: number }>(
        "SELECT COUNT(*) AS total FROM outbox WHERE sync_status = 'conflict'",
      ),
      getMetadata('last_sync'),
    ]);
  return {
    profile: profileRow ? (JSON.parse(profileRow.data) as FalconUser) : null,
    directory: directory.map((entry) => ({
      id: entry.id,
      employeeId: entry.employee_id,
      name: entry.name,
      role: entry.role,
      updatedAt: entry.updated_at,
    })),
    news: news.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      version: item.version,
      updatedAt: item.updated_at,
      pending: item.pending === 1,
    })),
    pendingCount: pendingRow?.total ?? 0,
    conflictCount: conflictRow?.total ?? 0,
    lastSync,
  };
};
