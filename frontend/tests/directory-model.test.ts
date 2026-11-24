import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptDirectory, type DirectoryApiEntry } from '../src/features/directory/model';

test('adapta datos reales del backend a la vista de Ara', () => {
  const input: DirectoryApiEntry = {
    id: 7, employeeNumber: 'F7', name: 'Persona Ejemplo', email: 'p@empresa.test',
    position: 'Desarrollo', area: 'TI', role: 'colaborador', active: true,
    userActive: true, updatedAt: '2026-11-21',
  };
  const result = adaptDirectory([input]);
  assert.deepEqual(result, [{
    id: 7, employeeNumber: 'F7', nombre: 'Persona Ejemplo',
    puesto: 'Desarrollo', area: 'TI', correo: 'p@empresa.test', iniciales: 'PE',
  }]);
});

test('conserva nombres en modo offline sin inventar correo o puesto', () => {
  const result = adaptDirectory([{ id: 5, employeeId: 'F5', name: 'Ana Sol', role: 'colaborador', updatedAt: '' }]);
  assert.equal(result[0].nombre, 'Ana Sol');
  assert.equal(result[0].puesto, 'No disponible sin conexión');
  assert.equal(result[0].correo, 'No disponible sin conexión');
});

test('no muestra colaboradores desactivados', () => {
  const entries: DirectoryApiEntry[] = [{ id: 1, employeeNumber: '1', name: 'Alguien',
    email: null, position: null, area: null, active: false, userActive: true,
    role: 'colaborador', updatedAt: '' }];
  assert.deepEqual(adaptDirectory(entries), []);
});
