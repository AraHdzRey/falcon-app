import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthRepository, FalconRole, SessionUser } from '../types/auth';
import type { TokenService } from '../services/token.service';

declare global {
  namespace Express {
    interface Locals {
      authUser?: SessionUser;
    }
  }
}

export const requireAuth = (
  repository: AuthRepository,
  tokens: TokenService,
): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    const match = /^Bearer\s+([^\s]+)$/.exec(req.headers.authorization ?? '');
    if (!match?.[1]) {
      res.status(401).json({
        status: 'error',
        message: 'Autenticación requerida',
      });
      return;
    }

    const claims = tokens.verify(match[1]);
    if (!claims) {
      res.status(401).json({
        status: 'error',
        message: 'Token inválido o expirado',
      });
      return;
    }

    try {
      const user = await repository.getSessionUser(
        claims.userId,
        claims.tokenVersion,
      );
      if (!user) {
        res.status(401).json({
          status: 'error',
          message: 'Cuenta inactiva o sesión revocada',
        });
        return;
      }
      res.locals.authUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };

export const optionalAuth = (
  repository: AuthRepository,
  tokens: TokenService,
): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
      next();
      return;
    }

    const match = /^Bearer\s+([^\s]+)$/.exec(authorization);
    const claims = match?.[1] ? tokens.verify(match[1]) : null;
    if (!claims) {
      res.status(401).json({
        status: 'error',
        message: 'Token inválido o expirado',
      });
      return;
    }

    try {
      const user = await repository.getSessionUser(
        claims.userId,
        claims.tokenVersion,
      );
      if (!user) {
        res.status(401).json({
          status: 'error',
          message: 'Cuenta inactiva o sesión revocada',
        });
        return;
      }
      res.locals.authUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };

export const requireRole = (...allowed: FalconRole[]): RequestHandler =>
  (_req, res, next) => {
    const user = res.locals.authUser;
    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Autenticación requerida',
      });
      return;
    }
    if (!allowed.includes(user.role)) {
      res.status(403).json({
        status: 'error',
        message: 'Permisos insuficientes',
      });
      return;
    }
    next();
  };
