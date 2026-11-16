import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import type { TokenService } from '../services/token.service';
import type { AuthRepository } from '../types/auth';
import type { ModulesRepository } from '../types/modules';
import { readPagination } from './validation';

export const createAuditRouter = (
  authRepository: AuthRepository,
  repository: ModulesRepository,
  tokens: TokenService,
): Router => {
  const router = Router();
  router.get(
    '/admin/audit',
    requireAuth(authRepository, tokens),
    requireRole('administrador', 'auditor'),
    async (req, res, next) => {
      const pagination = readPagination(req.query.page, req.query.pageSize);
      if (!pagination) {
        res.status(400).json({ status: 'error', message: 'Paginación inválida' });
        return;
      }
      try {
        const result = await repository.listAudit(
          pagination.page,
          pagination.pageSize,
        );
        res.status(200).json({ status: 'ok', ...result, ...pagination });
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
};
