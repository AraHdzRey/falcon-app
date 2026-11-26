import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import type { TokenService } from '../services/token.service';
import type { AuthRepository } from '../types/auth';
import type {
  ComplaintFilters,
  ComplaintSeverity,
  ComplaintStatusCode,
  ComplaintStatusUpdate,
  ComplaintType,
  ModulesRepository,
} from '../types/modules';
import {
  FOLIO_PATTERN,
  UUID_PATTERN,
  readOptionalString,
  readPagination,
  readRouteParam,
  readString,
} from './validation';

const COMPLAINT_TYPES: ReadonlySet<ComplaintType> = new Set([
  'QUEJA',
  'SUGERENCIA',
  'INCIDENCIA',
]);

const COMPLAINT_SEVERITIES: ReadonlySet<ComplaintSeverity> = new Set([
  'BAJA',
  'MEDIA',
  'ALTA',
  'CRITICA',
]);

const COMPLAINT_STATUSES: ReadonlySet<ComplaintStatusCode> = new Set([
  'RECEIVED',
  'UNDER_REVIEW',
  'RESOLVED',
  'CLOSED',
]);

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const readComplaintType = (value: unknown): ComplaintType | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return COMPLAINT_TYPES.has(normalized as ComplaintType)
    ? (normalized as ComplaintType)
    : null;
};

const readComplaintSeverity = (value: unknown): ComplaintSeverity | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return COMPLAINT_SEVERITIES.has(normalized as ComplaintSeverity)
    ? (normalized as ComplaintSeverity)
    : null;
};

const readComplaintStatus = (value: unknown): ComplaintStatusCode | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return COMPLAINT_STATUSES.has(normalized as ComplaintStatusCode)
    ? (normalized as ComplaintStatusCode)
    : null;
};

const readIsoDate = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!ISO_DATE_PATTERN.test(normalized)) return null;
  return Number.isNaN(Date.parse(normalized)) ? null : normalized;
};

