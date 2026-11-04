
import { obtenerUrlBaseApi } from '../config/api';

// Solicita al backend eliminar la cookie de sesión web.
export const cerrarSesionWebApi = async (): Promise<void> => {
  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${obtenerUrlBaseApi()}/api/auth/logout`,
      {
        method: 'POST',
        credentials: 'include',
      }
    );
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor para cerrar sesión.'
    );
  }

  if (!respuesta.ok) {
    throw new Error(
      'El servidor no pudo completar el cierre de sesión.'
    );
  }
};
