import test from 'node:test';
import assert from 'node:assert/strict';

test('FALCÓN: el sistema de pruebas funciona', () => {
    assert.equal(2 + 2, 4);
});

test('FALCÓN: rechaza desactivaciones sin autenticación', async () => {
    const respuesta = await fetch(
        'http://127.0.0.1:3001/api/admin/empleados/abc/desactivar',
        {
            method: 'PATCH',
        }
    );

    assert.equal(respuesta.status, 401);
});