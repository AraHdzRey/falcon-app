import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { FalconRole, SessionUser } from '../types/auth';
import type {
  AuditView,
  CollaboratorInput,
  CollaboratorUpdate,
  CollaboratorView,
  ComplaintCategoryView,
  ComplaintTrackingView,
  ComplaintView,
  DirectoryFilters,
  ModulesRepository,
  NewsFilters,
  NewsView,
  ProfileView,
} from '../types/modules';

interface CollaboratorRow {
  id: number;
  employeeNumber: string;
  name: string;
  email: string | null;
  position: string | null;
  area: string | null;
  active: boolean;
  userActive: boolean;
  role: FalconRole;
  updatedAt: string;
}

interface ComplaintRow {
  id: string;
  folio: string;
  categoryCode: string;
  categoryName: string;
  statusCode: string;
  statusName: string;
  anonymous: boolean;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  submitterEmployeeNumber: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
}

const collaboratorSelect = `
  SELECT
    c.id::int AS id,
    c.numero_empleado AS "employeeNumber",
    c.nombre AS name,
    c.correo AS email,
    c.puesto AS position,
    c.area,
    c.activo AS active,
    COALESCE(u.activo, FALSE) AS "userActive",
    u.id::int AS "userId",
    COALESCE(
      (ARRAY_AGG(r.codigo ORDER BY ur.es_principal DESC, r.id)
        FILTER (WHERE r.codigo IS NOT NULL))[1],
      'colaborador'
    ) AS role,
    c.actualizado_en::text AS "updatedAt"
  FROM colaboradores c
  LEFT JOIN usuarios u ON u.colaborador_id = c.id
  LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
  LEFT JOIN roles r ON r.id = ur.rol_id
`;

const complaintSelect = `
  SELECT
    q.id::text AS id,
    q.folio,
    cq.codigo AS "categoryCode",
    cq.nombre AS "categoryName",
    eq.codigo AS "statusCode",
    eq.nombre AS "statusName",
    q.anonima AS anonymous,
    q.asunto AS subject,
    q.descripcion AS description,
    q.creado_en::text AS "createdAt",
    q.actualizado_en::text AS "updatedAt",
    q.resuelto_en::text AS "resolvedAt",
    c.numero_empleado AS "submitterEmployeeNumber",
    c.nombre AS "submitterName",
    c.correo AS "submitterEmail"
  FROM quejas q
  JOIN categorias_queja cq ON cq.id = q.categoria_id
  JOIN estados_queja eq ON eq.id = q.estado_id
  LEFT JOIN usuarios u ON u.id = q.remitente_usuario_id
  LEFT JOIN colaboradores c ON c.id = u.colaborador_id
`;

const toComplaint = (row: ComplaintRow): ComplaintView => ({
  id: row.id,
  folio: row.folio,
  category: { code: row.categoryCode, name: row.categoryName },
  status: { code: row.statusCode, name: row.statusName },
  anonymous: row.anonymous,
  subject: row.subject,
  description: row.description,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  resolvedAt: row.resolvedAt,
  submitter: row.anonymous
    ? null
    : {
        employeeNumber: row.submitterEmployeeNumber!,
        name: row.submitterName!,
        email: row.submitterEmail,
      },
});

