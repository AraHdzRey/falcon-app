import type {
  ErrorRequestHandler,
  RequestHandler,
} from 'express';

export const rutaNoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada',
  });
};

// Express identifica un manejador de errores por sus 4 parámetros.
export const manejarErrores: ErrorRequestHandler = (
  error,
  _req,
  res,
  next
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  console.error('Error no controlado en Noticias:', error);

  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
  });
};
