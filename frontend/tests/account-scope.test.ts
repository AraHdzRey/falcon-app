import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertSnapshotOwner,
  databaseNameForUser,
} from '../src/storage/account-scope';

test('cada usuario obtiene un archivo SQLite diferente', () => {
  assert.equal(databaseNameForUser(10), 'falcon_user_10.db');
  assert.equal(databaseNameForUser(25), 'falcon_user_25.db');

  assert.notEqual(
    databaseNameForUser(10),
    databaseNameForUser(25),
  );
});

test('no se acepta una identidad local invalida', () => {
  for (const value of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => databaseNameForUser(value));
  }
});

test('se permite sincronizar datos de la cuenta correcta', () => {
  assert.doesNotThrow(() => assertSnapshotOwner(10, 10));
});

test('se rechaza un snapshot perteneciente a otra cuenta', () => {
  assert.throws(
    () => assertSnapshotOwner(10, 25),
    /otra cuenta/,
  );
});
