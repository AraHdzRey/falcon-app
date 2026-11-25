import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { verifyPassword } from '../services/password.service';
import type {
  AuthRepository,
  FalconRole,
  HealthRepository,
  LoginResult,
  SessionUser,
} from '../types/auth';
import type {
  DirectoryEntry,
  NewsItem,
  OperationResult,
  SyncOperation,
  SyncRepository,
  SyncSnapshot,
} from '../types/sync';

const ROLES: ReadonlySet<string> = new Set([
  'colaborador',
  'capital_humano',
  'responsable_quejas',
  'editor_noticias',
  'administrador',
  'director',
  'auditor',
]);

const DUMMY_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.0lVQm1n2A2Vf7fT17Arx4KmOehy4Ngy';

interface AccountRow {
  user_id: number;
  collaborator_id: number;
  employee_number: string;
  name: string;
  password_hash: string;
  token_version: number;
  role: string;
}

const toSessionUser = (row: AccountRow): SessionUser | null => {
  if (!ROLES.has(row.role)) return null;
  return {
    userId: Number(row.user_id),
    collaboratorId: Number(row.collaborator_id),
    employeeNumber: row.employee_number,
    name: row.name,
    role: row.role as FalconRole,
    tokenVersion: Number(row.token_version),
  };
};

const accountSelect = `
  SELECT
    u.id AS user_id,
    c.id AS collaborator_id,
    c.numero_empleado AS employee_number,
    c.nombre AS name,
    u.password_hash,
    u.token_version,
    COALESCE(
      (ARRAY_AGG(r.codigo ORDER BY ur.es_principal DESC, r.id)
        FILTER (WHERE r.codigo IS NOT NULL))[1],
      'colaborador'
    ) AS role
  FROM usuarios AS u
  INNER JOIN colaboradores AS c ON c.id = u.colaborador_id
  LEFT JOIN usuario_roles AS ur ON ur.usuario_id = u.id
  LEFT JOIN roles AS r ON r.id = ur.rol_id
`;

