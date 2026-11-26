import { Router, type RequestHandler } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import {
  buildComplaintDetailPdf,
  buildComplaintsSummaryPdf,
} from '../services/complaints-pdf.service';
import { createPdfTicketService } from '../services/pdf-ticket.service';
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

const ALLOWED_FILTER_KEYS: ReadonlySet<string> = new Set([
  'status',
  'severity',
  'type',
  'category',
  'from',
  'to',
  'page',
  'pageSize',
  'ticket',
]);

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseComplaintFilters = (
  query: Record<string, unknown>,
  strictKeys = false,
): ComplaintFilters | null => {
  if (strictKeys) {
    for (const key of Object.keys(query)) {
      if (!ALLOWED_FILTER_KEYS.has(key)) {
        return null;
      }
    }
  }

  const filters: ComplaintFilters = {};

  if (query.status !== undefined) {
    const status = readComplaintStatus(query.status);
    if (!status) return null;
    filters.status = status;
  }

  if (query.severity !== undefined) {
    const severity = readComplaintSeverity(query.severity);
    if (!severity) return null;
    filters.severity = severity;
  }

  if (query.type !== undefined) {
    const type = readComplaintType(query.type);
    if (!type) return null;
    filters.type = type;
  }

  if (query.category !== undefined) {
    const category = readString(query.category, 1, 40);
    if (!category) return null;
    filters.category = category.toUpperCase();
  }

  if (query.from !== undefined) {
    const from = readIsoDate(query.from);
    if (!from) return null;
    filters.from = from;
  }

  if (query.to !== undefined) {
    const to = readIsoDate(query.to);
    if (!to) return null;
    filters.to = to;
  }

  if (
    filters.from &&
    filters.to &&
    Date.parse(filters.from) > Date.parse(filters.to)
  ) {
    return null;
  }

  return filters;
};

export const createComplaintsRouter = (
  authRepository: AuthRepository,
  repository: ModulesRepository,
  tokens: TokenService,
): Router => {
  const router = Router();
  const authenticate = requireAuth(authRepository, tokens);
  const complaintsAdmin = requireRole('administrador');
  const pdfTickets = createPdfTicketService();

  const authenticateAdminOrTicket: RequestHandler = (req, res, next) => {
    if (req.query.ticket !== undefined) {
      next();
      return;
    }
    authenticate(req, res, (authError?: unknown) => {
      if (authError) {
        next(authError);
        return;
      }
      complaintsAdmin(req, res, next);
    });
  };

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

      const filters = parseComplaintFilters(
        req.query as Record<string, unknown>,
      );
      if (!filters) {
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

  router.post(
    '/admin/complaints/report-ticket',
    authenticate,
    complaintsAdmin,
    (req, res) => {
      if (!isPlainRecord(req.body)) {
        res.status(400).json({
          status: 'error',
          message: 'Solicitud de ticket inválida',
        });
        return;
      }

      const actor = res.locals.authUser!;
      const scope = req.body.scope;

      if (scope === 'summary') {
        if (req.body.filters !== undefined && !isPlainRecord(req.body.filters)) {
          res.status(400).json({
            status: 'error',
            message: 'Filtros inválidos',
          });
          return;
        }
        const filters =
          req.body.filters === undefined
            ? {}
            : parseComplaintFilters(req.body.filters, true);
        if (!filters) {
          res.status(400).json({
            status: 'error',
            message: 'Filtros inválidos',
          });
          return;
        }
        const { ticket, expiresInSeconds } = pdfTickets.issue({
          actor,
          scope: 'summary',
          filters,
        });
        res.status(201).json({
          status: 'ok',
          ticket,
          expiresInSeconds,
          downloadPath: `/admin/complaints/report.pdf?ticket=${encodeURIComponent(ticket)}`,
        });
        return;
      }

      if (scope === 'single') {
        const complaintId =
          typeof req.body.complaintId === 'string'
            ? req.body.complaintId.trim()
            : '';
        if (!UUID_PATTERN.test(complaintId)) {
          res.status(400).json({
            status: 'error',
            message: 'ID inválido',
          });
          return;
        }
        const { ticket, expiresInSeconds } = pdfTickets.issue({
          actor,
          scope: 'single',
          complaintId,
        });
        res.status(201).json({
          status: 'ok',
          ticket,
          expiresInSeconds,
          downloadPath: `/admin/complaints/${complaintId}/report.pdf?ticket=${encodeURIComponent(ticket)}`,
        });
        return;
      }

      res.status(400).json({
        status: 'error',
        message: 'Alcance de reporte inválido',
      });
    },
  );

  router.get(
    '/admin/complaints/report.pdf',
    authenticateAdminOrTicket,
    async (req, res, next) => {
      let actor = res.locals.authUser;
      let filters: ComplaintFilters | null = null;

      if (req.query.ticket !== undefined) {
        const rawTicket =
          typeof req.query.ticket === 'string' ? req.query.ticket : '';
        const consumed = pdfTickets.consume(rawTicket, 'summary');
        if (!consumed) {
          res.status(401).json({
            status: 'error',
            message: 'Ticket de descarga inválido o expirado',
          });
          return;
        }
        actor = consumed.actor;
        filters = consumed.filters ?? {};
      } else {
        filters = parseComplaintFilters(req.query as Record<string, unknown>);
        if (!filters) {
          res.status(400).json({ status: 'error', message: 'Filtros inválidos' });
          return;
        }
      }

      try {
        const resolvedActor = actor!;
        const result = await repository.listComplaints(1, 500, filters);
        await repository.recordComplaintReportExport(resolvedActor, {
          scope: 'summary',
          filters,
          totalItems: result.items.length,
        });
        const pdfBuffer = await buildComplaintsSummaryPdf(
          result,
          filters,
          resolvedActor,
        );
        const dateStamp = new Date()
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, '');
        res
          .status(200)
          .set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="falcon-te-escucha-reporte-${dateStamp}.pdf"`,
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
          })
          .send(pdfBuffer);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/admin/complaints/:id/report.pdf',
    authenticateAdminOrTicket,
    async (req, res, next) => {
      const id = readRouteParam(req.params.id);
      let actor = res.locals.authUser;

      if (req.query.ticket !== undefined) {
        const rawTicket =
          typeof req.query.ticket === 'string' ? req.query.ticket : '';
        const consumed =
          id && UUID_PATTERN.test(id)
            ? pdfTickets.consume(rawTicket, 'single', id)
            : null;
        if (!consumed) {
          res.status(401).json({
            status: 'error',
            message: 'Ticket de descarga inválido o expirado',
          });
          return;
        }
        actor = consumed.actor;
      } else if (!id || !UUID_PATTERN.test(id)) {
        res.status(400).json({ status: 'error', message: 'ID inválido' });
        return;
      }

      try {
        const complaint = await repository.getComplaint(id!);
        if (!complaint) {
          res
            .status(404)
            .json({ status: 'error', message: 'Queja no encontrada' });
          return;
        }
        const resolvedActor = actor!;
        await repository.recordComplaintReportExport(resolvedActor, {
          scope: 'single',
          complaintId: complaint.id,
          folio: complaint.folio,
          totalItems: 1,
        });
        const pdfBuffer = await buildComplaintDetailPdf(
          complaint,
          resolvedActor,
        );
        res
          .status(200)
          .set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="falcon-te-escucha-${complaint.folio}.pdf"`,
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
          })
          .send(pdfBuffer);
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
