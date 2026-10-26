import { Request, Response } from 'express';

import { validarCredenciales } from '../services/auth.service';
import { generarToken } from '../services/token.service';

export const iniciarSesion = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { correo, contrasena } = req.body ?? {};

        if (
            typeof correo !== 'string' ||
            typeof contrasena !== 'string' ||
            correo.length === 0 ||
            contrasena.length === 0 ||
            correo.length > 254 ||
            contrasena.length > 128
        ) {
            res.status(400).json({
                status: 'error',
                message: 'Datos de inicio de sesión inválidos',
            });
            return;
        }

        const empleadoId = await validarCredenciales(
            correo,
            contrasena
        );

        if (empleadoId === null) {
            res.status(401).json({
                status: 'error',
                message: 'Correo o contraseña incorrectos',
            });
            return;
        }

        const token = generarToken(empleadoId);

        res.json({
            status: 'ok',
            message: 'Inicio de sesión correcto',
            token,
            tipo: 'Bearer',
            expiresIn: 900,
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);

        res.status(500).json({
            status: 'error',
            message: 'No se pudo iniciar sesión',
        });
    }
};