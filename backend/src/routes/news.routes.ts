import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import type { AuthRepository } from '../types/auth';
import type { ModulesRepository } from '../types/modules';
import type { TokenService } from '../services/token.service';
import { readRouteParam, readString } from './validation';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseNewsBody = (
  body: Record<string, unknown>,
): { title: string; body: string } | null => {
  const title = readString(body.title, 1, 160);
  const content = readString(body.body, 1, 2000);
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

  router.get('/news', authenticate, async (_req, res, next) => {
    try {
      const items = await repository.listNews();
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
    const input = parseNewsBody(req.body ?? {});
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
    const input = parseNewsBody(req.body ?? {});
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

  return router;
};
