import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
import { createTokenService } from '../src/services/token.service';
import type {
  AuthRepository,
  HealthRepository,
  LoginResult,
  SessionUser,
} from '../src/types/auth';
import type {
  OperationResult,
  SyncOperation,
  SyncRepository,
  SyncSnapshot,
} from '../src/types/sync';
import type {
  CollaboratorInput,
  CollaboratorUpdate,
  CollaboratorView,
  ComplaintView,
  ModulesRepository,
} from '../src/types/modules';

const collaborator: SessionUser = {
  userId: 10,
  collaboratorId: 20,
  employeeNumber: 'FALCON001',
  name: 'Usuario de prueba',
  role: 'colaborador',
  tokenVersion: 0,
};

class FakeRepository implements AuthRepository, HealthRepository, SyncRepository {
  loginResult: LoginResult | null = { user: collaborator };
  sessionUser: SessionUser | null = collaborator;
  revokedUserId: number | null = null;
  appliedOperations: SyncOperation[] = [];

  async verifyCredentials(): Promise<LoginResult | null> {
    return this.loginResult;
  }

  async getSessionUser(): Promise<SessionUser | null> {
    return this.sessionUser;
  }

  async revokeSessions(userId: number): Promise<void> {
    this.revokedUserId = userId;
  }

  async check(): Promise<{ database: string }> {
    return { database: 'falcon_db_test' };
  }

  async getChanges(user: SessionUser, sinceVersion: number): Promise<SyncSnapshot> {
    void sinceVersion;
    return {
      serverVersion: 4,
      profile: {
        id: user.userId,
        collaboratorId: user.collaboratorId,
        employeeNumber: user.employeeNumber,
        name: user.name,
        role: user.role,
      },
      directory: [],
      news: [],
    };
  }

  async applyOperations(
    _user: SessionUser,
    operations: SyncOperation[],
  ): Promise<OperationResult[]> {
    this.appliedOperations = operations;
    return operations.map((operation) => ({
      id: operation.id,
      status: 'applied' as const,
      version: 5,
    }));
  }
}

const collaboratorView: CollaboratorView = {
  id: 20,
  employeeNumber: 'FALCON001',
  name: 'Usuario de prueba',
  email: 'falcon001@example.test',
  position: 'Analista',
  area: 'TI',
  active: true,
  userActive: true,
  role: 'colaborador',
  updatedAt: '2026-11-16T12:00:00.000Z',
};

const complaintView: ComplaintView = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  folio: 'FLC-ABCD-1234',
  category: { code: 'PROCESOS', name: 'Procesos' },
  status: { code: 'RECIBIDA', name: 'Recibida' },
  anonymous: true,
  subject: 'Caso sintético',
  description: 'Descripción sintética',
  createdAt: '2026-11-16T12:00:00.000Z',
  updatedAt: '2026-11-16T12:00:00.000Z',
  resolvedAt: null,
  submitter: null,
};

class FakeModulesRepository implements ModulesRepository {
  complaintActor: SessionUser | null | undefined;

  async listDirectory(): Promise<CollaboratorView[]> {
    return [collaboratorView];
  }
  async getProfile() {
    return { ...collaboratorView, userId: 10 };
  }
  async listCollaborators() {
    return { items: [collaboratorView], total: 1 };
  }
  async createCollaborator(input: CollaboratorInput) {
    return {
      status: 'ok' as const,
      value: {
        ...collaboratorView,
        employeeNumber: input.employeeNumber,
        name: input.name,
        role: input.role,
      },
    };
  }
  async updateCollaborator(_id: number, input: CollaboratorUpdate) {
    return {
      status: 'ok' as const,
      value: { ...collaboratorView, ...input },
    };
  }
  async deactivateCollaborator() {
    return {
      status: 'ok' as const,
      value: { ...collaboratorView, active: false, userActive: false },
    };
  }
  async reactivateCollaborator() {
    return { status: 'ok' as const, value: collaboratorView };
  }
  async listNews() {
    return [await this.getNews('cccccccc-cccc-4ccc-8ccc-cccccccccccc')].filter(
      (item): item is NonNullable<typeof item> => Boolean(item),
    );
  }
  async getNews(id: string) {
    return {
      id,
      title: 'Noticia sintética',
      body: 'Contenido sintético',
      active: true,
      version: 5,
      createdAt: '2026-11-16T12:00:00.000Z',
      updatedAt: '2026-11-16T12:00:00.000Z',
    };
  }
  async createNews(input: { title: string; body: string }) {
    return { ...(await this.getNews('cccccccc-cccc-4ccc-8ccc-cccccccccccc'))!, ...input };
  }
  async updateNews(id: string, input: { title: string; body: string }) {
    return { ...(await this.getNews(id))!, ...input, version: 6 };
  }
  async listComplaintCategories() {
    return [{ code: 'PROCESOS', name: 'Procesos' }];
  }
  async createComplaint(
    _input: {
      categoryCode: string;
      anonymous: boolean;
      subject: string;
      description: string;
    },
    actor: SessionUser | null,
  ) {
    this.complaintActor = actor;
    return {
      status: 'ok' as const,
      value: { id: complaintView.id, folio: complaintView.folio },
    };
  }
  async trackComplaint() {
    return {
      folio: complaintView.folio,
      status: complaintView.status.code,
      statusName: complaintView.status.name,
      updatedAt: complaintView.updatedAt,
      resolvedAt: null,
    };
  }
  async listComplaints() {
    return { items: [complaintView], total: 1 };
  }
  async getComplaint() {
    return complaintView;
  }
  async updateComplaintStatus() {
    return {
      status: 'ok' as const,
      value: {
        ...complaintView,
        status: { code: 'EN_PROCESO', name: 'En proceso' },
      },
    };
  }
  async listAudit() {
    return {
      items: [{
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        event: 'NEWS_PUBLISHED',
        actorEmployeeNumber: 'FALCON001',
        entity: 'news',
        entityId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        details: { version: 5 },
        createdAt: '2026-11-16T12:00:00.000Z',
      }],
      total: 1,
    };
  }
}

