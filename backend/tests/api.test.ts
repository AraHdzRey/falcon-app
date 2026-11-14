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

const collaborator: SessionUser = {
  userId: 10,
  collaboratorId: 20,
  employeeNumber: 'FALCON001',
  name: 'Usuario de prueba',
  role: 'colaborador',
  tokenVersion: 0,
};

class FakeRepository implements AuthRepository, HealthRepository {
  loginResult: LoginResult | null = { user: collaborator };
  sessionUser: SessionUser | null = collaborator;
  revokedUserId: number | null = null;

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
}

const setup = () => {
  const repository = new FakeRepository();
  const tokens = createTokenService('t'.repeat(64));
  const app = createApp({
    authRepository: repository,
    healthRepository: repository,
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
