// Debe ser el primer import: carga .env antes que el resto de módulos.
import 'dotenv/config';

import { app } from './app';
import { obtenerJwtSecret } from './services/token.service';

const HOSTS_PERMITIDOS = ['127.0.0.1', '0.0.0.0'];

const iniciar = (): void => {
  const puerto = Number(process.env.NOTICIAS_PORT ?? '3101');

  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error('NOTICIAS_PORT debe ser un puerto valido');
  }

  const host = process.env.NOTICIAS_HOST ?? '127.0.0.1';

  if (!HOSTS_PERMITIDOS.includes(host)) {
    throw new Error(
      `NOTICIAS_HOST debe ser uno de: ${HOSTS_PERMITIDOS.join(', ')}`
    );
  }

  // Falla de inmediato si JWT_SECRET falta o es demasiado corta.
  obtenerJwtSecret();

  app.listen(puerto, host, () => {
    console.log(`Microservicio Noticias en http://${host}:${puerto}`);
  });
};

try {
  iniciar();
} catch (error) {
  console.error(
    'ERROR de configuración:',
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