const setup = () => {
  const repository = new FakeRepository();
  const modulesRepository = new FakeModulesRepository();
  const tokens = createTokenService('t'.repeat(64));
  const app = createApp({
    authRepository: repository,
    healthRepository: repository,
    syncRepository: repository,
    modulesRepository,
    tokens,
    corsOrigins: ['http://localhost:8081'],
  });
  return { app, repository, modulesRepository, tokens };
};

test('GET /health responde 200', async () => {
  const { app } = setup();
  const response = await request(app).get('/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('POST /auth/login acepta credenciales válidas', async () => {
  const { app } = setup();
  const response = await request(app).post('/auth/login').send({
    employeeId: 'FALCON001',
    password: 'solo-para-pruebas',
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, 'colaborador');
  assert.equal(typeof response.body.token, 'string');
});

test('POST /auth/login rechaza credenciales incorrectas', async () => {
  const { app, repository } = setup();
  repository.loginResult = null;
  const response = await request(app).post('/auth/login').send({
    employeeId: 'FALCON001',
    password: 'incorrecta',
  });
  assert.equal(response.status, 401);
});

test('POST /auth/login conserva compatibilidad con el contrato heredado', async () => {
  const { app } = setup();
  const response = await request(app).post('/auth/login').send({
    numeroEmpleado: 'FALCON001',
    contrasena: 'solo-para-pruebas',
  });
  assert.equal(response.status, 200);
});

test('GET /auth/me rechaza un usuario inactivo', async () => {
  const { app, repository, tokens } = setup();
  repository.sessionUser = null;
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const response = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 401);
});

test('el endpoint protegido valida el rol', async () => {
  const { app, tokens } = setup();
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const response = await request(app)
    .get('/admin/ping')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 403);
});

test('POST /auth/logout revoca la sesión en el servidor', async () => {
  const { app, repository, tokens } = setup();
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const response = await request(app)
    .post('/auth/logout')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 200);
  assert.equal(repository.revokedUserId, 10);
});

test('GET /sync/changes exige autenticación', async () => {
  const { app } = setup();
  const response = await request(app).get('/sync/changes?sinceVersion=0');
  assert.equal(response.status, 401);
});

test('GET /sync/changes devuelve la versión central', async () => {
  const { app, tokens } = setup();
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const response = await request(app)
    .get('/sync/changes?sinceVersion=0')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.serverVersion, 4);
});

test('POST /sync/operations acepta una operación idempotente válida', async () => {
  const { app, repository, tokens } = setup();
  repository.sessionUser = { ...collaborator, role: 'administrador' };
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const response = await request(app)
    .post('/sync/operations')
    .set('Authorization', `Bearer ${token}`)
    .send({
      deviceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      operations: [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          entity: 'news',
          operation: 'upsert',
          baseVersion: null,
          payload: {
            id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            title: 'Noticia sintética',
            body: 'Contenido exclusivo para pruebas.',
          },
        },
      ],
    });
  assert.equal(response.status, 200);
  assert.equal(response.body.results[0].status, 'applied');
  assert.equal(repository.appliedOperations.length, 1);
});

test('POST /sync/operations rechaza un rol sin permiso editorial', async () => {
  const { app, tokens } = setup();
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const response = await request(app)
    .post('/sync/operations')
    .set('Authorization', `Bearer ${token}`)
    .send({ deviceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', operations: [] });
  assert.equal(response.status, 403);
});

test('GET /directory devuelve sólo el perfil público autenticado', async () => {
  const { app, tokens } = setup();
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const response = await request(app)
    .get('/directory?search=Usuario&area=TI')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.items[0].employeeNumber, 'FALCON001');
  assert.doesNotMatch(JSON.stringify(response.body), /password|tokenVersion|curp|rfc/i);
});

test('GET /profile/me separa perfil funcional de identidad', async () => {
  const { app, tokens } = setup();
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const response = await request(app)
    .get('/profile/me')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.profile.area, 'TI');
});

