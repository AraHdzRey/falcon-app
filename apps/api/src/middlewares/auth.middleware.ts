import { Request, Response, NextFunction } from 'express';
import { verificarToken } from '../services/token.service';
import { obtenerRolCuentaActiva } from '../services/cuenta-activa.service';

export const autenticar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const autorizacion = req.headers.authorization;

  // Exigir el encabezado Authorization.
  if (!autorizacion) {
    res.status(401).json({
      status: 'error',
      message: 'Token de autenticación requerido',
    });
    return;
  }

  const partes = autorizacion.split(' ');

  // Aceptar únicamente el formato Bearer.
  if (
    partes.length !== 2 ||
    partes[0] !== 'Bearer' ||
    !partes[1]
  ) {
    res.status(401).json({
      status: 'error',
      message: 'Formato de autorización inválido',
    });
    return;
  }

  // Verificar la firma y expiración del JWT.
  const datos = verificarToken(partes[1]);

  if (!datos) {
    res.status(401).json({
      status: 'error',
      message: 'Token inválido o expirado',
    });
    return;
  }

  try {
    // Consultar el estado actual de la cuenta en PostgreSQL.
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

    // Compartir la identidad y el rol con los controladores.
    res.locals.empleadoId = datos.empleadoId;
    res.locals.rol = rol;

    next();
  } catch (error) {
    console.error('Error al verificar la cuenta:', error);

    res.status(500).json({
      status: 'error',
      message: 'No se pudo verificar la autenticación',
    });
  }
};