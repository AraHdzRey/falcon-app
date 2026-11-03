import { Request, Response } from 'express';
import { validarCredenciales } from '../services/auth.service';
import { generarToken } from '../services/token.service';
import {
  NOMBRE_COOKIE_SESION,
  OPCIONES_COOKIE_SESION,
} from '../config/session-cookie';

export const iniciarSesion = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { codigoEmpleado, contrasena } = req.body ?? {};

        // Validar los tipos de datos recibidos
        if (
            typeof codigoEmpleado !== 'string' ||
            typeof contrasena !== 'string' ||
            contrasena.length === 0 ||
            contrasena.length > 128
        ) {
            res.status(400).json({
                status: 'error',
                message: 'Datos de inicio de sesión inválidos',
            });
            return;
        }

        // Normalizar el ID de empleado
        const codigoNormalizado = codigoEmpleado
            .trim()
            .toUpperCase();

        // Verificar el formato alfanumérico
        const formatoValido =
            /^(?=.*[A-HJ-NP-Z])(?=.*[2-9])[A-HJ-NP-Z2-9]{12}$/
                .test(codigoNormalizado);

        if (!formatoValido) {
            res.status(400).json({
                status: 'error',
                message: 'Formato de ID de empleado inválido',
            });
            return;
        }

        // Validar el ID y la contraseña
        const empleadoId = await validarCredenciales(
            codigoNormalizado,
            contrasena
        );

        if (empleadoId === null) {
            res.status(401).json({
                status: 'error',
                message: 'ID de empleado o contraseña incorrectos',
            });
            return;
        }

        // Generar el token JWT
        const token = generarToken(empleadoId);

    // Preparar la cookie HttpOnly para la sesión web.
        res.cookie(
            NOMBRE_COOKIE_SESION,
            token,
            OPCIONES_COOKIE_SESION
        );

    // Conservar temporalmente la respuesta JSON existente.
        res.status(200).json({
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