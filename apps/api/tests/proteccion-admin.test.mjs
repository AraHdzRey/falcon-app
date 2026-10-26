import test from 'node:test';
import assert from 'node:assert/strict';

import { esUltimoAdministradorActivo } from '../src/services/proteccion-admin.service.ts';

test('FALCÓN: identifica al último administrador activo', () => {
    const administradores = [{ id: '1' }];

    const resultado = esUltimoAdministradorActivo(
        administradores,
        '1'
    );

    assert.equal(resultado, true);
});

test('FALCÓN: reconoce cuando existen dos administradores activos', () => {
    const administradores = [
        { id: '1' },
        { id: '2' },
    ];

    const resultado = esUltimoAdministradorActivo(
        administradores,
        '1'
    );

    assert.equal(resultado, false);
});

test('FALCÓN: no confunde a un empleado con un administrador', () => {
    const administradores = [{ id: '1' }];
    const empleadoId = '2';

    const resultado = esUltimoAdministradorActivo(
        administradores,
        empleadoId
    );

    assert.equal(resultado, false);
});