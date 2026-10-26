import {
    Request,
    Response,
    NextFunction,
} from 'express';

type Rol = 'empleado' | 'administrador';

export const permitirRoles = (
    ...rolesPermitidos: Rol[]
) => {
    return (
        _req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        const rolActual = res.locals.rol;

        if (!rolActual) {
            res.status(401).json({
            status: 'error',
            message: 'Autenticación requerida',
        });
        return;
    }

        if (!rolesPermitidos.includes(rolActual)) {
            res.status(403).json({
                status: 'error',
                message: 'No tienes permisos para acceder',
            });
            return;
        }

        next();
    };
};