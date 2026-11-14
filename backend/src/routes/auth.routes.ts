import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AuthRepository } from '../types/auth';
import type { TokenService } from '../services/token.service';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const publicUser = (user: NonNullable<Express.Locals['authUser']>) => ({
  id: user.userId,
  collaboratorId: user.collaboratorId,
  employeeNumber: user.employeeNumber,
  name: user.name,
  role: user.role,
});

export const createAuthRouter = (
  repository: AuthRepository,
  tokens: TokenService,
): Router => {
  const router = Router();
  const authenticate = requireAuth(repository, tokens);

  router.post(
    '/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 5,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        status: 'error',
        message: 'Demasiados intentos. Intenta nuevamente en 15 minutos.',
      },
    }),
    async (req, res, next) => {
      const body = req.body ?? {};
      const employeeId = body.employeeId ?? body.numeroEmpleado;
      const password = body.password ?? body.contrasena;
      if (
        typeof employeeId !== 'string' ||
        typeof password !== 'string' ||
        employeeId.trim().length < 1 ||
        employeeId.trim().length > 50 ||
        password.length < 1 ||
        password.length > 128
      ) {
        res.status(400).json({
          status: 'error',
          message: 'Datos de inicio de sesión inválidos',
        });
        return;
      }

      try {
        const result = await repository.verifyCredentials(
          employeeId.trim().toUpperCase(),
          password,
        );
        if (!result) {
          res.status(401).json({
            status: 'error',
            message: 'ID de empleado o contraseña incorrectos',
          });
          return;
        }

        const token = tokens.sign({
          userId: result.user.userId,
          tokenVersion: result.user.tokenVersion,
        });
        res.status(200).json({
          status: 'ok',
          token,
          tokenType: 'Bearer',
          expiresIn: 900,
          user: publicUser(result.user),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/auth/me', authenticate, (_req, res) => {
    res.status(200).json({
      status: 'ok',
      user: publicUser(res.locals.authUser!),
    });
  });

  router.post('/auth/logout', authenticate, async (_req, res, next) => {
    try {
      await repository.revokeSessions(res.locals.authUser!.userId);
      res.status(200).json({
        status: 'ok',
        message: 'Sesión cerrada correctamente',
      });
    } catch (error) {
      next(error);
    }
  });

  router.get(
    '/admin/ping',
    authenticate,
    requireRole('administrador'),
    (_req, res) => {
      res.status(200).json({ status: 'ok', role: 'administrador' });
    },
  );

  return router;
};
