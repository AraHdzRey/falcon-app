import jwt from 'jsonwebtoken';

export const LONGITUD_MINIMA_JWT_SECRET = 64;

export interface DatosToken {
  empleadoId: number;
  exp?: number;
}

// Debe ser la misma clave que usa apps/api para firmar los tokens.
export const obtenerJwtSecret = (): string => {
  const secreto = process.env.JWT_SECRET;

  if (!secreto || secreto.length < LONGITUD_MINIMA_JWT_SECRET) {
    throw new Error(
      `JWT_SECRET debe estar configurado con al menos ${LONGITUD_MINIMA_JWT_SECRET} caracteres`
    );
  }

  return secreto;
};

// Verificación local (sin BD ni llamadas a apps/api).
// Devuelve null si el token es inválido o expirado.
export const verificarToken = (token: string): DatosToken | null => {
  const secreto = obtenerJwtSecret();

  try {
    const resultado = jwt.verify(token, secreto, {
      algorithms: ['HS256'],
    });

    if (typeof resultado === 'string') {
      return null;
    }

    const empleadoId: unknown = resultado.empleadoId;

    if (
      typeof empleadoId !== 'number' ||
      !Number.isSafeInteger(empleadoId) ||
      empleadoId <= 0
    ) {
      return null;
    }

    return { empleadoId, exp: resultado.exp };
  } catch {
    return null;
  }
};
