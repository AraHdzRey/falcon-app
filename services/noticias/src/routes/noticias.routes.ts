import { Router } from 'express';

import {
  obtenerNoticia,
  obtenerNoticias,
} from '../controllers/noticias.controller';
import { autenticar } from '../middlewares/auth.middleware';

const router = Router();

// Fase actual: solo consulta (GET). Todas las rutas exigen JWT.
router.get('/', autenticar, obtenerNoticias);
router.get('/:id', autenticar, obtenerNoticia);

export default router;
