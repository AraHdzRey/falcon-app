import { Request, Response } from 'express';
import { pool } from '../config/database';
import {
    conCodigoEmpleadoUnico,
} from '../services/codigo-empleado.service';
import { esUltimoAdministradorActivo } from '../services/proteccion-admin.service';
import { obtenerClienteAdmin } from '../services/conexion-admin.service';
import { validarNuevoEmpleado, validarEdicionEmpleado, } from '../validators/empleados.validator';

export const obtenerPanelAdmin = (
    _req: Request,
    res: Response
): void => {
    res.status(200).json({
        status: 'ok',
        message: 'Panel administrativo de FALCÓN',
        modulos: [
            {
                id: 'empleados',
                nombre: 'Gestión de empleados',
                disponible: false,
            },
            {
                id: 'noticias',
                nombre: 'Boletín y noticias',
                disponible: false,
            },
            {
                id: 'buzon',
                nombre: 'Buzón de quejas y sugerencias',
                disponible: false,
            },
            {
                id: 'beneficios',
                nombre: 'Beneficios para empleados',
                disponible: false,
            },
        ],
    });
};

export const obtenerEmpleadosAdmin = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {
        const resultado = await pool.query(
            `SELECT
            id,
            nombre,
            apellido_paterno,
            apellido_materno,
            correo,
            departamento,
            puesto,
            fecha_ingreso,
            activo
        FROM public.empleados
        ORDER BY id ASC`
    );

    res.status(200).json({
        status: 'ok',
        total: resultado.rows.length,
        empleados: resultado.rows,
    });
    } catch (error) {
    console.error(
        'Error al consultar empleados administrativos:',
        error
    );

    res.status(500).json({
        status: 'error',
        message: 'No se pudo consultar la lista de empleados',
    });
    }
};

export const registrarEmpleadoAdmin = async (
    req: Request,
    res: Response
): Promise<void> => {
    const datos = validarNuevoEmpleado(req.body);

    if (!datos) {
        res.status(400).json({
            status: 'error',
            message: 'Los datos del empleado no son válidos',
        });
        return;
    }

    try {
        const resultado = await conCodigoEmpleadoUnico(
            async (codigoEmpleado) => {
                return pool.query(
                    `INSERT INTO public.empleados (
                        codigo_empleado,
                    nombre,
                    apellido_paterno,
                    apellido_materno,
                    correo,
                    departamento,
                    puesto,
                    fecha_ingreso,
                    activo
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
                    ON CONFLICT (correo) DO NOTHING
                    RETURNING
                        id,
                    codigo_empleado,
                    nombre,
                    apellido_paterno,
                    apellido_materno,
                    correo,
                    departamento,
                    puesto,
                    fecha_ingreso,
                    activo`,
                [
                    codigoEmpleado,
                    datos.nombre,
                    datos.apellido_paterno,
                    datos.apellido_materno,
                    datos.correo,
                    datos.departamento,
                    datos.puesto,
                    datos.fecha_ingreso,
                ]
            );
            }
    );

    if (resultado.rows.length === 0) {
        res.status(409).json({
            status: 'error',
            message: 'Ya existe un empleado con ese correo',
        });
        return;
    }

    res.status(201).json({
        status: 'ok',
        message: 'Empleado registrado correctamente',
        empleado: resultado.rows[0],
    });
    } catch (error) {
    console.error('Error al registrar empleado:', error);

    res.status(500).json({
        status: 'error',
        message: 'No se pudo registrar el empleado',
    });
    }
};

export const actualizarEmpleadoAdmin = async (
    req: Request,
    res: Response
): Promise<void> => {
    const id = req.params.id;

    if (
        typeof id !== 'string' ||
        !/^[1-9]\d*$/.test(id) ||
        BigInt(id) > 9223372036854775807n
    ) {
        res.status(400).json({
        status: 'error',
        message: 'El ID del empleado no es válido',
        });
        return;
    }

    const datos = validarEdicionEmpleado(req.body);

    if (!datos) {
        res.status(400).json({
            status: 'error',
            message: 'Los datos del empleado no son válidos',
        });
        return;
    }

    try {
        const resultado = await pool.query(
        `UPDATE public.empleados
        SET
            nombre = $1,
            apellido_paterno = $2,
            apellido_materno = $3,
            correo = $4,
            departamento = $5,
            puesto = $6,
            fecha_ingreso = $7
        WHERE id = $8
        RETURNING
            id,
            nombre,
            apellido_paterno,
            apellido_materno,
            correo,
            departamento,
            puesto,
            fecha_ingreso,
            activo`,
        [
            datos.nombre,
            datos.apellido_paterno,
            datos.apellido_materno,
            datos.correo,
            datos.departamento,
            datos.puesto,
            datos.fecha_ingreso,
            id,
        ]
    );

    if (resultado.rows.length === 0) {
        res.status(404).json({
            status: 'error',
            message: 'Empleado no encontrado',
        });
        return;
    }

    res.status(200).json({
        status: 'ok',
        message: 'Empleado actualizado correctamente',
        empleado: resultado.rows[0],
    });
    } catch (error: unknown) {
    if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
    ) {
        res.status(409).json({
            status: 'error',
            message: 'Ya existe un empleado con ese correo',
        });
        return;
    }

    console.error('Error al actualizar empleado:', error);

    res.status(500).json({
        status: 'error',
        message: 'No se pudo actualizar el empleado',
    });
    }
};

