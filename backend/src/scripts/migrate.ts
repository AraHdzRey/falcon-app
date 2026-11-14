import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createPool } from '../config/database';
import { loadConfig } from '../config/env';

const run = async () => {
  const pool = createPool(loadConfig());
  const client = await pool.connect();
  const migrationsPath = path.resolve(__dirname, '../../migrations');

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre TEXT PRIMARY KEY,
        aplicado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(migrationsPath))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();

    for (const file of files) {
      const applied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE nombre = $1',
        [file],
      );
      if (applied.rowCount) continue;

      const sql = await readFile(path.join(migrationsPath, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (nombre) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        console.log(`Migración aplicada: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
};

void run().catch((error) => {
  console.error('No se pudieron aplicar las migraciones:', error);
  process.exitCode = 1;
});
