import { obtenerUrlBaseApi } from '../config/api';

// Estructura de la respuesta correcta del backend
export interface RespuestaInicioSesion {
  status: 'ok';
  message: string;
  token: string;
  tipo: 'Bearer';
  expiresIn: number;
}

// Enviar las credenciales al servidor de FALCON
export const iniciarSesionApi = async (
  codigoEmpleado: string,
  contrasena: string
): Promise<RespuestaInicioSesion> => {
  const url = `${obtenerUrlBaseApi()}/api/auth/login`;

  let respuesta: Response;

  try {
    respuesta = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        codigoEmpleado: codigoEmpleado.trim().toUpperCase(),
        contrasena,
      }),
    });
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor de FALCÓN.'
    );
  }

  // Interpretar la respuesta JSON del servidor
  let datos: unknown;

  try {
    datos = await respuesta.json();
  } catch {
    throw new Error(
      'El servidor devolvió una respuesta no válida.'
    );
  }

  // Manejar los errores HTTP
  if (!respuesta.ok) {
    if (respuesta.status === 400) {
      throw new Error(
        'Verifica el formato de tu ID de empleado.'
      );
    }

    if (respuesta.status === 401) {
      throw new Error(
        'ID de empleado o contraseña incorrectos.'
      );
    }

    if (respuesta.status === 429) {
      throw new Error(
        'Demasiados intentos. Intenta nuevamente más tarde.'
      );
    }

    throw new Error(
      'No fue posible iniciar sesión. Intenta nuevamente.'
    );
  }

  // Comprobar que la respuesta contiene un JWT válido en formato
  if (
    typeof datos !== 'object' ||
    datos === null ||
    !('status' in datos) ||
    datos.status !== 'ok' ||
    !('token' in datos) ||
    typeof datos.token !== 'string' ||
    datos.token.length === 0 ||
    !('tipo' in datos) ||
    datos.tipo !== 'Bearer' ||
    !('expiresIn' in datos) ||
    typeof datos.expiresIn !== 'number' ||
    !Number.isFinite(datos.expiresIn) ||
    datos.expiresIn <= 0
  ) {
    throw new Error(
      'La respuesta de autenticación no es válida.'
    );
  }

  return {
    status: 'ok',
    message: 'Inicio de sesión correcto',
    token: datos.token,
    tipo: 'Bearer',
    expiresIn: datos.expiresIn,
  };
};