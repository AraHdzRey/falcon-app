import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
import { createPool } from '../src/config/database';
import { loadConfig } from '../src/config/env';
import { assertTestDatabase } from '../src/database/safety';
import { createPostgresRepository } from '../src/repositories/postgres.repository';
import { createModulesRepository } from '../src/repositories/modules.repository';
import { createTokenService } from '../src/services/token.service';

test(
  'falcon_test valida autenticación, roles y privacidad',
  { skip: process.env.RUN_DB_INTEGRATION !== '1' },
  async () => {
  const password = process.env.DEMO_PASSWORD;
  assert.ok(password, 'DEMO_PASSWORD es obligatorio para test:db');

  const config = loadConfig();
  assertTestDatabase(config);
  const pool = createPool(config);
  const repository = createPostgresRepository(pool);
  const modulesRepository = createModulesRepository(pool);
  const app = createApp({
    authRepository: repository,
    healthRepository: repository,
    syncRepository: repository,
    modulesRepository,
    tokens: createTokenService(config.jwtSecret),
  });

  try {
    const validAdmin = await request(app)
      .post('/auth/login')
      .send({ employeeId: 'TI001', password })
      .expect(200);
    assert.equal(validAdmin.body.user.role, 'administrador');
    assert.equal('passwordHash' in validAdmin.body.user, false);
    const adminToken = String(validAdmin.body.token);
    const adminUserId = Number(validAdmin.body.user.id);
    const adminLoginAudit = await pool.query<{
      actorUserId: string;
      entityId: string;
    }>(
      `SELECT actor_usuario_id::text AS "actorUserId",
              entidad_id AS "entityId"
       FROM auditoria_eventos
       WHERE evento = 'ADMIN_LOGIN' AND actor_usuario_id = $1
       ORDER BY creado_en DESC
       LIMIT 1`,
      [adminUserId],
    );
    assert.equal(adminLoginAudit.rows[0]?.actorUserId, String(adminUserId));
    assert.equal(adminLoginAudit.rows[0]?.entityId, String(adminUserId));

    await request(app)
      .post('/auth/login')
      .send({ employeeId: 'TI001', password: 'incorrecta-sintetica' })
      .expect(401);
    await request(app)
      .post('/auth/login')
      .send({ employeeId: 'NO_EXISTE', password })
      .expect(401);

    const inactive = await pool.query<{ id: number }>(`
      SELECT u.id
      FROM usuarios u
      JOIN colaboradores c ON c.id = u.colaborador_id
      WHERE c.numero_empleado = 'TI002'
    `);
    const inactiveId = inactive.rows[0]?.id;
    assert.ok(inactiveId);
    await pool.query('UPDATE usuarios SET activo = FALSE WHERE id = $1', [
      inactiveId,
    ]);
    try {
      await request(app)
        .post('/auth/login')
        .send({ employeeId: 'TI002', password })
        .expect(401);
    } finally {
      await pool.query('UPDATE usuarios SET activo = TRUE WHERE id = $1', [
        inactiveId,
      ]);
    }

    const validCollaborator = await request(app)
      .post('/auth/login')
      .send({ employeeId: 'TI002', password })
      .expect(200);
    const collaboratorToken = String(validCollaborator.body.token);

    await request(app)
      .get('/admin/ping')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app)
      .get('/admin/ping')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(403);

    const changes = await request(app)
      .get('/sync/changes?sinceVersion=0')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const serializedDirectory = JSON.stringify(changes.body.directory);
    assert.doesNotMatch(serializedDirectory, /curp|rfc|passwordHash/i);

    const directory = await request(app)
      .get('/directory?area=TI')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.ok(directory.body.items.length > 0);
    assert.doesNotMatch(JSON.stringify(directory.body), /password|tokenVersion|curp|rfc/i);

    const syntheticEmployee = `QA${Date.now().toString(36).toUpperCase()}`;
    const createdCollaborator = await request(app)
      .post('/admin/collaborators')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeNumber: syntheticEmployee,
        name: 'Integración Sintética',
        email: `${syntheticEmployee.toLowerCase()}@example.test`,
        position: 'Analista QA',
        area: 'TI',
        role: 'colaborador',
        temporaryPassword: password,
      })
      .expect(201);
    const collaboratorId = Number(createdCollaborator.body.collaborator.id);
    assert.ok(collaboratorId > 0);
    assert.equal('temporaryPassword' in createdCollaborator.body.collaborator, false);
    await request(app)
      .put(`/admin/collaborators/${collaboratorId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Integración Sintética Actualizada',
        email: `${syntheticEmployee.toLowerCase()}@example.test`,
        position: 'Especialista QA',
        area: 'TI',
        role: 'colaborador',
      })
      .expect(200);
    await request(app)
      .patch(`/admin/collaborators/${collaboratorId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app)
      .patch(`/admin/collaborators/${collaboratorId}/reactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const news = await request(app)
      .post('/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Noticia de integración sintética',
        body: 'Contenido ficticio para validar REST y sincronización.',
      })
      .expect(201);
    const newsId = String(news.body.news.id);
    const firstVersion = Number(news.body.news.version);
    assert.ok(firstVersion > 0);
    const syncedNews = await request(app)
      .get(`/sync/changes?sinceVersion=${firstVersion - 1}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.ok(syncedNews.body.news.some((item: { id: string }) => item.id === newsId));
    const updatedNews = await request(app)
      .patch(`/news/${newsId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Noticia de integración actualizada',
        body: 'Contenido ficticio actualizado.',
      })
      .expect(200);
    assert.ok(Number(updatedNews.body.news.version) > firstVersion);

    const anonymousComplaint = await request(app)
      .post('/complaints')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({
        categoryCode: 'PROCESOS',
        anonymous: true,
        subject: 'Queja anónima sintética',
        description: 'Descripción de integración sin identidad personal.',
      })
      .expect(201);
    const anonymousFolio = String(anonymousComplaint.body.complaint.folio);
    assert.deepEqual(Object.keys(anonymousComplaint.body.complaint), ['folio']);
    const anonymousPrivacy = await pool.query<{
      id: string;
      submitter: number | null;
      auditActor: number | null;
    }>(`
      SELECT q.id::text AS id, q.remitente_usuario_id AS submitter,
             a.actor_usuario_id AS "auditActor"
      FROM quejas q
      JOIN auditoria_eventos a
        ON a.entidad = 'complaint' AND a.entidad_id = q.id::text
      WHERE q.folio = $1 AND a.evento = 'COMPLAINT_CREATED'
    `, [anonymousFolio]);
    assert.equal(anonymousPrivacy.rows[0]?.submitter, null);
    assert.equal(anonymousPrivacy.rows[0]?.auditActor, null);

    const identifiedComplaint = await request(app)
      .post('/complaints')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({
        categoryCode: 'PROCESOS',
        anonymous: false,
        subject: 'Queja identificada sintética',
        description: 'Descripción ficticia para integración.',
      })
      .expect(201);
    const identifiedFolio = String(identifiedComplaint.body.complaint.folio);
    const identifiedRow = await pool.query<{ id: string; submitter: number | null }>(
      `SELECT id::text, remitente_usuario_id AS submitter
       FROM quejas WHERE folio = $1`,
      [identifiedFolio],
    );
    assert.ok(identifiedRow.rows[0]?.submitter);
    const tracking = await request(app)
      .get(`/complaints/track/${anonymousFolio}`)
      .expect(200);
    assert.deepEqual(Object.keys(tracking.body.complaint).sort(), [
      'folio', 'resolvedAt', 'status', 'statusName', 'updatedAt',
    ]);
    await request(app)
      .patch(`/admin/complaints/${identifiedRow.rows[0]!.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusCode: 'UNDER_REVIEW' })
      .expect(200);
    await request(app)
      .get('/admin/audit?page=1&pageSize=100')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const privacy = await pool.query<{
      anonymous_linked: string;
      anonymous_audit_linked: string;
      sensitive_audit_details: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM quejas
          WHERE anonima AND remitente_usuario_id IS NOT NULL)::text
          AS anonymous_linked,
        (SELECT COUNT(*)
           FROM auditoria_eventos a
           JOIN quejas q ON a.entidad = 'complaint'
                         AND a.entidad_id = q.id::text
          WHERE q.anonima AND a.actor_usuario_id IS NOT NULL)::text
          AS anonymous_audit_linked,
        (SELECT COUNT(*) FROM auditoria_eventos
          WHERE detalles::text ~* '(password|jwt|secret|token)')::text
          AS sensitive_audit_details
    `);
    assert.deepEqual(privacy.rows[0], {
      anonymous_linked: '0',
      anonymous_audit_linked: '0',
      sensitive_audit_details: '0',
    });

    await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(401);
  } finally {
    await pool.end();
  }
  },
);
