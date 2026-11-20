import type { NextFunction, Request, Response } from 'express';

import { verificarToken } from '../services/token.service';

export const NOMBRE_COOKIE_SESION = 'falcon_sesion';

const LONGITUD_MAXIMA_COOKIE = 4096;

const responderError = (
  res: Response,
  message: string
): void => {
  res.status(401).json({ status: 'error', message });
};

// Lee una cookie de la cabecera Cookie sin dependencias adicionales.
const leerCookie = (
  cabecera: string | undefined,
  nombre: string
): string | null => {
  if (!cabecera) {
    return null;
  }

  for (const fragmento of cabecera.split(';')) {
    const indice = fragmento.indexOf('=');

    if (indice === -1) {
      continue;
    }

    if (fragmento.slice(0, indice).trim() !== nombre) {
      continue;
    }

    const valor = fragmento.slice(indice + 1).trim();

    try {
      return decodeURIComponent(valor);
    } catch {
      return valor;
    }
  }

  return null;
};

export const autenticar = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const autorizacion = req.headers.authorization;
  let token: string;

  if (autorizacion !== undefined) {
    // Si hay cabecera Authorization, es la única fuente válida.
    const partes = autorizacion.split(' ');

    if (
      partes.length !== 2 ||
      partes[0] !== 'Bearer' ||
      !partes[1]
    ) {
      responderError(res, 'Formato de autorización inválido');
      return;
    }

    token = partes[1];
  } else {
    // Respaldo: cookie falcon_sesion.
    const cookie = leerCookie(
      req.headers.cookie,
      NOMBRE_COOKIE_SESION
    );

    if (cookie === null || cookie.length === 0) {
      responderError(res, 'Token de autenticación requerido');
      return;
    }

    if (cookie.length > LONGITUD_MAXIMA_COOKIE) {
      responderError(res, 'Token inválido o expirado');
      return;
    }

    token = cookie;
  }

  const datos = verificarToken(token);

  if (!datos) {
    responderError(res, 'Token inválido o expirado');
    return;
  }

  res.locals.empleadoId = datos.empleadoId;

  next();
};
