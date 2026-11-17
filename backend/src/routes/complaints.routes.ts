import { Router } from 'express';
import {
  optionalAuth,
  requireAuth,
  requireRole,
} from '../middlewares/auth.middleware';
import type { TokenService } from '../services/token.service';
import type { AuthRepository } from '../types/auth';
import type { ModulesRepository } from '../types/modules';
import {
  FOLIO_PATTERN,
  UUID_PATTERN,
  readPagination,
  readRouteParam,
  readString,
} from './validation';

export const createComplaintsRouter = (
  authRepository: AuthRepository,
  repository: ModulesRepository,
  tokens: TokenService,
): Router => {
  const router = Router();
  const authenticate = requireAuth(authRepository, tokens);
  const optionallyAuthenticate = optionalAuth(authRepository, tokens);
  const complaintsAdmin = requireRole(
    'responsable_quejas',
    'administrador',
    'director',
  );

  router.get('/complaint-categories', async (_req, res, next) => {
    try {
      const items = await repository.listComplaintCategories();
      res.status(200).json({ status: 'ok', items, total: items.length });
    } catch (error) {
      next(error);
    }
  });

  router.post('/complaints', optionallyAuthenticate, async (req, res, next) => {
    const body = req.body ?? {};
    const categoryCode = readString(body.categoryCode, 1, 40);
    const subject = readString(body.subject, 1, 160);
    const description = readString(body.description, 1, 4000);
    if (typeof body.anonymous !== 'boolean' || !categoryCode || !subject ||
        !description) {
      res.status(400).json({ status: 'error', message: 'Queja inválida' });
      return;
    }
    if (!body.anonymous && !res.locals.authUser) {
      res.status(401).json({
        status: 'error',
        message: 'Autenticación requerida para una queja identificada',
      });
      return;
    }
    try {
      const result = await repository.createComplaint(
        {
          categoryCode: categoryCode.toUpperCase(),
          anonymous: body.anonymous,
          subject,
          description,
        },
        body.anonymous ? null : res.locals.authUser!,
      );
      if (result.status !== 'ok') {
        res.status(409).json({
          status: 'error',
          message: 'Categoría o folio no disponible',
        });
        return;
      }
      res.status(201).json({
        status: 'ok',
        complaint: { folio: result.value.folio },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/complaints/track/:folio', async (req, res, next) => {
    const folio = readRouteParam(req.params.folio)?.toUpperCase() ?? null;
    if (!folio || !FOLIO_PATTERN.test(folio)) {
      res.status(400).json({ status: 'error', message: 'Folio inválido' });
      return;
    }
    try {
      const complaint = await repository.trackComplaint(folio);
      if (!complaint) {
        res.status(404).json({ status: 'error', message: 'Folio no encontrado' });
        return;
      }
      res.status(200).json({ status: 'ok', complaint });
    } catch (error) {
      next(error);
    }
  });

  router.get(
    '/admin/complaints',
    authenticate,
    complaintsAdmin,
    async (req, res, next) => {
      const pagination = readPagination(req.query.page, req.query.pageSize);
      if (!pagination) {
        res.status(400).json({ status: 'error', message: 'Paginación inválida' });
        return;
      }
      try {
        const result = await repository.listComplaints(
          pagination.page,
          pagination.pageSize,
        );
        res.status(200).json({ status: 'ok', ...result, ...pagination });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/admin/complaints/:id',
    authenticate,
    complaintsAdmin,
    async (req, res, next) => {
      const id = readRouteParam(req.params.id);
      if (!id || !UUID_PATTERN.test(id)) {
        res.status(400).json({ status: 'error', message: 'ID inválido' });
        return;
      }
      try {
        const complaint = await repository.getComplaint(id);
        if (!complaint) {
          res.status(404).json({ status: 'error', message: 'Queja no encontrada' });
          return;
        }
        res.status(200).json({ status: 'ok', complaint });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/admin/complaints/:id/status',
    authenticate,
    complaintsAdmin,
    async (req, res, next) => {
      const id = readRouteParam(req.params.id);
      if (!id || !UUID_PATTERN.test(id)) {
        res.status(400).json({ status: 'error', message: 'ID inválido' });
        return;
      }
      const statusCode = readString(req.body?.statusCode, 1, 40);
      if (!statusCode) {
        res.status(400).json({ status: 'error', message: 'Estado inválido' });
        return;
      }
      try {
        const result = await repository.updateComplaintStatus(
          id,
          statusCode.toUpperCase(),
          res.locals.authUser!,
        );
        if (result.status === 'not_found') {
          res.status(404).json({ status: 'error', message: 'Queja no encontrada' });
          return;
        }
        if (result.status !== 'ok') {
          res.status(409).json({ status: 'error', message: 'Estado no disponible' });
          return;
        }
        res.status(200).json({ status: 'ok', complaint: result.value });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
