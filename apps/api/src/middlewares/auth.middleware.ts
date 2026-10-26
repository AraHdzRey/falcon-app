import { Request, Response, NextFunction } from 'express';
import { verificarToken } from '../services/token.service';
import { pool } from '../config/database';

export const autenticar = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const autorizacion = req.headers.authorization;

    if (!autorizacion) {
        res.status(401).json({
            status: 'error',
        message: 'Token de autenticación requerido',
        });
        return;
    }

    const partes = autorizacion.split(' ');

    if (
        partes.length !== 2 ||
        partes[0] !== 'Bearer' ||
        !partes[1]
    ) {
        res.status(401).json({
        status: 'error',
        message: 'Formato de autorización inválido',
        });
        return;
    }

    const datos = verificarToken(partes[1]);

    if (!datos) {
        res.status(401).json({
            status: 'error',
            message: 'Token inválido o expirado',
        });
        return;
    }

    try {
        const resultado = await pool.query(
            `SELECT c.rol
            FROM cuentas_acceso c
            INNER JOIN empleados e
                ON e.id = c.empleado_id
            WHERE c.empleado_id = $1
                AND c.activo = TRUE
                AND e.activo = TRUE`,
            [datos.empleadoId]
        );

        if (resultado.rows.length !== 1) {
            res.status(401).json({
                status: 'error',
                message: 'Cuenta inactiva o no autorizada',
            });
            return;
        }

        res.locals.empleadoId = datos.empleadoId;
        res.locals.rol = resultado.rows[0].rol;

        next();
    } catch (error) {
        console.error('Error al verificar la cuenta:', error);

        res.status(500).json({
            status: 'error',
            message: 'No se pudo verificar la autenticación',
        });
    }
};