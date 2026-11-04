
import type { Request, Response } from 'express';

import {
  NOMBRE_COOKIE_SESION,
  OPCIONES_COOKIE_SESION,
} from '../config/session-cookie';

// Cerrar la sesión web eliminando la cookie HttpOnly.
export const cerrarSesionWeb = (
  _req: Request,
  res: Response
): void => {
  const {
    httpOnly,
    secure,
    sameSite,
    path,
  } = OPCIONES_COOKIE_SESION;

  res.clearCookie(NOMBRE_COOKIE_SESION, {
    httpOnly,
    secure,
    sameSite,
    path,
  });

  res.status(200).json({
    status: 'ok',
    message: 'Sesión cerrada correctamente',
  });
};
