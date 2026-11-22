import { createApp } from './app';
import { createPool } from './config/database';
import { loadConfig } from './config/env';
import { createPostgresRepository } from './repositories/postgres.repository';
import { createModulesRepository } from './repositories/modules.repository';
import { createTokenService } from './services/token.service';

const config = loadConfig();
const pool = createPool(config);
const repository = createPostgresRepository(pool);
const modulesRepository = createModulesRepository(pool);
const app = createApp({
  authRepository: repository,
  healthRepository: repository,
  syncRepository: repository,
  modulesRepository,
  tokens: createTokenService(config.jwtSecret),
  corsOrigins: config.corsOrigins,
});

const server = app.listen(config.port, config.host, () => {
  console.log(
    `FALCÓN Local API escuchando en http://${config.host}:${config.port}`,
  );
  console.log('PostgreSQL configurado exclusivamente en el host local');
});

const shutdown = (signal: string) => {
  console.log(`Cerrando API por ${signal}`);
  server.close(() => {
    void pool.end().finally(() => process.exit(0));
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
