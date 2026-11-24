import { Router, type Response } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { hashPassword } from '../services/password.service';
import type { AuthRepository } from '../types/auth';
import type { ModulesRepository, MutationResult } from '../types/modules';
import type { TokenService } from '../services/token.service';
import {
  isEmail,
  readOptionalString,
  readRole,
  readRouteParam,
  readString,
  readPagination,
} from './validation';

const parseId = (value: string | null): number | null => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const sendMutationError = <T>(
  res: Response,
  result: Exclude<MutationResult<T>, { status: 'ok' }>,
): void => {
  const responses = {
    not_found: [404, 'Colaborador no encontrado'],
    conflict: [409, 'Los datos entran en conflicto con un registro existente'],
    self_action: [409, 'No puedes desactivar tu propia cuenta administrativa'],
    last_admin: [409, 'No se puede desactivar al último administrador activo'],
  } as const;
  const [status, message] = responses[result.status];
  res.status(status).json({ status: 'error', message });
};

export const createAdminRouter = (
  authRepository: AuthRepository,
  repository: ModulesRepository,
  tokens: TokenService,
): Router => {
  const router = Router();
  const authenticate = requireAuth(authRepository, tokens);
  const administrator = [authenticate, requireRole('administrador')] as const;

  router.get(
    '/admin/collaborators',
    authenticate,
    requireRole('administrador', 'capital_humano', 'director'),
    async (req, res, next) => {
      const pagination = readPagination(req.query.page, req.query.pageSize);
      if (!pagination) {
        res.status(400).json({ status: 'error', message: 'Paginación inválida' });
        return;
      }
      try {
        const result = await repository.listCollaborators(
          pagination.page,
          pagination.pageSize,
        );
        res.status(200).json({ status: 'ok', ...pagination, ...result });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/admin/collaborators', ...administrator, async (req, res, next) => {
    const body = req.body ?? {};
    const employeeNumber = readString(body.employeeNumber, 1, 50);
    const name = readString(body.name, 1, 160);
    const email = readOptionalString(body.email, 254);
    const position = readOptionalString(body.position, 120);
    const area = readOptionalString(body.area, 120);
    const role = readRole(body.role);
    const temporaryPassword = typeof body.temporaryPassword === 'string'
      ? body.temporaryPassword
      : '';
    if (!employeeNumber || !name || email === undefined ||
        position === undefined || area === undefined || !role ||
        (email !== null && !isEmail(email)) ||
        temporaryPassword.length < 12 || temporaryPassword.length > 128) {
      res.status(400).json({ status: 'error', message: 'Datos de colaborador inválidos' });
      return;
    }
    try {
      const result = await repository.createCollaborator(
        {
          employeeNumber: employeeNumber.toUpperCase(),
          name,
          email,
          position,
          area,
          role,
          passwordHash: await hashPassword(temporaryPassword),
        },
        res.locals.authUser!,
      );
      if (result.status !== 'ok') {
        sendMutationError(res, result);
        return;
      }
      res.status(201).json({ status: 'ok', collaborator: result.value });
    } catch (error) {
      next(error);
    }
  });

  router.put('/admin/collaborators/:id', ...administrator, async (req, res, next) => {
    const id = parseId(readRouteParam(req.params.id));
    const body = req.body ?? {};
    const name = readString(body.name, 1, 160);
    const email = readOptionalString(body.email, 254);
    const position = readOptionalString(body.position, 120);
    const area = readOptionalString(body.area, 120);
    const role = readRole(body.role);
    if (!id || !name || email === undefined || position === undefined ||
        area === undefined || !role || (email !== null && !isEmail(email))) {
      res.status(400).json({ status: 'error', message: 'Datos de colaborador inválidos' });
      return;
    }
    try {
      const result = await repository.updateCollaborator(
        id,
        { name, email, position, area, role },
        res.locals.authUser!,
      );
      if (result.status !== 'ok') {
        sendMutationError(res, result);
        return;
      }
      res.status(200).json({ status: 'ok', collaborator: result.value });
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    '/admin/collaborators/:id/deactivate',
    ...administrator,
    async (req, res, next) => {
      const id = parseId(readRouteParam(req.params.id));
      if (!id) {
        res.status(400).json({ status: 'error', message: 'ID inválido' });
        return;
      }
      try {
        const result = await repository.deactivateCollaborator(
          id,
          res.locals.authUser!,
        );
        if (result.status !== 'ok') {
          sendMutationError(res, result);
          return;
        }
        res.status(200).json({ status: 'ok', collaborator: result.value });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/admin/collaborators/:id/reactivate',
    ...administrator,
    async (req, res, next) => {
      const id = parseId(readRouteParam(req.params.id));
      if (!id) {
        res.status(400).json({ status: 'error', message: 'ID inválido' });
        return;
      }
      try {
        const result = await repository.reactivateCollaborator(
          id,
          res.locals.authUser!,
        );
        if (result.status !== 'ok') {
          sendMutationError(res, result);
          return;
        }
        res.status(200).json({ status: 'ok', collaborator: result.value });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
