import { Platform } from 'react-native';
import { obtenerUrlBaseApi } from '../config/api';

export interface RespuestaSesionWeb {
  status: 'ok';
  autenticado: true;
  rol: string;
  expiresIn: number;
}

/**
 * Comprueba si el navegador conserva una sesión válida.
 *
 * Devuelve null cuando la API responde HTTP 401.
 * No lee ni almacena el JWT de la cookie HttpOnly.
 */
export const consultarSesionWeb = async ():
  Promise<RespuestaSesionWeb | null> => {
  if (Platform.OS !== 'web') {
    throw new Error(
      'La consulta de sesión web solo está disponible en navegadores.'
    );
  }

  const respuesta = await fetch(
    `${obtenerUrlBaseApi()}/api/auth/sesion`,
    {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  // No hay una sesión válida en el navegador.
  if (respuesta.status === 401) {
    return null;
  }

  if (!respuesta.ok) {
    throw new Error(
      'No se pudo comprobar la sesión. Intenta nuevamente.'
    );
  }

  const datos: unknown = await respuesta.json();

  if (
    typeof datos !== 'object' ||
    datos === null ||
    !('status' in datos) ||
    datos.status !== 'ok' ||
    !('autenticado' in datos) ||
    datos.autenticado !== true ||
    !('rol' in datos) ||
    typeof datos.rol !== 'string' ||
    !('expiresIn' in datos) ||
    typeof datos.expiresIn !== 'number' ||
    !Number.isFinite(datos.expiresIn) ||
    datos.expiresIn <= 0
  ) {
    throw new Error(
      'La API devolvió una respuesta de sesión inválida.'
    );
  }

  return {
    status: 'ok',
    autenticado: true,
    rol: datos.rol,
    expiresIn: datos.expiresIn,
  };
};