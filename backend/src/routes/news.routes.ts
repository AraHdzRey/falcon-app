import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import type { AuthRepository } from '../types/auth';
import type { ModulesRepository } from '../types/modules';
import type { TokenService } from '../services/token.service';
import { UUID_PATTERN, readRouteParam, readString } from './validation';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasAsciiControlChars = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
};

const hasDangerousBodyControlChars = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (
      code <= 0x08 ||
      code === 0x0b ||
      code === 0x0c ||
      (code >= 0x0e && code <= 0x1f) ||
      code === 0x7f
    ) {
      return true;
    }
  }
  return false;
};

const parseNewsBody = (
  rawBody: unknown,
): { title: string; body: string } | null => {
  if (!isPlainObject(rawBody)) {
    return null;
  }
  if (
    typeof rawBody.title !== 'string' ||
    hasAsciiControlChars(rawBody.title) ||
    typeof rawBody.body !== 'string' ||
    hasDangerousBodyControlChars(rawBody.body)
  ) {
    return null;
  }
  const title = readString(rawBody.title, 1, 160);
  const content = readString(rawBody.body, 1, 2000);
  return title && content ? { title, body: content } : null;
};

export const createNewsRouter = (
  authRepository: AuthRepository,
  repository: ModulesRepository,
  tokens: TokenService,
): Router => {
  const router = Router();
  const authenticate = requireAuth(authRepository, tokens);
  const canEdit = requireRole('editor_noticias', 'administrador');

  router.get('/news', authenticate, async (req, res, next) => {
    let search: string | undefined;
    if (req.query.search !== undefined) {
      if (
        typeof req.query.search !== 'string' ||
        hasAsciiControlChars(req.query.search)
      ) {
        res.status(400).json({ status: 'error', message: 'Filtros inválidos' });
        return;
      }
      const parsedSearch = readString(req.query.search, 1, 120);
      if (!parsedSearch) {
        res.status(400).json({ status: 'error', message: 'Filtros inválidos' });
        return;
      }
      search = parsedSearch;
    }
    try {
      const items = await repository.listNews({ search });
      res.status(200).json({ status: 'ok', items, total: items.length });
    } catch (error) {
      next(error);
    }
  });

  router.get('/news/:id', authenticate, async (req, res, next) => {
    const id = readRouteParam(req.params.id);
    if (!id || !UUID_PATTERN.test(id)) {
      res.status(400).json({ status: 'error', message: 'ID inválido' });
      return;
    }
    try {
      const news = await repository.getNews(id);
      if (!news) {
        res.status(404).json({ status: 'error', message: 'Noticia no encontrada' });
        return;
      }
      res.status(200).json({ status: 'ok', news });
    } catch (error) {
      next(error);
    }
  });

  router.post('/news', authenticate, canEdit, async (req, res, next) => {
    const input = parseNewsBody(req.body);
    if (!input) {
      res.status(400).json({ status: 'error', message: 'Noticia inválida' });
      return;
    }
    try {
      const news = await repository.createNews(input, res.locals.authUser!);
      res.status(201).json({ status: 'ok', news });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/news/:id', authenticate, canEdit, async (req, res, next) => {
    const id = readRouteParam(req.params.id);
    if (!id || !UUID_PATTERN.test(id)) {
      res.status(400).json({ status: 'error', message: 'ID inválido' });
      return;
    }
    const input = parseNewsBody(req.body);
    if (!input) {
      res.status(400).json({ status: 'error', message: 'Noticia inválida' });
      return;
    }
    try {
      const news = await repository.updateNews(
        id,
        input,
        res.locals.authUser!,
      );
      if (!news) {
        res.status(404).json({ status: 'error', message: 'Noticia no encontrada' });
        return;
      }
      res.status(200).json({ status: 'ok', news });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/news/:id/deactivate', authenticate, canEdit, async (req, res, next) => {
    const id = readRouteParam(req.params.id);
    if (!id || !UUID_PATTERN.test(id)) {
      res.status(400).json({ status: 'error', message: 'ID inválido' });
      return;
    }
    try {
      const news = await repository.deactivateNews(id, res.locals.authUser!);
      if (!news) {
        res.status(404).json({ status: 'error', message: 'Noticia no encontrada' });
        return;
      }
      res.status(200).json({ status: 'ok', news });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
