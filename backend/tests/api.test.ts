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
  NewsFilters,
  NewsView,
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
  status: { code: 'RECEIVED', name: 'Recibida' },
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
  deactivationStatus: 'ok' | 'self_action' | 'last_admin' = 'ok';
  newsItems: NewsView[] = [
    {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      title: 'Mantenimiento de sistemas',
      body: 'Ventana programada de soporte técnico durante el fin de semana.',
      active: true,
      version: 5,
      createdAt: '2026-11-16T12:00:00.000Z',
      updatedAt: '2026-11-16T12:00:00.000Z',
    },
    {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccd',
      title: 'Aviso administrativo',
      body: 'Nuevo horario de atención para la coordinación interna.',
      active: true,
      version: 4,
      createdAt: '2026-11-15T12:00:00.000Z',
      updatedAt: '2026-11-15T12:00:00.000Z',
    },
  ];

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
    if (this.deactivationStatus !== 'ok') {
      return { status: this.deactivationStatus } as const;
    }
    return {
      status: 'ok' as const,
      value: { ...collaboratorView, active: false, userActive: false },
    };
  }
  async reactivateCollaborator() {
    return { status: 'ok' as const, value: collaboratorView };
  }
  async listNews(filters?: NewsFilters) {
    const search = filters?.search?.toLowerCase();
    return this.newsItems.filter((item) => {
      if (!item.active) return false;
      if (!search) return true;
      return (
        item.title.toLowerCase().includes(search) ||
        item.body.toLowerCase().includes(search)
      );
    });
  }
  async getNews(id: string) {
    return this.newsItems.find((item) => item.id === id && item.active) ?? null;
  }
  async createNews(input: { title: string; body: string }) {
    const id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const created: NewsView = {
      id,
      title: input.title,
      body: input.body,
      active: true,
      version: 5,
      createdAt: '2026-11-16T12:00:00.000Z',
      updatedAt: '2026-11-16T12:00:00.000Z',
    };
    const index = this.newsItems.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.newsItems[index] = created;
    } else {
      this.newsItems.unshift(created);
    }
    return created;
  }
  async updateNews(id: string, input: { title: string; body: string }) {
    const index = this.newsItems.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const current = this.newsItems[index]!;
    const updated: NewsView = {
      ...current,
      ...input,
      active: true,
      version: current.version + 1,
    };
    this.newsItems[index] = updated;
    return updated;
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
        status: { code: 'UNDER_REVIEW', name: 'En revisión' },
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

test('OpenAPI y Swagger exponen el contrato unificado', async () => {
  const { app } = setup();
  const contract = await request(app).get('/openapi.json');
  assert.equal(contract.status, 200);
  assert.equal(contract.body.info.version, '1.1.0');
  assert.ok(Object.keys(contract.body.paths).length >= 20);
  assert.ok(contract.body.paths['/directory']);
  assert.ok(contract.body.paths['/complaints/track/{folio}']);
  assert.equal((await request(app).get('/docs/')).status, 200);
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

test('administración bloquea auto-desactivación y último administrador', async () => {
  const { app, repository, modulesRepository, tokens } = setup();
  repository.sessionUser = { ...collaborator, role: 'administrador' };
  const token = tokens.sign({ userId: 10, tokenVersion: 0 });
  const authorization = { Authorization: `Bearer ${token}` };
  modulesRepository.deactivationStatus = 'self_action';
  assert.equal((await request(app).patch('/admin/collaborators/20/deactivate')
    .set(authorization)).status, 409);
  modulesRepository.deactivationStatus = 'last_admin';
  assert.equal((await request(app).patch('/admin/collaborators/21/deactivate')
    .set(authorization)).status, 409);
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

test('GET /news lista y filtra por search en título y contenido sin distinguir mayúsculas', async () => {
  const { app, tokens } = setup();
  const authorization = {
    Authorization: `Bearer ${tokens.sign({ userId: 10, tokenVersion: 0 })}`,
  };

  const all = await request(app).get('/news').set(authorization);
  assert.equal(all.status, 200);
  assert.equal(all.body.status, 'ok');
  assert.equal(all.body.total, 2);
  assert.equal(all.body.items.length, 2);

  const byTitle = await request(app)
    .get('/news?search=MANTENIMIENTO')
    .set(authorization);
  assert.equal(byTitle.status, 200);
  assert.equal(byTitle.body.total, 1);
  assert.equal(byTitle.body.items[0].id, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');

  const byBody = await request(app)
    .get('/news?search=COORDINACIÓN')
    .set(authorization);
  assert.equal(byBody.status, 200);
  assert.equal(byBody.body.total, 1);
  assert.equal(byBody.body.items[0].id, 'cccccccc-cccc-4ccc-8ccc-cccccccccccd');

  const empty = await request(app)
    .get('/news?search=sin-coincidencias')
    .set(authorization);
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.items, []);
  assert.equal(empty.body.total, 0);
});

test('GET /news rechaza parámetros search inválidos con 400', async () => {
  const { app, tokens } = setup();
  const authorization = {
    Authorization: `Bearer ${tokens.sign({ userId: 10, tokenVersion: 0 })}`,
  };

  const invalidQueries = [
    '/news?search=',
    '/news?search=%20%20%20',
    `/news?search=${'a'.repeat(121)}`,
    '/news?search=a&search=b',
    '/news?search=hola%00mundo',
    '/news?search=hola%0amundo',
    '/news?search=hola%7fmundo',
  ];

  for (const queryPath of invalidQueries) {
    const response = await request(app).get(queryPath).set(authorization);
    assert.equal(response.status, 400, queryPath);
    assert.deepEqual(response.body, {
      status: 'error',
      message: 'Filtros inválidos',
    });
  }
});

test('GET /news/:id valida UUID y devuelve 404 cuando no existe', async () => {
  const { app, tokens } = setup();
  const authorization = {
    Authorization: `Bearer ${tokens.sign({ userId: 10, tokenVersion: 0 })}`,
  };

  const existing = await request(app)
    .get('/news/cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    .set(authorization);
  assert.equal(existing.status, 200);
  assert.equal(existing.body.news.title, 'Mantenimiento de sistemas');

  const invalidId = await request(app).get('/news/no-es-uuid').set(authorization);
  assert.equal(invalidId.status, 400);
  assert.deepEqual(invalidId.body, { status: 'error', message: 'ID inválido' });

  const missing = await request(app)
    .get('/news/99999999-9999-4999-8999-999999999999')
    .set(authorization);
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.body, {
    status: 'error',
    message: 'Noticia no encontrada',
  });
});

test('POST /news y PATCH /news/:id validan body, caracteres de control y UUID', async () => {
  const { app, repository, tokens } = setup();
  repository.sessionUser = { ...collaborator, role: 'editor_noticias' };
  const authorization = {
    Authorization: `Bearer ${tokens.sign({ userId: 10, tokenVersion: 0 })}`,
  };
  const existingId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const missingId = '99999999-9999-4999-8999-999999999999';

  const invalidBodies: unknown[] = [
    ['arreglo'],
    { title: '   ', body: 'Contenido válido' },
    { title: 'Título válido', body: '   ' },
    { title: 'Título\u0000inválido', body: 'Contenido válido' },
    { title: 'Título\ncon salto', body: 'Contenido válido' },
    { title: 'Título válido', body: 'Contenido\u0000inválido' },
    { title: 'Título válido', body: 'Contenido\u000binválido' },
    { title: 'Título válido', body: 'Contenido\u007finválido' },
  ];

  for (const invalidBody of invalidBodies) {
    const postResponse = await request(app)
      .post('/news')
      .set(authorization)
      .send(invalidBody as object);
    assert.equal(postResponse.status, 400);
    assert.deepEqual(postResponse.body, {
      status: 'error',
      message: 'Noticia inválida',
    });

    const patchResponse = await request(app)
      .patch(`/news/${existingId}`)
      .set(authorization)
      .send(invalidBody as object);
    assert.equal(patchResponse.status, 400);
    assert.deepEqual(patchResponse.body, {
      status: 'error',
      message: 'Noticia inválida',
    });
  }

  const multiline = await request(app)
    .post('/news')
    .set(authorization)
    .send({ title: 'Aviso multilínea', body: 'Línea 1\n\tLínea 2\r\nLínea 3' });
  assert.equal(multiline.status, 201);

  const patchInvalidId = await request(app)
    .patch('/news/no-es-uuid')
    .set(authorization)
    .send({ title: 'Título', body: 'Contenido' });
  assert.equal(patchInvalidId.status, 400);
  assert.deepEqual(patchInvalidId.body, { status: 'error', message: 'ID inválido' });

  const patchMissing = await request(app)
    .patch(`/news/${missingId}`)
    .set(authorization)
    .send({ title: 'Título', body: 'Contenido' });
  assert.equal(patchMissing.status, 404);
  assert.deepEqual(patchMissing.body, {
    status: 'error',
    message: 'Noticia no encontrada',
  });
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
    .send({ statusCode: 'UNDER_REVIEW' })).status, 200);
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
