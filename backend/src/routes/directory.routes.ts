import { Router } from 'express';
import { createListDirectoryUseCase } from '../application/directory/list-directory.use-case';
import { createGetMyProfileUseCase } from '../application/directory/get-my-profile.use-case';
import type { DirectoryRepository } from '../domain/directory/directory.repository';
import { requireAuth } from '../middlewares/auth.middleware';
import type { TokenService } from '../services/token.service';
import type { AuthRepository } from '../types/auth';
import { readString } from './validation';

export const createDirectoryRouter = (
  authRepository: AuthRepository,
  directoryRepository: DirectoryRepository,
  tokens: TokenService,
): Router => {
  const router = Router();
  const authenticate = requireAuth(authRepository, tokens);

  const listDirectory = createListDirectoryUseCase(directoryRepository);
  const getMyProfile = createGetMyProfileUseCase(directoryRepository);

  router.get('/directory', authenticate, async (req, res, next) => {
    const search = req.query.search === undefined
      ? undefined
      : readString(req.query.search, 1, 120);
    const area = req.query.area === undefined
      ? undefined
      : readString(req.query.area, 1, 120);

    if ((req.query.search !== undefined && !search) ||
        (req.query.area !== undefined && !area)) {
      res.status(400).json({ status: 'error', message: 'Filtros inválidos' });
      return;
    }

    try {
      const items = await listDirectory({
        search: search ?? undefined,
        area: area ?? undefined,
      });

      res.status(200).json({
        status: 'ok',
        items,
        total: items.length,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/profile/me', authenticate, async (_req, res, next) => {
    try {
      const profile = await getMyProfile(
        res.locals.authUser!.userId,
      );

      if (!profile) {
        res.status(404).json({
          status: 'error',
          message: 'Perfil no encontrado',
        });
        return;
      }

      res.status(200).json({
        status: 'ok',
        profile,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
