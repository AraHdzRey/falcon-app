import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import type { AuthRepository, HealthRepository } from './types/auth';
import type { SyncRepository } from './types/sync';
import type { ModulesRepository } from './types/modules';
import type { DirectoryRepository } from './domain/directory/directory.repository';
import type { TokenService } from './services/token.service';
import { createAuthRouter } from './routes/auth.routes';
import { openApiDocument } from './openapi';
import { createSyncRouter } from './routes/sync.routes';
import { createDirectoryRouter } from './routes/directory.routes';
import { createAdminRouter } from './routes/admin.routes';
import { createNewsRouter } from './routes/news.routes';
import { createComplaintsRouter } from './routes/complaints.routes';
import { createAuditRouter } from './routes/audit.routes';

export interface AppDependencies {
  authRepository: AuthRepository;
  healthRepository: HealthRepository;
  syncRepository: SyncRepository;
  modulesRepository: ModulesRepository;
  directoryRepository?: DirectoryRepository;
  tokens: TokenService;
  corsOrigins?: string[];
}

export const createApp = (dependencies: AppDependencies) => {
  const app = express();
  const origins = new Set(dependencies.corsOrigins ?? []);

  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origen no autorizado por CORS'));
      },
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(
    createDirectoryRouter(
      dependencies.authRepository,
      dependencies.directoryRepository ?? dependencies.modulesRepository,
      dependencies.tokens,
    ),
  );
  app.use(
    createAdminRouter(
      dependencies.authRepository,
      dependencies.modulesRepository,
      dependencies.tokens,
    ),
  );
  app.use(
    createNewsRouter(
      dependencies.authRepository,
      dependencies.modulesRepository,
      dependencies.tokens,
    ),
  );
  app.use(
    createComplaintsRouter(
      dependencies.authRepository,
      dependencies.modulesRepository,
      dependencies.tokens,
    ),
  );
  app.use(
    createAuditRouter(
      dependencies.authRepository,
      dependencies.modulesRepository,
      dependencies.tokens,
    ),
  );

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      application: 'FALCÓN Local API',
    });
  });

  app.get('/health/db', async (_req, res) => {
    try {
      const result = await dependencies.healthRepository.check();
      res.status(200).json({
        status: 'ok',
        database: result.database,
      });
    } catch {
      res.status(503).json({
        status: 'error',
        message: 'PostgreSQL no está disponible',
      });
    }
  });

  app.get('/openapi.json', (_req, res) => {
    res.status(200).json(openApiDocument);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.use(createAuthRouter(dependencies.authRepository, dependencies.tokens));
  app.use(
    createSyncRouter(
      dependencies.authRepository,
      dependencies.syncRepository,
      dependencies.tokens,
    ),
  );

  app.use((_req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Ruta no encontrada',
    });
  });

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    void _next;
    console.error('FALCÓN API error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
    });
  };
  app.use(handleError);

  return app;
};
