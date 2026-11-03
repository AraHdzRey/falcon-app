import type { CookieOptions } from 'express';

// Nombre de la cookie utilizada por FALCÓN Web.
export const NOMBRE_COOKIE_SESION = 'falcon_sesion';

// Debe coincidir con la vigencia actual del JWT: 15 minutos.
export const DURACION_SESION_SEGUNDOS = 15 * 60;

// Configuración de seguridad para la cookie de sesión.
export const OPCIONES_COOKIE_SESION: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api',
  maxAge: DURACION_SESION_SEGUNDOS * 1000,
};