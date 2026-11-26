import { createPool } from '../config/database';
import { loadConfig } from '../config/env';
import {
  seedAuditEvents,
  seedCollaborators,
  seedComplaintCategories,
  seedComplaints,
  seedComplaintStatuses,
  seedNews,
  seedRoles,
} from '../database/seed-data';
import { assertMutableDatabase } from '../database/safety';
import { hashPassword } from '../services/password.service';

export const runSeed = async (): Promise<void> => {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error('DEMO_PASSWORD debe contener entre 12 y 128 caracteres');
  }

  const config = loadConfig();
  assertMutableDatabase(config);
  const passwordHash = await hashPassword(password);
  const pool = createPool(config);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const [code, name] of seedRoles) {
      await client.query(
        `INSERT INTO roles (codigo, nombre)
         VALUES ($1, $2)
         ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre`,
        [code, name],
      );
    }

    const userIds = new Map<string, number>();
    for (const collaborator of seedCollaborators) {
      const collaboratorResult = await client.query<{ id: number }>(
        `INSERT INTO colaboradores
           (numero_empleado, nombre, correo, puesto, area, activo)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (numero_empleado) DO UPDATE
         SET nombre = EXCLUDED.nombre,
             correo = EXCLUDED.correo,
             puesto = EXCLUDED.puesto,
             area = EXCLUDED.area,
             activo = TRUE,
             actualizado_en = NOW()
         RETURNING id`,
        [
          collaborator.employeeNumber,
          collaborator.name,
          collaborator.email,
          collaborator.position,
          collaborator.area,
        ],
      );
      const collaboratorId = collaboratorResult.rows[0]?.id;
      if (!collaboratorId) throw new Error('No se pudo crear colaborador dummy');

      const userResult = await client.query<{ id: number }>(
        `INSERT INTO usuarios
           (colaborador_id, password_hash, activo, token_version)
         VALUES ($1, $2, TRUE, 0)
         ON CONFLICT (colaborador_id) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             activo = TRUE,
             token_version = 0,
             actualizado_en = NOW()
         RETURNING id`,
        [collaboratorId, passwordHash],
      );
      const userId = userResult.rows[0]?.id;
      if (!userId) throw new Error('No se pudo crear cuenta dummy');
      userIds.set(collaborator.employeeNumber, userId);

      await client.query('DELETE FROM usuario_roles WHERE usuario_id = $1', [
        userId,
      ]);
      await client.query(
        `INSERT INTO usuario_roles (usuario_id, rol_id, es_principal)
         SELECT $1, id, TRUE FROM roles WHERE codigo = $2`,
        [userId, collaborator.role],
      );
    }

    const categoryIds = new Map<string, number>();
    for (const [code, name] of seedComplaintCategories) {
      const result = await client.query<{ id: number }>(
        `INSERT INTO categorias_queja (codigo, nombre, activo)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (codigo) DO UPDATE
         SET nombre = EXCLUDED.nombre,
             activo = TRUE,
             actualizado_en = NOW()
         RETURNING id`,
        [code, name],
      );
      categoryIds.set(code, result.rows[0]!.id);
    }
    await client.query(
      `INSERT INTO categorias_queja (codigo, nombre, activo)
       VALUES ('SUGERENCIA', 'Sugerencia', FALSE)
       ON CONFLICT (codigo) DO UPDATE
       SET activo = FALSE,
           actualizado_en = NOW()`,
    );

    const statusIds = new Map<string, number>();
    for (const [code, name, order] of seedComplaintStatuses) {
      const result = await client.query<{ id: number }>(
        `INSERT INTO estados_queja (codigo, nombre, orden)
         VALUES ($1, $2, $3)
         ON CONFLICT (codigo) DO UPDATE
         SET nombre = EXCLUDED.nombre,
             orden = EXCLUDED.orden
         RETURNING id`,
        [code, name, order],
      );
      statusIds.set(code, result.rows[0]!.id);
    }

    const newsAuthorId = userIds.get('TI005');
    if (!newsAuthorId) throw new Error('No existe el editor dummy TI005');
    for (const news of seedNews) {
      await client.query(
        `INSERT INTO noticias
           (id, titulo, contenido, activo, version, creado_por,
            creado_en, actualizado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
         ON CONFLICT (id) DO UPDATE
         SET titulo = EXCLUDED.titulo,
             contenido = EXCLUDED.contenido,
             activo = EXCLUDED.activo,
             version = EXCLUDED.version,
             creado_por = EXCLUDED.creado_por,
             creado_en = EXCLUDED.creado_en,
             actualizado_en = EXCLUDED.actualizado_en`,
        [
          news.id,
          news.title,
          news.body,
          news.active,
          news.version,
          newsAuthorId,
          news.createdAt,
        ],
      );
    }
    await client.query(
      `UPDATE sync_state
       SET version = GREATEST(version, $1), actualizado_en = NOW()
       WHERE id = 1`,
      [seedNews.length],
    );

    for (const complaint of seedComplaints) {
      const submitterId = userIds.get(complaint.employeeNumber);
      if (!submitterId) {
        throw new Error(`No existe el remitente dummy ${complaint.employeeNumber}`);
      }
      await client.query(
        `INSERT INTO quejas
           (id, folio, tipo, categoria_id, gravedad_reportada, gravedad,
            estado_id, remitente_usuario_id, anonima, asunto, descripcion,
            nota_seguimiento, creado_en, actualizado_en, resuelto_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, $10, $11, $12, $12, $13)
         ON CONFLICT (id) DO UPDATE
         SET folio = EXCLUDED.folio,
             tipo = EXCLUDED.tipo,
             categoria_id = EXCLUDED.categoria_id,
             gravedad_reportada = EXCLUDED.gravedad_reportada,
             gravedad = EXCLUDED.gravedad,
             estado_id = EXCLUDED.estado_id,
             remitente_usuario_id = EXCLUDED.remitente_usuario_id,
             anonima = FALSE,
             asunto = EXCLUDED.asunto,
             descripcion = EXCLUDED.descripcion,
             nota_seguimiento = EXCLUDED.nota_seguimiento,
             creado_en = EXCLUDED.creado_en,
             actualizado_en = EXCLUDED.actualizado_en,
             resuelto_en = EXCLUDED.resuelto_en`,
        [
          complaint.id,
          complaint.folio,
          complaint.type,
          categoryIds.get(complaint.category),
          complaint.reportedSeverity,
          complaint.severity,
          statusIds.get(complaint.status),
          submitterId,
          complaint.subject,
          complaint.description,
          complaint.followUpNote,
          complaint.createdAt,
          complaint.resolvedAt,
        ],
      );
    }

    for (const event of seedAuditEvents) {
      const actorId = event.actorEmployeeNumber
        ? userIds.get(event.actorEmployeeNumber)
        : null;
      await client.query(
        `INSERT INTO auditoria_eventos
           (id, evento, actor_usuario_id, entidad, entidad_id, detalles,
            creado_en)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
         ON CONFLICT (id) DO UPDATE
         SET evento = EXCLUDED.evento,
             actor_usuario_id = EXCLUDED.actor_usuario_id,
             entidad = EXCLUDED.entidad,
             entidad_id = EXCLUDED.entidad_id,
             detalles = EXCLUDED.detalles,
             creado_en = EXCLUDED.creado_en`,
        [
          event.id,
          event.event,
          actorId,
          event.entity,
          event.entityId,
          JSON.stringify(event.details),
          event.createdAt,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(
      `Seed sintético listo en ${config.databaseUrl.database}: ` +
        `${seedCollaborators.length} cuentas, ${seedComplaints.length} quejas, ` +
        `${seedNews.length} noticias y ${seedAuditEvents.length} eventos`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

if (require.main === module) {
  void runSeed().catch((error: unknown) => {
    console.error('No se pudo aplicar el seed sintético:', error);
    process.exitCode = 1;
  });
}
