import { createPool } from '../config/database';
import { loadConfig } from '../config/env';
import { assertMutableDatabase } from '../database/safety';

const expectedSeedCounts: Record<string, { expected: number; query: string }> = {
  roles: {
    expected: 7,
    query: `SELECT COUNT(*)::text AS count FROM roles WHERE codigo IN
      ('colaborador', 'capital_humano', 'responsable_quejas',
       'editor_noticias', 'administrador', 'director', 'auditor')`,
  },
  colaboradores: {
    expected: 20,
    query: `SELECT COUNT(*)::text AS count FROM colaboradores
      WHERE numero_empleado ~ '^TI(00[1-9]|01[0-9]|020)$'`,
  },
  usuarios: {
    expected: 20,
    query: `SELECT COUNT(*)::text AS count FROM usuarios u
      JOIN colaboradores c ON c.id = u.colaborador_id
      WHERE c.numero_empleado ~ '^TI(00[1-9]|01[0-9]|020)$'`,
  },
  categorias_queja: {
    expected: 5,
    query: `SELECT COUNT(*)::text AS count FROM categorias_queja
      WHERE activo = TRUE
        AND codigo IN ('AMBIENTE_LABORAL', 'PROCESOS', 'INFRAESTRUCTURA',
                       'SEGURIDAD', 'OTRO')`,
  },
  estados_queja: {
    expected: 4,
    query: `SELECT COUNT(*)::text AS count FROM estados_queja
      WHERE codigo IN ('RECEIVED', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')`,
  },
  quejas: {
    expected: 20,
    query: `SELECT COUNT(*)::text AS count FROM quejas
      WHERE id::text LIKE '10000000-0000-4000-8000-%'`,
  },
  noticias: {
    expected: 10,
    query: `SELECT COUNT(*)::text AS count FROM noticias
      WHERE id::text LIKE '20000000-0000-4000-8000-%'`,
  },
  auditoria_eventos: {
    expected: 15,
    query: `SELECT COUNT(*)::text AS count FROM auditoria_eventos
      WHERE id::text LIKE '30000000-0000-4000-8000-%'`,
  },
};

const verify = async (): Promise<void> => {
  const config = loadConfig();
  assertMutableDatabase(config);
  const pool = createPool(config);
  try {
    const seedCounts: Record<string, number> = {};
    for (const [table, fixture] of Object.entries(expectedSeedCounts)) {
      const result = await pool.query<{ count: string }>(
        fixture.query,
      );
      const count = Number(result.rows[0]?.count ?? -1);
      seedCounts[table] = count;
      if (count !== fixture.expected) {
        throw new Error(
          `${table}: fixtures esperados ${fixture.expected}, obtenidos ${count}`,
        );
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
        (SELECT COUNT(*) FROM quejas
          WHERE anonima = TRUE
            AND id::text LIKE '10000000-0000-4000-8000-%')::text
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
          WHERE numero_empleado ~ '^TI(00[1-9]|01[0-9]|020)$'
            AND correo !~ '^[a-z0-9]+@example\\.test$')::text
          AS invalid_emails,
        (SELECT COUNT(*) FROM usuarios
          WHERE password_hash NOT LIKE '$2%')::text
          AS invalid_hashes,
        (SELECT COUNT(*) FROM auditoria_eventos
          WHERE detalles::text ~* '(password|jwt|secret|token)')::text
          AS sensitive_audit_details
    `);
    const result = privacy.rows[0];
    if (!result || Number(result.anonymous_complaints) !== 0) {
      throw new Error('El seed no debe contener quejas anónimas');
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

    console.log(JSON.stringify({ database: config.databaseUrl.database, seedCounts,
      anonymousComplaints: 0, privacyChecks: 'OK' }));
  } finally {
    await pool.end();
  }
};

void verify().catch((error: unknown) => {
  console.error('Verificación de base fallida:', error);
  process.exitCode = 1;
});
