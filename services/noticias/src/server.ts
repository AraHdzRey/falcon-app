import express from 'express';

const app = express();

app.disable('x-powered-by');

const puerto = Number(process.env.NOTICIAS_PORT ?? '3101');

if (
  !Number.isInteger(puerto) ||
  puerto < 1 ||
  puerto > 65535
) {
  throw new Error('NOTICIAS_PORT debe ser un puerto valido');
}

const host =
  process.env.NOTICIAS_HOST === '0.0.0.0'
    ? '0.0.0.0'
    : '127.0.0.1';

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'noticias',
    message: 'Microservicio de Noticias activo',
  });
});

app.listen(puerto, host, () => {
  console.log(
    `Microservicio Noticias en http://${host}:${puerto}`
  );
});