export const createComplaintsRouter = (
  authRepository: AuthRepository,
  repository: ModulesRepository,
  tokens: TokenService,
): Router => {
  const router = Router();
  const authenticate = requireAuth(authRepository, tokens);
  const complaintsAdmin = requireRole('administrador');

  router.get('/complaint-categories', authenticate, async (_req, res, next) => {
    try {
      const items = await repository.listComplaintCategories();
      res.status(200).json({ status: 'ok', items, total: items.length });
    } catch (error) {
      next(error);
    }
  });

  router.post('/complaints', authenticate, async (req, res, next) => {
    const body = req.body ?? {};
    if (body.anonymous !== undefined && body.anonymous !== false) {
      res.status(400).json({
        status: 'error',
        message: 'El envío anónimo no está permitido en Falcón te escucha',
      });
      return;
    }

    const type = readComplaintType(body.type);
    const categoryCode = readString(body.categoryCode, 1, 40);
    const severity = readComplaintSeverity(body.severity);
    const subject = readString(body.subject, 1, 160);
    const description = readString(body.description, 1, 4000);

    if (!type || !categoryCode || !severity || !subject || !description) {
      res.status(400).json({ status: 'error', message: 'Queja inválida' });
      return;
    }

    try {
      const result = await repository.createComplaint(
        {
          type,
          categoryCode: categoryCode.toUpperCase(),
          severity,
          subject,
          description,
        },
        res.locals.authUser!,
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
        complaint: result.value,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/complaints/mine', authenticate, async (req, res, next) => {
    const pagination = readPagination(req.query.page, req.query.pageSize);
    if (!pagination) {
      res.status(400).json({ status: 'error', message: 'Paginación inválida' });
      return;
    }
    try {
      const result = await repository.listMyComplaints(
        res.locals.authUser!.userId,
        pagination.page,
        pagination.pageSize,
      );
      res.status(200).json({ status: 'ok', ...result, ...pagination });
    } catch (error) {
      next(error);
    }
  });

  router.get('/complaints/track/:folio', authenticate, async (req, res, next) => {
    const folio = readRouteParam(req.params.folio)?.toUpperCase() ?? null;
    if (!folio || !FOLIO_PATTERN.test(folio)) {
      res.status(400).json({ status: 'error', message: 'Folio inválido' });
      return;
    }
    try {
      const tracked = await repository.getComplaintByFolio(folio);
      const authUser = res.locals.authUser!;
      if (
        !tracked ||
        (authUser.role !== 'administrador' &&
          tracked.remitenteUsuarioId !== authUser.userId)
      ) {
        res.status(404).json({ status: 'error', message: 'Folio no encontrado' });
        return;
      }
      const { remitenteUsuarioId: _remitenteUsuarioId, ...complaint } = tracked;
      void _remitenteUsuarioId;
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

      const filters: ComplaintFilters = {};

      if (req.query.status !== undefined) {
        const status = readComplaintStatus(req.query.status);
        if (!status) {
          res.status(400).json({ status: 'error', message: 'Filtros inválidos' });
          return;
        }
        filters.status = status;
      }

      if (req.query.severity !== undefined) {
        const severity = readComplaintSeverity(req.query.severity);
        if (!severity) {
          res.status(400).json({ status: 'error', message: 'Filtros inválidos' });
          return;
        }
        filters.severity = severity;
      }

      if (req.query.type !== undefined) {
        const type = readComplaintType(req.query.type);
        if (!type) {
          res.status(400).json({ status: 'error', message: 'Filtros inválidos' });
          return;
        }
        filters.type = type;
      }

      if (req.query.category !== undefined) {
        const category = readString(req.query.category, 1, 40);
        if (!category) {
          res.status(400).json({ status: 'error', message: 'Filtros inválidos' });
          return;
        }
        filters.category = category.toUpperCase();
      }

      if (req.query.from !== undefined) {
        const from = readIsoDate(req.query.from);
        if (!from) {
          res.status(400).json({ status: 'error', message: 'Filtros inválidos' });
          return;
        }
        filters.from = from;
      }

      if (req.query.to !== undefined) {
        const to = readIsoDate(req.query.to);
        if (!to) {
          res.status(400).json({ status: 'error', message: 'Filtros inválidos' });
          return;
        }
        filters.to = to;
      }

      if (
        filters.from &&
        filters.to &&
        Date.parse(filters.from) > Date.parse(filters.to)
      ) {
        res.status(400).json({ status: 'error', message: 'Filtros inválidos' });
        return;
      }

      try {
        const result = await repository.listComplaints(
          pagination.page,
          pagination.pageSize,
          filters,
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

      const body = req.body ?? {};
      const hasStatusCode = body.statusCode !== undefined;
      const hasSeverity = body.severity !== undefined;
      const hasFollowUpNote = body.followUpNote !== undefined;

      if (!hasStatusCode && !hasSeverity && !hasFollowUpNote) {
        res.status(400).json({
          status: 'error',
          message: 'Debes indicar al menos estado, gravedad o nota de seguimiento',
        });
        return;
      }

      const update: ComplaintStatusUpdate = {};

      if (hasStatusCode) {
        const rawStatus = readString(body.statusCode, 1, 40);
        if (!rawStatus) {
          res.status(400).json({ status: 'error', message: 'Estado inválido' });
          return;
        }
        const statusCode = readComplaintStatus(rawStatus);
        if (!statusCode) {
          res.status(400).json({ status: 'error', message: 'Estado inválido' });
          return;
        }
        update.statusCode = statusCode;
      }

      if (hasSeverity) {
        const severity = readComplaintSeverity(body.severity);
        if (!severity) {
          res.status(400).json({ status: 'error', message: 'Gravedad inválida' });
          return;
        }
        update.severity = severity;
      }

      if (hasFollowUpNote) {
        const followUpNote = readOptionalString(body.followUpNote, 2000);
        if (followUpNote === undefined) {
          res.status(400).json({
            status: 'error',
            message: 'Nota de seguimiento inválida',
          });
          return;
        }
        update.followUpNote = followUpNote;
      }

      try {
        const result = await repository.updateComplaintStatus(
          id,
          update,
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