const appendAudit = async (
  client: PoolClient,
  input: {
    event: string;
    actorUserId: number | null;
    entity: string;
    entityId: string | null;
    details: Record<string, unknown>;
  },
): Promise<void> => {
  await client.query(
    `INSERT INTO auditoria_eventos
       (id, evento, actor_usuario_id, entidad, entidad_id, detalles)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      randomUUID(),
      input.event,
      input.actorUserId,
      input.entity,
      input.entityId,
      JSON.stringify(input.details),
    ],
  );
};

const findCollaborator = async (
  client: PoolClient,
  id: number,
): Promise<CollaboratorView | null> => {
  const result = await client.query<CollaboratorRow>(
    `${collaboratorSelect}
     WHERE c.id = $1
     GROUP BY c.id, u.id`,
    [id],
  );
  return result.rows[0] ?? null;
};

const findComplaint = async (
  client: PoolClient,
  id: string,
): Promise<ComplaintView | null> => {
  const result = await client.query<ComplaintRow>(
    `${complaintSelect} WHERE q.id = $1`,
    [id],
  );
  return result.rows[0] ? toComplaint(result.rows[0]) : null;
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error &&
  (error as { code?: string }).code === '23505';

const countActiveAdministrators = async (client: PoolClient): Promise<number> => {
  const result = await client.query<{ total: string }>(`
    SELECT COUNT(*)::text AS total
    FROM usuarios u
    JOIN colaboradores c ON c.id = u.colaborador_id
    JOIN usuario_roles ur ON ur.usuario_id = u.id AND ur.es_principal = TRUE
    JOIN roles r ON r.id = ur.rol_id
    WHERE u.activo = TRUE AND c.activo = TRUE
      AND r.codigo = 'administrador'
  `);
  return Number(result.rows[0]?.total ?? 0);
};

const generateFolio = (): string => {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const code = Array.from(
    randomBytes(8),
    (value) => alphabet[value & 31],
  ).join('');
  return `FLC-${code.slice(0, 4)}-${code.slice(4)}`;
};

const withClient = async <T>(
  pool: Pool,
  action: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    return await action(client);
  } finally {
    client.release();
  }
};

const withTransaction = async <T>(
  pool: Pool,
  action: (client: PoolClient) => Promise<T>,
): Promise<T> =>
  withClient(pool, async (client) => {
    await client.query('BEGIN');
    try {
      const result = await action(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });

export const createModulesRepository = (pool: Pool): ModulesRepository => ({
  async listDirectory(filters: DirectoryFilters): Promise<CollaboratorView[]> {
    const search = filters.search ? `%${filters.search}%` : null;
    const area = filters.area ? `%${filters.area}%` : null;
    const result = await pool.query<CollaboratorRow>(
      `${collaboratorSelect}
       WHERE c.activo = TRUE
         AND ($1::text IS NULL OR
              c.nombre ILIKE $1 OR c.numero_empleado ILIKE $1 OR
              COALESCE(c.correo, '') ILIKE $1 OR
              COALESCE(c.puesto, '') ILIKE $1)
         AND ($2::text IS NULL OR c.area ILIKE $2)
       GROUP BY c.id, u.id
       ORDER BY c.nombre, c.id
       LIMIT 200`,
      [search, area],
    );
    return result.rows;
  },

  async getProfile(userId: number): Promise<ProfileView | null> {
    const result = await pool.query<CollaboratorRow & { userId: number }>(
      `${collaboratorSelect}
       WHERE u.id = $1 AND c.activo = TRUE AND u.activo = TRUE
       GROUP BY c.id, u.id`,
      [userId],
    );
    return result.rows[0] ?? null;
  },

  async listCollaborators(page, pageSize) {
    const [items, count] = await Promise.all([
      pool.query<CollaboratorRow>(
        `${collaboratorSelect}
         GROUP BY c.id, u.id
         ORDER BY c.nombre, c.id
         LIMIT $1 OFFSET $2`,
        [pageSize, (page - 1) * pageSize],
      ),
      pool.query<{ total: string }>(
        'SELECT COUNT(*)::text AS total FROM colaboradores',
      ),
    ]);
    return { items: items.rows, total: Number(count.rows[0]?.total ?? 0) };
  },

  async createCollaborator(input: CollaboratorInput, actor: SessionUser) {
    try {
      return await withTransaction(pool, async (client) => {
        const role = await client.query<{ id: number }>(
          'SELECT id::int FROM roles WHERE codigo = $1',
          [input.role],
        );
        if (!role.rows[0]) return { status: 'conflict' } as const;
        const collaborator = await client.query<{ id: number }>(
          `INSERT INTO colaboradores
             (numero_empleado, nombre, correo, puesto, area)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id::int`,
          [
            input.employeeNumber,
            input.name,
            input.email,
            input.position,
            input.area,
          ],
        );
        const collaboratorId = collaborator.rows[0]!.id;
        const user = await client.query<{ id: number }>(
          `INSERT INTO usuarios (colaborador_id, password_hash)
           VALUES ($1, $2) RETURNING id::int`,
          [collaboratorId, input.passwordHash],
        );
        await client.query(
          `INSERT INTO usuario_roles (usuario_id, rol_id, es_principal)
           VALUES ($1, $2, TRUE)`,
          [user.rows[0]!.id, role.rows[0].id],
        );
        await appendAudit(client, {
          event: 'COLLABORATOR_CREATED',
          actorUserId: actor.userId,
          entity: 'collaborator',
          entityId: String(collaboratorId),
          details: { employeeNumber: input.employeeNumber, role: input.role },
        });
        return {
          status: 'ok',
          value: (await findCollaborator(client, collaboratorId))!,
        } as const;
      });
    } catch (error) {
      if (isUniqueViolation(error)) return { status: 'conflict' };
      throw error;
    }
  },

  async updateCollaborator(id, input: CollaboratorUpdate, actor) {
    try {
      return await withTransaction(pool, async (client) => {
        const current = await findCollaborator(client, id);
        if (!current) return { status: 'not_found' } as const;
        const role = await client.query<{ id: number }>(
          'SELECT id::int FROM roles WHERE codigo = $1',
          [input.role],
        );
        if (!role.rows[0]) return { status: 'conflict' } as const;
        if (current.role === 'administrador' && input.role !== 'administrador') {
          await client.query(
            'LOCK TABLE usuarios, colaboradores, usuario_roles IN SHARE ROW EXCLUSIVE MODE',
          );
          if (await countActiveAdministrators(client) <= 1) {
            return { status: 'last_admin' } as const;
          }
        }
        await client.query(
          `UPDATE colaboradores
           SET nombre = $2, correo = $3, puesto = $4, area = $5,
               actualizado_en = NOW()
           WHERE id = $1`,
          [id, input.name, input.email, input.position, input.area],
        );
        const user = await client.query<{ id: number }>(
          'SELECT id::int FROM usuarios WHERE colaborador_id = $1',
          [id],
        );
        if (!user.rows[0]) return { status: 'not_found' } as const;
        await client.query('DELETE FROM usuario_roles WHERE usuario_id = $1', [
          user.rows[0].id,
        ]);
        await client.query(
          `INSERT INTO usuario_roles (usuario_id, rol_id, es_principal)
           VALUES ($1, $2, TRUE)`,
          [user.rows[0].id, role.rows[0].id],
        );
        await appendAudit(client, {
          event: current.role === input.role
            ? 'COLLABORATOR_UPDATED'
            : 'ROLE_CHANGED',
          actorUserId: actor.userId,
          entity: 'collaborator',
          entityId: String(id),
          details: { fromRole: current.role, toRole: input.role },
        });
        return {
          status: 'ok',
          value: (await findCollaborator(client, id))!,
        } as const;
      });
    } catch (error) {
      if (isUniqueViolation(error)) return { status: 'conflict' };
      throw error;
    }
  },

  async deactivateCollaborator(id, actor) {
    return withTransaction(pool, async (client) => {
      const current = await findCollaborator(client, id);
      if (!current) return { status: 'not_found' } as const;
      if (current.id === actor.collaboratorId) return { status: 'self_action' } as const;
      if (current.role === 'administrador') {
        await client.query(
          'LOCK TABLE usuarios, colaboradores, usuario_roles IN SHARE ROW EXCLUSIVE MODE',
        );
        if (await countActiveAdministrators(client) <= 1) {
          return { status: 'last_admin' } as const;
        }
      }
      await client.query(
        `UPDATE colaboradores SET activo = FALSE, actualizado_en = NOW()
         WHERE id = $1`,
        [id],
      );
      await client.query(
        `UPDATE usuarios SET activo = FALSE, token_version = token_version + 1,
                            actualizado_en = NOW()
         WHERE colaborador_id = $1`,
        [id],
      );
      await appendAudit(client, {
        event: 'COLLABORATOR_DEACTIVATED',
        actorUserId: actor.userId,
        entity: 'collaborator',
        entityId: String(id),
        details: { employeeNumber: current.employeeNumber },
      });
      return {
        status: 'ok',
        value: (await findCollaborator(client, id))!,
      } as const;
    });
  },

  async reactivateCollaborator(id, actor) {
    return withTransaction(pool, async (client) => {
      const current = await findCollaborator(client, id);
      if (!current) return { status: 'not_found' } as const;
      await client.query(
        `UPDATE colaboradores SET activo = TRUE, actualizado_en = NOW()
         WHERE id = $1`,
        [id],
      );
      await client.query(
        `UPDATE usuarios SET activo = TRUE, token_version = token_version + 1,
                            actualizado_en = NOW()
         WHERE colaborador_id = $1`,
        [id],
      );
      await appendAudit(client, {
        event: 'COLLABORATOR_REACTIVATED',
        actorUserId: actor.userId,
        entity: 'collaborator',
        entityId: String(id),
        details: { employeeNumber: current.employeeNumber },
      });
      return {
        status: 'ok',
        value: (await findCollaborator(client, id))!,
      } as const;
    });
  },

  async listNews(filters: NewsFilters = {}) {
    const escapedSearch = filters.search
      ? `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`
      : null;
    const result = await pool.query<NewsView>(
      `SELECT id::text, titulo AS title, contenido AS body, activo AS active,
              version::int, creado_en::text AS "createdAt",
              actualizado_en::text AS "updatedAt"
       FROM noticias
       WHERE activo = TRUE
         AND ($1::text IS NULL OR
              titulo ILIKE $1 ESCAPE '\\' OR
              contenido ILIKE $1 ESCAPE '\\')
       ORDER BY actualizado_en DESC, id`,
      [escapedSearch],
    );
    return result.rows;
  },

  async getNews(id) {
    const result = await pool.query<NewsView>(
      `SELECT id::text, titulo AS title, contenido AS body, activo AS active,
              version::int, creado_en::text AS "createdAt",
              actualizado_en::text AS "updatedAt"
       FROM noticias WHERE id = $1 AND activo = TRUE`,
      [id],
    );
    return result.rows[0] ?? null;
  },

  async createNews(input, actor) {
    return withTransaction(pool, async (client) => {
      const state = await client.query<{ version: string }>(
        `UPDATE sync_state SET version = version + 1, actualizado_en = NOW()
         WHERE id = 1 RETURNING version::text`,
      );
      const id = randomUUID();
      const result = await client.query<NewsView>(
        `INSERT INTO noticias
           (id, titulo, contenido, version, creado_por)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id::text, titulo AS title, contenido AS body,
                   activo AS active, version::int,
                   creado_en::text AS "createdAt",
                   actualizado_en::text AS "updatedAt"`,
        [id, input.title, input.body, Number(state.rows[0]!.version), actor.userId],
      );
      await appendAudit(client, {
        event: 'NEWS_PUBLISHED',
        actorUserId: actor.userId,
        entity: 'news',
        entityId: id,
        details: { version: result.rows[0]!.version },
      });
      return result.rows[0]!;
    });
  },

  async updateNews(id, input, actor) {
    return withTransaction(pool, async (client) => {
      const existing = await client.query('SELECT 1 FROM noticias WHERE id = $1 FOR UPDATE', [id]);
      if (!existing.rows[0]) return null;
      const state = await client.query<{ version: string }>(
        `UPDATE sync_state SET version = version + 1, actualizado_en = NOW()
         WHERE id = 1 RETURNING version::text`,
      );
      const result = await client.query<NewsView>(
        `UPDATE noticias
         SET titulo = $2, contenido = $3, activo = TRUE, version = $4,
             actualizado_en = NOW()
         WHERE id = $1
         RETURNING id::text, titulo AS title, contenido AS body,
                   activo AS active, version::int,
                   creado_en::text AS "createdAt",
                   actualizado_en::text AS "updatedAt"`,
        [id, input.title, input.body, Number(state.rows[0]!.version)],
      );
      await appendAudit(client, {
        event: 'NEWS_UPDATED',
        actorUserId: actor.userId,
        entity: 'news',
        entityId: id,
        details: { version: result.rows[0]!.version },
      });
      return result.rows[0]!;
    });
  },

  async deactivateNews(id, actor) {
    return withTransaction(pool, async (client) => {
      const existing = await client.query(
        'SELECT 1 FROM noticias WHERE id = $1 AND activo = TRUE FOR UPDATE',
        [id],
      );
      if (!existing.rows[0]) return null;
      const state = await client.query<{ version: string }>(
        `UPDATE sync_state SET version = version + 1, actualizado_en = NOW()
         WHERE id = 1 RETURNING version::text`,
      );
      const result = await client.query<NewsView>(
        `UPDATE noticias
         SET activo = FALSE, version = $2, actualizado_en = NOW()
         WHERE id = $1
         RETURNING id::text, titulo AS title, contenido AS body,
                   activo AS active, version::int,
                   creado_en::text AS "createdAt",
                   actualizado_en::text AS "updatedAt"`,
        [id, Number(state.rows[0]!.version)],
      );
      await appendAudit(client, {
        event: 'NEWS_DEACTIVATED',
        actorUserId: actor.userId,
        entity: 'news',
        entityId: id,
        details: { version: result.rows[0]!.version },
      });
      return result.rows[0]!;
    });
  },

  async listComplaintCategories() {
    const result = await pool.query<ComplaintCategoryView>(`
      SELECT codigo AS code, nombre AS name
      FROM categorias_queja WHERE activo = TRUE ORDER BY nombre, id
    `);
    return result.rows;
  },

  async createComplaint(input, actor) {
    if (!input.anonymous && !actor) return { status: 'conflict' };
    try {
      return await withTransaction(pool, async (client) => {
        const category = await client.query<{ id: number }>(
          'SELECT id::int FROM categorias_queja WHERE codigo = $1 AND activo = TRUE',
          [input.categoryCode],
        );
        const status = await client.query<{ id: number }>(
          `SELECT id::int FROM estados_queja WHERE codigo = 'RECEIVED'`,
        );
        if (!category.rows[0] || !status.rows[0]) {
          return { status: 'conflict' } as const;
        }
        const id = randomUUID();
        const folio = generateFolio();
        await client.query(
          `INSERT INTO quejas
             (id, folio, categoria_id, estado_id, remitente_usuario_id,
              anonima, asunto, descripcion)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            folio,
            category.rows[0].id,
            status.rows[0].id,
            input.anonymous ? null : actor!.userId,
            input.anonymous,
            input.subject,
            input.description,
          ],
        );
        await appendAudit(client, {
          event: 'COMPLAINT_CREATED',
          actorUserId: input.anonymous ? null : actor!.userId,
          entity: 'complaint',
          entityId: id,
          details: {
            anonymous: input.anonymous,
            category: input.categoryCode,
            status: 'RECEIVED',
          },
        });
        return { status: 'ok', value: { id, folio } } as const;
      });
    } catch (error) {
      if (isUniqueViolation(error)) return { status: 'conflict' };
      throw error;
    }
  },

  async trackComplaint(folio) {
    const result = await pool.query<ComplaintTrackingView>(
      `SELECT q.folio, e.codigo AS status, e.nombre AS "statusName",
              q.actualizado_en::text AS "updatedAt",
              q.resuelto_en::text AS "resolvedAt"
       FROM quejas q JOIN estados_queja e ON e.id = q.estado_id
       WHERE q.folio = $1`,
      [folio],
    );
    return result.rows[0] ?? null;
  },

  async listComplaints(page, pageSize) {
    const [items, count] = await Promise.all([
      pool.query<ComplaintRow>(
        `${complaintSelect}
         ORDER BY q.creado_en DESC, q.id
         LIMIT $1 OFFSET $2`,
        [pageSize, (page - 1) * pageSize],
      ),
      pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM quejas'),
    ]);
    return {
      items: items.rows.map(toComplaint),
      total: Number(count.rows[0]?.total ?? 0),
    };
  },

  async getComplaint(id) {
    return withClient(pool, (client) => findComplaint(client, id));
  },

  async updateComplaintStatus(id, statusCode, actor) {
    return withTransaction(pool, async (client) => {
      const current = await findComplaint(client, id);
      if (!current) return { status: 'not_found' } as const;
      const status = await client.query<{ id: number }>(
        'SELECT id::int FROM estados_queja WHERE codigo = $1',
        [statusCode],
      );
      if (!status.rows[0]) return { status: 'conflict' } as const;
      await client.query(
        `UPDATE quejas
         SET estado_id = $2, actualizado_en = NOW(),
             resuelto_en = CASE WHEN $3 = 'RESOLVED' THEN NOW() ELSE NULL END
         WHERE id = $1`,
        [id, status.rows[0].id, statusCode],
      );
      await appendAudit(client, {
        event: 'COMPLAINT_STATUS_CHANGED',
        actorUserId: actor.userId,
        entity: 'complaint',
        entityId: id,
        details: { fromStatus: current.status.code, toStatus: statusCode },
      });
      return {
        status: 'ok',
        value: (await findComplaint(client, id))!,
      } as const;
    });
  },

  async listAudit(page, pageSize) {
    const [items, count] = await Promise.all([
      pool.query<AuditView>(
        `SELECT a.id::text, a.evento AS event,
                c.numero_empleado AS "actorEmployeeNumber",
                a.entidad AS entity, a.entidad_id AS "entityId",
                a.detalles AS details, a.creado_en::text AS "createdAt"
         FROM auditoria_eventos a
         LEFT JOIN usuarios u ON u.id = a.actor_usuario_id
         LEFT JOIN colaboradores c ON c.id = u.colaborador_id
         ORDER BY a.creado_en DESC, a.id
         LIMIT $1 OFFSET $2`,
        [pageSize, (page - 1) * pageSize],
      ),
      pool.query<{ total: string }>(
        'SELECT COUNT(*)::text AS total FROM auditoria_eventos',
      ),
    ]);
    return { items: items.rows, total: Number(count.rows[0]?.total ?? 0) };
  },
});
