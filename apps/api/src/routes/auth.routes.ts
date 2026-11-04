
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { iniciarSesion } from '../controllers/auth.controller';
import { consultarSesionWeb } from '../controllers/sesion.controller';
import { cerrarSesionWeb } from '../controllers/logout.controller';

const router = Router();

const limitarIntentosLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 'error',
    message:
      'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.',
  },
});

// Inicio de sesión mediante ID de empleado y contraseña.
router.post(
  '/login',
  limitarIntentosLogin,
  iniciarSesion
);

// Consultar una sesión web mediante cookie HttpOnly.
router.get(
  '/sesion',
  consultarSesionWeb
);

// Cerrar la sesión web eliminando la cookie HttpOnly.
router.post(
  '/logout',
  cerrarSesionWeb
);

export default router;
