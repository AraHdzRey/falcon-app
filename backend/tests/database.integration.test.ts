import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
import { createPool } from '../src/config/database';
import { loadConfig } from '../src/config/env';
import { assertTestDatabase } from '../src/database/safety';
import { createPostgresRepository } from '../src/repositories/postgres.repository';
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
  const app = createApp({
    authRepository: repository,
    healthRepository: repository,
    syncRepository: repository,
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
  } finally {
    await pool.end();
  }
  },
);
