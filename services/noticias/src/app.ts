import cors from 'cors';
import express from 'express';

import {
  manejarErrores,
  rutaNoEncontrada,
} from './middlewares/error.middleware';
import noticiasRoutes from './routes/noticias.routes';

const ORIGEN_CORS_POR_DEFECTO = 'http://localhost:8081';

const obtenerOrigenesCors = (): string[] => {
  const origenes = (
    process.env.NOTICIAS_CORS_ORIGIN || ORIGEN_CORS_POR_DEFECTO
  )
    .split(',')
    .map((origen) => origen.trim())
    .filter((origen) => origen.length > 0);

  if (origenes.length === 0 || origenes.includes('*')) {
    throw new Error(
      'NOTICIAS_CORS_ORIGIN debe indicar origenes explicitos (no se permite "*")'
    );
  }

  return origenes;
};

// Construye la aplicación sin llamar a listen (útil para pruebas).
export const crearApp = (): express.Express => {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    cors({
      origin: obtenerOrigenesCors(),
      credentials: true,
    })
  );

  // Endpoint público.
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'noticias',
      message: 'Microservicio de Noticias activo',
    });
  });

  // Endpoints protegidos.
  app.use('/api/noticias', noticiasRoutes);

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);

  return app;
};

export const app = crearApp();

export default app;
