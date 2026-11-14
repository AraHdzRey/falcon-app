import { Pool } from 'pg';
import type { FalconConfig } from './env';

export const createPool = (config: FalconConfig): Pool =>
  new Pool({
    ...config.databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