export const createPostgresRepository = (
  pool: Pool,
): AuthRepository & HealthRepository & SyncRepository => ({
  async verifyCredentials(
    employeeNumber: string,
    password: string,
  ): Promise<LoginResult | null> {
    const result = await pool.query<AccountRow>(
      `${accountSelect}
       WHERE UPPER(c.numero_empleado) = UPPER($1)
         AND u.activo = TRUE
         AND c.activo = TRUE
       GROUP BY u.id, c.id
       LIMIT 1`,
      [employeeNumber],
    );

    const row = result.rows[0];
    const hash = row?.password_hash ?? DUMMY_HASH;
    const valid = await verifyPassword(password, hash);
    if (!row || !valid) return null;

    const user = toSessionUser(row);
    if (!user) return null;
    if (user.role === 'administrador') {
      await pool.query(
        `INSERT INTO auditoria_eventos
           (id, evento, actor_usuario_id, entidad, entidad_id, detalles)
         VALUES ($1, 'ADMIN_LOGIN', $2, 'session', $3, $4::jsonb)`,
        [
          randomUUID(),
          user.userId,
          String(user.userId),
          JSON.stringify({ role: user.role }),
        ],
      );
    }
    return { user };
  },

  async getSessionUser(
    userId: number,
    tokenVersion: number,
  ): Promise<SessionUser | null> {
    const result = await pool.query<AccountRow>(
      `${accountSelect}
       WHERE u.id = $1
         AND u.token_version = $2
         AND u.activo = TRUE
         AND c.activo = TRUE
       GROUP BY u.id, c.id
       LIMIT 1`,
      [userId, tokenVersion],
    );
    const row = result.rows[0];
    return row ? toSessionUser(row) : null;
  },

  async revokeSessions(userId: number): Promise<void> {
    await pool.query(
      `UPDATE usuarios
       SET token_version = token_version + 1,
           actualizado_en = NOW()
       WHERE id = $1`,
      [userId],
    );
  },

  async check(): Promise<{ database: string }> {
    const result = await pool.query<{ database: string }>(
      'SELECT current_database() AS database',
    );
    return { database: result.rows[0]?.database ?? 'unknown' };
  },

  async getChanges(
    user: SessionUser,
    sinceVersion: number,
  ): Promise<SyncSnapshot> {
    const [stateResult, directoryResult, newsResult, removedNewsResult] =
      await Promise.all([
        pool.query<{ version: string }>(
          'SELECT version::text FROM sync_state WHERE id = 1',
        ),
        pool.query<DirectoryEntry>(`
          SELECT
            c.id::int AS id,
            c.numero_empleado AS "employeeId",
            c.nombre AS name,
            COALESCE(
              (ARRAY_AGG(r.codigo ORDER BY ur.es_principal DESC, r.id)
                FILTER (WHERE r.codigo IS NOT NULL))[1],
              'colaborador'
            ) AS role,
            c.actualizado_en::text AS "updatedAt"
          FROM colaboradores AS c
          LEFT JOIN usuarios AS u ON u.colaborador_id = c.id AND u.activo = TRUE
          LEFT JOIN usuario_roles AS ur ON ur.usuario_id = u.id
          LEFT JOIN roles AS r ON r.id = ur.rol_id
          WHERE c.activo = TRUE
          GROUP BY c.id
          ORDER BY c.nombre, c.id
        `),
        pool.query<NewsItem>(
          `SELECT
             id::text,
             titulo AS title,
             contenido AS body,
             version::int,
             actualizado_en::text AS "updatedAt"
           FROM noticias
           WHERE activo = TRUE AND version > $1
           ORDER BY version, id`,
          [sinceVersion],
        ),
        pool.query<{ id: string }>(
          `SELECT id::text
           FROM noticias
           WHERE activo = FALSE AND version > $1
           ORDER BY version, id`,
          [sinceVersion],
        ),
      ]);
    return {
      serverVersion: Number(stateResult.rows[0]?.version ?? 0),
      profile: {
        id: user.userId,
        collaboratorId: user.collaboratorId,
        employeeNumber: user.employeeNumber,
        name: user.name,
        role: user.role,
      },
      directory: directoryResult.rows,
      news: newsResult.rows,
      removedNewsIds: removedNewsResult.rows.map((row) => row.id),
    };
  },

  async applyOperations(
    user: SessionUser,
    operations: SyncOperation[],
  ): Promise<OperationResult[]> {
    const client = await pool.connect();
    const results: OperationResult[] = [];
    try {
      await client.query('BEGIN');
      for (const operation of operations) {
        const previous = await client.query<{
          estado: 'applied' | 'conflict';
          applied_version: string | null;
        }>(
          `SELECT estado, applied_version::text
           FROM sync_operations WHERE id = $1`,
          [operation.id],
        );
        if (previous.rows[0]) {
          const current = previous.rows[0].estado === 'conflict'
            ? (
                await client.query<NewsItem>(
                  `SELECT id::text, titulo AS title, contenido AS body,
                          version::int, actualizado_en::text AS "updatedAt"
                   FROM noticias WHERE id = $1`,
                  [operation.payload.id],
                )
              ).rows[0]
            : undefined;
          results.push({
            id: operation.id,
            status:
              previous.rows[0].estado === 'conflict' ? 'conflict' : 'duplicate',
            version: previous.rows[0].applied_version
              ? Number(previous.rows[0].applied_version)
              : null,
            current,
          });
          continue;
        }

        const existing = await client.query<NewsItem>(
          `SELECT id::text, titulo AS title, contenido AS body,
                  version::int, actualizado_en::text AS "updatedAt"
           FROM noticias WHERE id = $1 FOR UPDATE`,
          [operation.payload.id],
        );
        const current = existing.rows[0];
        const conflict = current
          ? operation.baseVersion !== current.version
          : operation.baseVersion !== null;
        if (conflict) {
          await client.query(
            `INSERT INTO sync_operations
               (id, device_id, usuario_id, entidad, operacion, payload, estado)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'conflict')`,
            [
              operation.id,
              operation.deviceId,
              user.userId,
              operation.entity,
              operation.operation,
              JSON.stringify(operation.payload),
            ],
          );
          results.push({
            id: operation.id,
            status: 'conflict',
            version: current?.version ?? null,
            current,
          });
          continue;
        }

        const state = await client.query<{ version: string }>(
          `UPDATE sync_state
           SET version = version + 1, actualizado_en = NOW()
           WHERE id = 1 RETURNING version::text`,
        );
        const nextVersion = Number(state.rows[0]?.version);
        const updated = await client.query<NewsItem>(
          `INSERT INTO noticias
             (id, titulo, contenido, version, creado_por)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE
           SET titulo = EXCLUDED.titulo,
               contenido = EXCLUDED.contenido,
               version = EXCLUDED.version,
               actualizado_en = NOW(),
               activo = TRUE
           RETURNING id::text, titulo AS title, contenido AS body,
                     version::int, actualizado_en::text AS "updatedAt"`,
          [
            operation.payload.id,
            operation.payload.title,
            operation.payload.body,
            nextVersion,
            user.userId,
          ],
        );
        await client.query(
          `INSERT INTO sync_operations
             (id, device_id, usuario_id, entidad, operacion, payload,
              estado, applied_version)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'applied', $7)`,
          [
            operation.id,
            operation.deviceId,
            user.userId,
            operation.entity,
            operation.operation,
            JSON.stringify(operation.payload),
            nextVersion,
          ],
        );
        results.push({
          id: operation.id,
          status: 'applied',
          version: nextVersion,
          current: updated.rows[0],
        });
      }
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
});
