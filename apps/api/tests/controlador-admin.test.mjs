import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as conexionAdmin from '../src/services/conexion-admin.service.ts';
import { pool } from '../src/config/database.ts';
import { desactivarEmpleadoAdmin } from '../src/controllers/admin.controller.ts';

const crearClienteSimulado = (administradores = []) => {
    const consultas = [];

    const cliente = {
        query: async (sql) => {
            consultas.push(sql);

            if (sql.includes('FROM public.empleados AS e')) {
                return { rows: administradores };
            }

            return { rows: [] };
        },

        release: () => {
            consultas.push('RELEASE');
        },
    };

    return { cliente, consultas };
};

test('FALCÓN: el cliente simulado registra una transacción', async () => {
    const { cliente, consultas } = crearClienteSimulado();

    await cliente.query('BEGIN');
    await cliente.query('ROLLBACK');
    cliente.release();

    assert.deepEqual(consultas, [
        'BEGIN',
        'ROLLBACK',
        'RELEASE',
    ]);
});

const crearRespuestaSimulada = (empleadoId) => {
    return {
        locals: {
            empleadoId,
        },

        status(codigo) {
            this.statusCode = codigo;
            return this;
        },

        json(datos) {
            this.body = datos;
            return this;
        },
    };
};

test('FALCÓN: la respuesta HTTP simulada funciona', () => {
    const respuesta = crearRespuestaSimulada('999');

    respuesta.status(403).json({
        status: 'error',
        message: 'Acceso denegado',
    });

    assert.equal(respuesta.locals.empleadoId, '999');
    assert.equal(respuesta.statusCode, 403);
    assert.equal(respuesta.body.status, 'error');
    assert.equal(respuesta.body.message, 'Acceso denegado');
});

test('FALCÓN: impide que un administrador se desactive a sí mismo', async () => {
    const solicitud = {
        params: {
            id: '999',
        },
    };

    const respuesta = crearRespuestaSimulada('999');

    const conexionBloqueada = mock.method(
        pool,
        'connect',
        async () => {
            throw new Error('La prueba no debe conectarse a PostgreSQL');
        },
    );

    try {
        await desactivarEmpleadoAdmin(solicitud, respuesta);

        assert.equal(respuesta.statusCode, 403);
        assert.equal(respuesta.body.status, 'error');
        assert.equal(
            respuesta.body.message,
            'No puedes desactivar tu propio empleado',
        );
        assert.equal(conexionBloqueada.mock.callCount(), 0);
    } finally {
        conexionBloqueada.mock.restore();
    }
});

test('FALCÓN: protege al último administrador activo con HTTP 409', async () => {
    const { cliente, consultas } = crearClienteSimulado([
        { id: '100' },
    ]);

    const solicitud = {
        params: {
            id: '100',
        },
    };

    const respuesta = crearRespuestaSimulada('999');

    const conexionSimulada = mock.method(
        pool,
        'connect',
        async () => cliente,
    );

    try {
        await desactivarEmpleadoAdmin(solicitud, respuesta);

        assert.equal(respuesta.statusCode, 409);
        assert.equal(respuesta.body.status, 'error');
        assert.equal(
            respuesta.body.message,
            'No se puede desactivar al ultimo administrador activo',
        );

        assert.ok(consultas.includes('BEGIN'));
        assert.ok(consultas.includes('ROLLBACK'));
        assert.ok(consultas.includes('RELEASE'));
        assert.ok(
            !consultas.some((sql) =>
                sql.includes('UPDATE public.empleados')
            )
        );

        assert.equal(conexionSimulada.mock.callCount(), 1);
    } finally {
        conexionSimulada.mock.restore();
    }
});