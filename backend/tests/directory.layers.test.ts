import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isVisibleInDirectory,
  isAvailableProfile,
  type DirectoryCollaborator,
  type DirectoryProfile,
  type DirectoryRepository,
  type DirectoryFilters,
} from '../src/domain/directory/directory.repository';

import { createListDirectoryUseCase } from
  '../src/application/directory/list-directory.use-case';

import { createGetMyProfileUseCase } from
  '../src/application/directory/get-my-profile.use-case';

const collaborator: DirectoryCollaborator = {
  id: 1,
  employeeNumber: 'FALCON001',
  name: 'Colaborador de prueba',
  email: null,
  position: 'Soporte',
  area: 'TI',
  active: true,
  userActive: true,
  role: 'colaborador',
  updatedAt: '2026-11-19T00:00:00.000Z',
};

const profile: DirectoryProfile = {
  ...collaborator,
  userId: 10,
};

test('dominio: solo colaboradores activos son visibles', () => {
  assert.equal(isVisibleInDirectory(collaborator), true);

  assert.equal(
    isVisibleInDirectory({ ...collaborator, active: false }),
    false,
  );
});

test('dominio: el perfil requiere colaborador y cuenta activos', () => {
  assert.equal(isAvailableProfile(profile), true);

  assert.equal(
    isAvailableProfile({ ...profile, active: false }),
    false,
  );

  assert.equal(
    isAvailableProfile({ ...profile, userActive: false }),
    false,
  );
});

test('aplicacion: el Directorio usa un repositorio simulado', async () => {
  let receivedFilters: DirectoryFilters | null = null;

  const repository: Pick<DirectoryRepository, 'listDirectory'> = {
    async listDirectory(filters) {
      receivedFilters = filters;

      return [
        collaborator,
        { ...collaborator, id: 2, active: false },
      ];
    },
  };

  const listDirectory = createListDirectoryUseCase(repository);

  const result = await listDirectory({
    search: 'Colaborador',
    area: 'TI',
  });

  assert.deepEqual(receivedFilters, {
    search: 'Colaborador',
    area: 'TI',
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.employeeNumber, 'FALCON001');
});

test('aplicacion: el perfil privado usa un repositorio simulado', async () => {
  let storedProfile: DirectoryProfile | null = profile;

  const repository: Pick<DirectoryRepository, 'getProfile'> = {
    async getProfile(userId) {
      assert.equal(userId, 10);
      return storedProfile;
    },
  };

  const getMyProfile = createGetMyProfileUseCase(repository);

  assert.deepEqual(await getMyProfile(10), profile);

  storedProfile = { ...profile, userActive: false };
  assert.equal(await getMyProfile(10), null);

  storedProfile = { ...profile, active: false };
  assert.equal(await getMyProfile(10), null);

  storedProfile = null;
  assert.equal(await getMyProfile(10), null);
});
