import { createPool } from '../config/database';
import { loadConfig } from '../config/env';
import { assertMutableDatabase } from '../database/safety';

const expectedCounts: Record<string, number> = {
  roles: 7,
  colaboradores: 20,
  usuarios: 20,
  categorias_queja: 6,
  estados_queja: 4,
  quejas: 20,
  noticias: 10,
  auditoria_eventos: 15,
};

const verify = async (): Promise<void> => {
  const config = loadConfig();
  assertMutableDatabase(config);
  const pool = createPool(config);
  try {
    const counts: Record<string, number> = {};
    for (const [table, expected] of Object.entries(expectedCounts)) {
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM ${table}`,
      );
      const count = Number(result.rows[0]?.count ?? -1);
      counts[table] = count;
      if (count !== expected) {
        throw new Error(`${table}: esperado ${expected}, obtenido ${count}`);
      }
    }

    const privacy = await pool.query<{
      anonymous_complaints: string;
      anonymous_linked: string;
      anonymous_audit_linked: string;
      invalid_emails: string;
      invalid_hashes: string;
      sensitive_audit_details: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM quejas WHERE anonima = TRUE)::text
          AS anonymous_complaints,
        (SELECT COUNT(*) FROM quejas
          WHERE anonima = TRUE AND remitente_usuario_id IS NOT NULL)::text
          AS anonymous_linked,
        (SELECT COUNT(*)
           FROM auditoria_eventos a
           JOIN quejas q ON a.entidad = 'complaint'
                         AND a.entidad_id = q.id::text
          WHERE q.anonima = TRUE AND a.actor_usuario_id IS NOT NULL)::text
          AS anonymous_audit_linked,
        (SELECT COUNT(*) FROM colaboradores
          WHERE correo !~ '^[a-z0-9]+@example\\.test$')::text
          AS invalid_emails,
        (SELECT COUNT(*) FROM usuarios
          WHERE password_hash NOT LIKE '$2%')::text
          AS invalid_hashes,
        (SELECT COUNT(*) FROM auditoria_eventos
          WHERE detalles::text ~* '(password|jwt|secret|token)')::text
          AS sensitive_audit_details
    `);
    const result = privacy.rows[0];
    if (!result || Number(result.anonymous_complaints) !== 5) {
      throw new Error('El seed debe contener exactamente 5 quejas anónimas');
    }
    for (const key of [
      'anonymous_linked',
      'anonymous_audit_linked',
      'invalid_emails',
      'invalid_hashes',
      'sensitive_audit_details',
    ] as const) {
      if (Number(result[key]) !== 0) throw new Error(`${key} debe ser 0`);
    }

    const forbiddenColumns = await pool.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND lower(column_name) IN ('curp', 'rfc')
    `);
    if (Number(forbiddenColumns.rows[0]?.count) !== 0) {
      throw new Error('El esquema reproducible no debe contener CURP/RFC');
    }

    console.log(JSON.stringify({ database: config.databaseUrl.database, counts,
      anonymousComplaints: 5, privacyChecks: 'OK' }));
  } finally {
    await pool.end();
  }
};

void verify().catch((error: unknown) => {
  console.error('Verificación de base fallida:', error);
  process.exitCode = 1;
});
