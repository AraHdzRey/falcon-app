import type { FalconConfig } from '../config/env';

const MUTABLE_DATABASES = new Set(['falcon_db', 'falcon_test']);

export const assertMutableDatabase = (config: FalconConfig): void => {
  if (config.nodeEnv === 'production') {
    throw new Error('Operación destructiva prohibida con NODE_ENV=production');
  }
  if (!MUTABLE_DATABASES.has(config.databaseUrl.database)) {
    throw new Error(
      `Base no autorizada para seed/reset: ${config.databaseUrl.database}`,
    );
  }
};

export const assertTestDatabase = (config: FalconConfig): void => {
  if (config.nodeEnv !== 'test' || config.databaseUrl.database !== 'falcon_test') {
    throw new Error(
      'La prueba de integración exige NODE_ENV=test y DB_NAME=falcon_test',
    );
  }
};
