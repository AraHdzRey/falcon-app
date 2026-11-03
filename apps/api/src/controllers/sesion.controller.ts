import type { Request, Response } from 'express';

import { NOMBRE_COOKIE_SESION } from '../config/session-cookie';
import { verificarToken } from '../services/token.service';
import { obtenerRolCuentaActiva } from '../services/cuenta-activa.service';

/**
 * Comprueba una sesión web mediante una cookie HttpOnly.
 *
 * No devuelve el JWT al navegador.
 * Solo permite consultar el estado de la sesión.
 */
export const consultarSesionWeb = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Evitar que la respuesta de sesión quede en caché.
  res.setHeader('Cache-Control', 'no-store');

  // cookie-parser interpreta las cookies recibidas.
  const cookie = req.cookies?.[NOMBRE_COOKIE_SESION];

  if (
    typeof cookie !== 'string' ||
    cookie.length === 0 ||
    cookie.length > 4096
  ) {
    res.status(401).json({
      status: 'error',
      message: 'Sesión no disponible',
    });
    return;
  }

  // Verificar firma y expiración del JWT.
  const datos = verificarToken(cookie);

  if (
    !datos ||
    !Number.isSafeInteger(datos.empleadoId) ||
    datos.empleadoId <= 0 ||
    typeof datos.exp !== 'number'
  ) {
    res.status(401).json({
      status: 'error',
      message: 'Sesión inválida o expirada',
    });
    return;
  }

  try {
    // Comprobar en PostgreSQL que la cuenta siga activa.
    const rol = await obtenerRolCuentaActiva(
      datos.empleadoId
    );

    if (rol === null) {
      res.status(401).json({
        status: 'error',
        message: 'Cuenta inactiva o no autorizada',
      });
      return;
    }

    // Calcular la duración restante de la sesión.
    const expiresIn = Math.max(
      0,
      datos.exp - Math.floor(Date.now() / 1000)
    );

    res.status(200).json({
      status: 'ok',
      autenticado: true,
      rol,
      expiresIn,
    });
  } catch (error) {
    console.error(
      'Error al comprobar la sesión web:',
      error
    );

    res.status(500).json({
      status: 'error',
      message: 'No se pudo verificar la sesión',
    });
  }
};