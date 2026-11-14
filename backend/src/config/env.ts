import dotenv from 'dotenv';

export interface FalconConfig {
  host: string;
  port: number;
  databaseUrl: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  jwtSecret: string;
  corsOrigins: string[];
}

const requireValue = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value || value === 'CHANGE_ME') {
    throw new Error(`La variable ${name} no está configurada`);
  }
  return value;
};

const parsePort = (name: string, fallback: number): number => {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`La variable ${name} no contiene un puerto válido`);
  }
  return value;
};

export const loadConfig = (): FalconConfig => {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

  const host = process.env.HOST?.trim() || '0.0.0.0';
  if (host !== '0.0.0.0' && host !== '127.0.0.1') {
    throw new Error('HOST debe ser 0.0.0.0 o 127.0.0.1');
  }

  const jwtSecret = requireValue('JWT_SECRET');
  if (jwtSecret.length < 64) {
    throw new Error('JWT_SECRET debe contener al menos 64 caracteres');
  }

  return {
    host,
    port: parsePort('PORT', 3000),
    databaseUrl: {
      host: process.env.DB_HOST?.trim() || '127.0.0.1',
      port: parsePort('DB_PORT', 5432),
      database: process.env.DB_NAME?.trim() || 'falcon_db',
      user: process.env.DB_USER?.trim() || 'postgres',
      password: requireValue('DB_PASSWORD'),
    },
    jwtSecret,
    corsOrigins: (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
};
