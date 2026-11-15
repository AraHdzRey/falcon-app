import { createPool } from '../config/database';
import { loadConfig } from '../config/env';
import { assertMutableDatabase } from '../database/safety';
import { runMigrations } from './migrate';
import { runSeed } from './seed-dev';

const resetDatabase = async (): Promise<void> => {
  const config = loadConfig();
  assertMutableDatabase(config);
  const pool = createPool(config);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  await runMigrations();
  await runSeed();
  console.log(`Reset reproducible completado en ${config.databaseUrl.database}`);
};

void resetDatabase().catch((error: unknown) => {
  console.error('No se pudo restablecer la base autorizada:', error);
  process.exitCode = 1;
});