export const desactivarEmpleadoAdmin = async (
    req: Request,
    res: Response
): Promise<void> => {
    const id = req.params.id;

    if (
        typeof id !== 'string' ||
        !/^[1-9]\d*$/.test(id) ||
        BigInt(id) > 9223372036854775807n
    ) {
        res.status(400).json({
            status: 'error',
            message: 'El ID del empleado no es válido',
        });
        return;
    }

    if (String(res.locals.empleadoId) === id) {
        res.status(403).json({
            status: 'error',
            message: 'No puedes desactivar tu propio empleado',
        });
        return;
    }

    const cliente = await obtenerClienteAdmin();

    try {
        await cliente.query('BEGIN');

    // Serializa las operaciones de desactivación entre sí.
        await cliente.query(
            'SELECT pg_advisory_xact_lock(2026, 1082)'
        );

    const administradores = await cliente.query(
        `SELECT e.id
        FROM public.empleados AS e
        INNER JOIN public.cuentas_acceso AS c
            ON c.empleado_id = e.id
        WHERE c.rol = 'administrador'
            AND e.activo = TRUE
            AND c.activo = TRUE
        FOR UPDATE OF e, c`
    );

    if (esUltimoAdministradorActivo(administradores.rows, id)) {
    await cliente.query('ROLLBACK');

        res.status(409).json({
            status: 'error',
            message: 'No se puede desactivar al ultimo administrador activo',
        });
        return;
    }

    const resultado = await cliente.query(
        `UPDATE public.empleados
        SET activo = FALSE
        WHERE id = $1
            AND activo = TRUE
        RETURNING
            id,
            nombre,
            apellido_paterno,
            correo,
            activo`,
        [id]
    );

    if (resultado.rows.length === 0) {
        const existente = await cliente.query(
            `SELECT id
            FROM public.empleados
            WHERE id = $1`,
        [id]
        );

        await cliente.query('ROLLBACK');

        if (existente.rows.length === 0) {
            res.status(404).json({
                status: 'error',
                message: 'Empleado no encontrado',
            });
            return;
        }

        res.status(409).json({
            status: 'error',
            message: 'El empleado ya está desactivado',
        });
        return;
    }

    await cliente.query('COMMIT');

    res.status(200).json({
        status: 'ok',
        message: 'Empleado desactivado correctamente',
        empleado: resultado.rows[0],
    });
    } catch (error) {
        try {
            await cliente.query('ROLLBACK');
        } catch (rollbackError) {
        console.error('Error al revertir transacción:', rollbackError);
    }

    console.error('Error al desactivar empleado:', error);

    res.status(500).json({
        status: 'error',
        message: 'No se pudo desactivar el empleado',
    });
    } finally {
        cliente.release();
    }
};

export const reactivarEmpleadoAdmin = async (
    req: Request,
    res: Response
): Promise<void> => {
    const id = req.params.id;

    if (
        typeof id !== 'string' ||
        !/^[1-9]\d*$/.test(id) ||
        BigInt(id) > 9223372036854775807n
    ) {
        res.status(400).json({
            status: 'error',
            message: 'El ID del empleado no es válido',
        });
        return;
    }

    try {
        const resultado = await pool.query(
            `UPDATE public.empleados
            SET activo = TRUE
            WHERE id = $1
                AND activo = FALSE
            RETURNING
                id,
                nombre,
                apellido_paterno,
                correo,
                activo`,
            [id]
        );

    if (resultado.rows.length === 0) {
        const existente = await pool.query(
            `SELECT id, activo
            FROM public.empleados
            WHERE id = $1`,
            [id]
        );

        if (existente.rows.length === 0) {
            res.status(404).json({
                status: 'error',
                message: 'Empleado no encontrado',
            });
            return;
        }

        res.status(409).json({
            status: 'error',
            message: 'El empleado ya está activo',
        });
        return;
    }

        res.status(200).json({
            status: 'ok',
            message: 'Empleado reactivado correctamente',
            empleado: resultado.rows[0],
        });
    } catch (error) {
        console.error('Error al reactivar empleado:', error);

        res.status(500).json({
        status: 'error',
        message: 'No se pudo reactivar el empleado',
        });
    }
};