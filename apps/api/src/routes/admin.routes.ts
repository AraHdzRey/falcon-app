import { Router, Request, Response } from 'express';

import { autenticar } from '../middlewares/auth.middleware';
import { permitirRoles } from '../middlewares/roles.middleware';
import {
    obtenerPanelAdmin,
    obtenerEmpleadosAdmin,
    registrarEmpleadoAdmin,
    actualizarEmpleadoAdmin,
    desactivarEmpleadoAdmin,
    reactivarEmpleadoAdmin,
} from '../controllers/admin.controller';

const router = Router();

router.get(
    '/verificar',
    autenticar,
    permitirRoles('administrador'),
    (_req: Request, res: Response): void => {
        res.json({
            status: 'ok',
            message: 'Acceso de administrador autorizado',
        });
    }
);

router.get(
    '/panel',
    autenticar,
    permitirRoles('administrador'),
    obtenerPanelAdmin
);

router.get(
    '/empleados',
    autenticar,
    permitirRoles('administrador'),
    obtenerEmpleadosAdmin
);

router.post(
    '/empleados',
    autenticar,
    permitirRoles('administrador'),
    registrarEmpleadoAdmin
)

router.put (
    '/empleados/:id',
    autenticar,
    permitirRoles('administrador'),
    actualizarEmpleadoAdmin
);

router.patch (
    '/empleados/:id/desactivar',
    autenticar,
    permitirRoles('administrador'),
    desactivarEmpleadoAdmin
);

router.patch (
    '/empleados/:id/reactivar',
    autenticar,
    permitirRoles('administrador'),
    reactivarEmpleadoAdmin
);

export default router;