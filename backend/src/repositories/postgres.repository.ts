import bcrypt from 'bcrypt';
import type { Pool } from 'pg';
import type {
  AuthRepository,
  FalconRole,
  HealthRepository,
  LoginResult,
  SessionUser,
} from '../types/auth';

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
): AuthRepository & HealthRepository => ({
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
    const valid = await bcrypt.compare(password, hash);
    if (!row || !valid) return null;

    const user = toSessionUser(row);
    return user ? { user } : null;
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
});
