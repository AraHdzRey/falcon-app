import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { iniciarSesion } from '../controllers/auth.controller';

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

router.post(
    '/login',
    limitarIntentosLogin,
    iniciarSesion
);

export default router;