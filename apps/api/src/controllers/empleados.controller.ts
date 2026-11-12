import { Request, Response } from 'express';
import { consultarEmpleados } from '../services/empleados.service';

export const obtenerEmpleados = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {
        const empleados = await consultarEmpleados();

        res.json({
        status: 'ok',
        total: empleados.length,
        empleados,
        });
    } catch (error) {
        console.error('Error al consultar empleados:', error);

        res.status(500).json({
            status: 'error',
            message: 'No se pudieron consultar los empleados',
        });
    }
};