test('administración de colaboradores exige rol administrador', async () => {
  const { app, tokens } = setup();
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const response = await request(app)
    .post('/admin/collaborators')
    .set('Authorization', `Bearer ${token}`)
    .send({
      employeeNumber: 'FALCON002',
      name: 'Cuenta sintética',
      role: 'colaborador',
      temporaryPassword: 'temporal-sintetica-123',
    });
  assert.equal(response.status, 403);
});

test('administrador puede crear, editar, desactivar y reactivar colaborador', async () => {
  const { app, repository, tokens } = setup();
  repository.sessionUser = { ...collaborator, role: 'administrador' };
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const authorization = { Authorization: `Bearer ${token}` };
  const created = await request(app)
    .post('/admin/collaborators')
    .set(authorization)
    .send({
      employeeNumber: 'FALCON002',
      name: 'Cuenta sintética',
      email: 'falcon002@example.test',
      position: 'Analista',
      area: 'TI',
      role: 'colaborador',
      temporaryPassword: 'temporal-sintetica-123',
    });
  assert.equal(created.status, 201);
  assert.equal('temporaryPassword' in created.body.collaborator, false);
  assert.equal((await request(app).put('/admin/collaborators/20')
    .set(authorization).send({
      name: 'Cuenta actualizada', email: 'falcon002@example.test',
      position: 'Especialista', area: 'TI', role: 'colaborador',
    })).status, 200);
  assert.equal((await request(app).patch('/admin/collaborators/20/deactivate')
    .set(authorization)).status, 200);
  assert.equal((await request(app).patch('/admin/collaborators/20/reactivate')
    .set(authorization)).status, 200);
});

test('noticias requieren autenticación y autorización editorial', async () => {
  const { app, repository, tokens } = setup();
  assert.equal((await request(app).get('/news')).status, 401);
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  assert.equal((await request(app).post('/news')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Nueva', body: 'Contenido' })).status, 403);
  repository.sessionUser = { ...collaborator, role: 'editor_noticias' };
  const created = await request(app).post('/news')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Nueva noticia sintética', body: 'Contenido sintético' });
  assert.equal(created.status, 201);
  const updated = await request(app)
    .patch(`/news/${created.body.news.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Noticia actualizada', body: 'Contenido actualizado' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.news.version, 6);
});

test('queja anónima no enlaza identidad aun con token válido', async () => {
  const { app, modulesRepository, tokens } = setup();
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const response = await request(app).post('/complaints')
    .set('Authorization', `Bearer ${token}`)
    .send({
      categoryCode: 'PROCESOS',
      anonymous: true,
      subject: 'Caso anónimo sintético',
      description: 'Descripción sintética sin datos personales.',
    });
  assert.equal(response.status, 201);
  assert.equal(modulesRepository.complaintActor, null);
  assert.deepEqual(Object.keys(response.body.complaint), ['folio']);
});

test('queja identificada exige y utiliza sesión válida', async () => {
  const { app, modulesRepository, tokens } = setup();
  const body = {
    categoryCode: 'PROCESOS', anonymous: false,
    subject: 'Caso identificado sintético', description: 'Descripción sintética.',
  };
  assert.equal((await request(app).post('/complaints').send(body)).status, 401);
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  assert.equal((await request(app).post('/complaints')
    .set('Authorization', `Bearer ${token}`).send(body)).status, 201);
  assert.equal(modulesRepository.complaintActor?.userId, 10);
});

test('seguimiento por folio devuelve únicamente estado público', async () => {
  const { app } = setup();
  const response = await request(app).get('/complaints/track/FLC-ABCD-1234');
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.body.complaint).sort(), [
    'folio', 'resolvedAt', 'status', 'statusName', 'updatedAt',
  ]);
  assert.doesNotMatch(JSON.stringify(response.body), /submitter|description|audit/i);
});

test('administración de quejas valida rol y permite cambio de estado', async () => {
  const { app, repository, tokens } = setup();
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  assert.equal((await request(app).get('/admin/complaints')
    .set('Authorization', `Bearer ${token}`)).status, 403);
  repository.sessionUser = { ...collaborator, role: 'responsable_quejas' };
  assert.equal((await request(app)
    .patch(`/admin/complaints/${complaintView.id}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ statusCode: 'EN_PROCESO' })).status, 200);
});

test('auditor puede consultar bitácora paginada y colaborador no', async () => {
  const { app, repository, tokens } = setup();
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  assert.equal((await request(app).get('/admin/audit')
    .set('Authorization', `Bearer ${token}`)).status, 403);
  repository.sessionUser = { ...collaborator, role: 'auditor' };
  const response = await request(app).get('/admin/audit?page=1&pageSize=10')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.total, 1);
});
