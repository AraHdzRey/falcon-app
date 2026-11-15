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

const setup = () => {
  const repository = new FakeRepository();
  const tokens = createTokenService('t'.repeat(64));
  const app = createApp({
    authRepository: repository,
    healthRepository: repository,
    syncRepository: repository,
    tokens,
    corsOrigins: ['http://localhost:8081'],
  });
  return { app, repository, tokens };
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
