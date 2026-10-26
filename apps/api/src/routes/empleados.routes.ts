import { Router } from 'express';

import { obtenerEmpleados } from '../controllers/empleados.controller';

import { autenticar } from '../middlewares/auth.middleware';

import { permitirRoles } from '../middlewares/roles.middleware';

const router = Router();

router.get(
    '/',
    autenticar,
    permitirRoles('empleado', 'administrador'),
    obtenerEmpleados
);

export default router;