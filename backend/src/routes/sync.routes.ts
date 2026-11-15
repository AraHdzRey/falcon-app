import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import type { AuthRepository } from '../types/auth';
import type { SyncOperation, SyncRepository } from '../types/sync';
import type { TokenService } from '../services/token.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseOperation = (value: unknown, deviceId: string): SyncOperation | null => {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;
  const payload = candidate.payload;
  if (typeof payload !== 'object' || payload === null) return null;
  const content = payload as Record<string, unknown>;
  const baseVersion = candidate.baseVersion;
  if (
    typeof candidate.id !== 'string' ||
    !UUID_PATTERN.test(candidate.id) ||
    candidate.entity !== 'news' ||
    candidate.operation !== 'upsert' ||
    !(
      baseVersion === null ||
      (typeof baseVersion === 'number' &&
        Number.isSafeInteger(baseVersion) &&
        baseVersion > 0)
    ) ||
    typeof content.id !== 'string' ||
    !UUID_PATTERN.test(content.id) ||
    typeof content.title !== 'string' ||
    content.title.trim().length < 1 ||
    content.title.trim().length > 160 ||
    typeof content.body !== 'string' ||
    content.body.trim().length < 1 ||
    content.body.trim().length > 2000
  ) {
    return null;
  }
  return {
    id: candidate.id,
    deviceId,
    entity: 'news',
    operation: 'upsert',
    baseVersion: baseVersion as number | null,
    payload: {
      id: content.id,
      title: content.title.trim(),
      body: content.body.trim(),
    },
  };
};

export const createSyncRouter = (
  authRepository: AuthRepository,
  syncRepository: SyncRepository,
  tokens: TokenService,
): Router => {
  const router = Router();
  const authenticate = requireAuth(authRepository, tokens);

  router.get('/sync/changes', authenticate, async (req, res, next) => {
    const raw = typeof req.query.sinceVersion === 'string'
      ? req.query.sinceVersion
      : '0';
    const sinceVersion = Number(raw);
    if (!Number.isSafeInteger(sinceVersion) || sinceVersion < 0) {
      res.status(400).json({ status: 'error', message: 'sinceVersion inválido' });
      return;
    }
    try {
      const snapshot = await syncRepository.getChanges(
        res.locals.authUser!,
        sinceVersion,
      );
      res.status(200).json({ status: 'ok', ...snapshot });
    } catch (error) {
      next(error);
    }
  });

  router.post('/sync/operations', authenticate, async (req, res, next) => {
    if (!['editor_noticias', 'administrador'].includes(res.locals.authUser!.role)) {
      res.status(403).json({
        status: 'error',
        message: 'El rol actual no puede publicar noticias',
      });
      return;
    }
    const body = req.body ?? {};
    if (
      typeof body.deviceId !== 'string' ||
      !UUID_PATTERN.test(body.deviceId) ||
      !Array.isArray(body.operations) ||
      body.operations.length < 1 ||
      body.operations.length > 50
    ) {
      res.status(400).json({ status: 'error', message: 'Lote de sincronización inválido' });
      return;
    }
    const operations = body.operations.map((value: unknown) =>
      parseOperation(value, body.deviceId),
    );
    if (operations.some((operation: SyncOperation | null) => operation === null)) {
      res.status(400).json({ status: 'error', message: 'Operación de sincronización inválida' });
      return;
    }
    try {
      const results = await syncRepository.applyOperations(
        res.locals.authUser!,
        operations as SyncOperation[],
      );
      res.status(200).json({ status: 'ok', results });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
