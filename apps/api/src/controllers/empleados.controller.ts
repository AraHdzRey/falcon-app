import { Request, Response } from 'express';
import { pool } from '../config/database';

export const obtenerEmpleados = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {
        const resultado = await pool.query(
            `SELECT id, nombre, apellido_paterno,
            apellido_materno, correo, departamento,
            puesto, fecha_ingreso, activo
            FROM empleados
            ORDER BY id ASC`
        );

        res.json({
        status: 'ok',
        total: resultado.rows.length,
        empleados: resultado.rows,
        });
    } catch (error) {
        console.error('Error al consultar empleados:', error);

        res.status(500).json({
            status: 'error',
            message: 'No se pudieron consultar los empleados',
        });
    }
};