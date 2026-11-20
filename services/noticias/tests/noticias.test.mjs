import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

// La clave debe existir antes de importar la aplicación.
const JWT_SECRET =
  'clave-de-pruebas-noticias-'.padEnd(80, 'x');

process.env.JWT_SECRET = JWT_SECRET;
delete process.env.NOTICIAS_CORS_ORIGIN;

// Se prueba el código compilado (npm test ejecuta antes npm run build).
const modulo = await import('../dist/app.js');
const app = modulo.app ?? modulo.default?.app ?? modulo.default;

let servidor;
let base;

before(async () => {
  servidor = app.listen(0, '127.0.0.1');
  await new Promise((resolver) =>
    servidor.once('listening', resolver)
  );
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor.closeAllConnections?.();
  servidor.close();
});

const firmar = (payload = { empleadoId: 7 }, opciones = {}) =>
  jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m',
    ...opciones,
  });

const pedir = async (ruta, headers = {}) => {
  const respuesta = await fetch(`${base}${ruta}`, { headers });
  const cuerpo = await respuesta.json();
  return { estado: respuesta.status, cuerpo };
};

const conBearer = (token = firmar()) => ({
  Authorization: `Bearer ${token}`,
});

test('GET /health responde 200 sin autenticación', async () => {
  const { estado, cuerpo } = await pedir('/health');

  assert.equal(estado, 200);
  assert.deepEqual(cuerpo, {
    status: 'ok',
    service: 'noticias',
    message: 'Microservicio de Noticias activo',
  });
});

test('GET /api/noticias sin token responde 401', async () => {
  const { estado, cuerpo } = await pedir('/api/noticias');

  assert.equal(estado, 401);
  assert.deepEqual(cuerpo, {
    status: 'error',
    message: 'Token de autenticación requerido',
  });
});

test('GET /api/noticias con token inválido o expirado responde 401', async () => {
  const casos = [
    ['basura', conBearer('no-es-un-jwt')],
    ['clave incorrecta', conBearer(
      jwt.sign({ empleadoId: 7 }, 'otra-clave'.padEnd(80, 'y'), {
        algorithm: 'HS256',
        expiresIn: '15m',
      })
    )],
    ['expirado', conBearer(firmar({ empleadoId: 7 }, { expiresIn: -60 }))],
    ['algoritmo HS512', conBearer(firmar({ empleadoId: 7 }, { algorithm: 'HS512' }))],
    ['empleadoId texto', conBearer(firmar({ empleadoId: '7' }))],
    ['empleadoId cero', conBearer(firmar({ empleadoId: 0 }))],
    ['empleadoId decimal', conBearer(firmar({ empleadoId: 1.5 }))],
    ['sin empleadoId', conBearer(firmar({ otro: 1 }))],
  ];

  for (const [nombre, headers] of casos) {
    const { estado, cuerpo } = await pedir('/api/noticias', headers);

    assert.equal(estado, 401, nombre);
    assert.deepEqual(
      cuerpo,
      { status: 'error', message: 'Token inválido o expirado' },
      nombre
    );
  }
});

test('Authorization con formato incorrecto responde 401', async () => {
  for (const valor of ['Basic abc', 'Bearer', 'bearer abc', 'Bearer a b']) {
    const { estado, cuerpo } = await pedir('/api/noticias', {
      Authorization: valor,
    });

    assert.equal(estado, 401, valor);
    assert.deepEqual(cuerpo, {
      status: 'error',
      message: 'Formato de autorización inválido',
    });
  }
});

test('GET /api/noticias con token Bearer válido responde 200 y las 4 noticias', async () => {
  const { estado, cuerpo } = await pedir('/api/noticias', conBearer());

  assert.equal(estado, 200);
  assert.equal(cuerpo.status, 'ok');
  assert.equal(cuerpo.total, 4);
  assert.deepEqual(cuerpo.filtros, { categoria: 'Todas', q: null });
  assert.deepEqual(
    cuerpo.noticias.map((n) => n.id),
    [1, 2, 3, 4]
  );
  assert.deepEqual(Object.keys(cuerpo.noticias[0]), [
    'id',
    'titulo',
    'fecha',
    'categoria',
    'imagen',
    'contenido',
  ]);
});

test('GET /api/noticias con cookie falcon_sesion válida responde 200', async () => {
  const { estado, cuerpo } = await pedir('/api/noticias', {
    Cookie: `otra=1; falcon_sesion=${firmar()}; tema=oscuro`,
  });

  assert.equal(estado, 200);
  assert.equal(cuerpo.total, 4);
});

test('Cookie inválida responde 401 y el header Authorization no usa la cookie como respaldo', async () => {
  const invalida = await pedir('/api/noticias', {
    Cookie: 'falcon_sesion=token-falso',
  });

  assert.equal(invalida.estado, 401);
  assert.equal(invalida.cuerpo.message, 'Token inválido o expirado');

  const conflicto = await pedir('/api/noticias', {
    Authorization: 'Bearer token-falso',
    Cookie: `falcon_sesion=${firmar()}`,
  });

  assert.equal(conflicto.estado, 401);
});

test('GET /api/noticias?categoria filtra y valida', async () => {
  const ti = await pedir('/api/noticias?categoria=TI', conBearer());

  assert.equal(ti.estado, 200);
  assert.equal(ti.cuerpo.total, 2);
  assert.deepEqual(
    ti.cuerpo.noticias.map((n) => n.id),
    [1, 2]
  );
  assert.ok(ti.cuerpo.noticias.every((n) => n.categoria === 'TI'));
  assert.equal(ti.cuerpo.filtros.categoria, 'TI');

  const admin = await pedir(
    '/api/noticias?categoria=Administrativas',
    conBearer()
  );
  assert.equal(admin.cuerpo.total, 2);

  const todas = await pedir('/api/noticias?categoria=Todas', conBearer());
  assert.equal(todas.cuerpo.total, 4);

  const invalida = await pedir(
    '/api/noticias?categoria=Invalida',
    conBearer()
  );
  assert.equal(invalida.estado, 400);
  assert.equal(invalida.cuerpo.status, 'error');

  const repetida = await pedir(
    '/api/noticias?categoria=TI&categoria=TI',
    conBearer()
  );
  assert.equal(repetida.estado, 400);
});

test('GET /api/noticias?q filtra por texto', async () => {
  const exacta = await pedir('/api/noticias?q=Mantenimiento', conBearer());

  assert.equal(exacta.estado, 200);
  assert.equal(exacta.cuerpo.total, 1);
  assert.equal(exacta.cuerpo.noticias[0].id, 1);
  assert.equal(exacta.cuerpo.filtros.q, 'Mantenimiento');

  const minusculas = await pedir('/api/noticias?q=mantenimiento', conBearer());
  assert.equal(minusculas.cuerpo.total, 1);

  // Coincidencia solo en "contenido".
  const contenido = await pedir('/api/noticias?q=REUNIÓN', conBearer());
  assert.deepEqual(
    contenido.cuerpo.noticias.map((n) => n.id),
    [3]
  );

  const combinado = await pedir(
    '/api/noticias?categoria=Administrativas&q=mantenimiento',
    conBearer()
  );
  assert.equal(combinado.cuerpo.total, 0);

  const sinResultados = await pedir('/api/noticias?q=zzzz', conBearer());
  assert.equal(sinResultados.estado, 200);
  assert.deepEqual(sinResultados.cuerpo.noticias, []);

  const vacia = await pedir('/api/noticias?q=', conBearer());
  assert.equal(vacia.cuerpo.total, 4);
  assert.equal(vacia.cuerpo.filtros.q, null);
});

test('GET /api/noticias?q con más de 100 caracteres o inválido responde 400', async () => {
  const limite = await pedir(`/api/noticias?q=${'a'.repeat(100)}`, conBearer());
  assert.equal(limite.estado, 200);

  const larga = await pedir(`/api/noticias?q=${'a'.repeat(101)}`, conBearer());
  assert.equal(larga.estado, 400);

  const arreglo = await pedir('/api/noticias?q=a&q=b', conBearer());
  assert.equal(arreglo.estado, 400);

  const control = await pedir('/api/noticias?q=a%00b', conBearer());
  assert.equal(control.estado, 400);
});

test('GET /api/noticias/:id devuelve detalle, 400 o 404', async () => {
  const uno = await pedir('/api/noticias/1', conBearer());

  assert.equal(uno.estado, 200);
  assert.equal(uno.cuerpo.status, 'ok');
  assert.equal(uno.cuerpo.noticia.id, 1);
  assert.equal(uno.cuerpo.noticia.titulo, 'Mantenimiento de sistemas');
  assert.equal(uno.cuerpo.noticia.fecha, '16 oct. 2026');
  assert.equal(uno.cuerpo.noticia.categoria, 'TI');

  for (const id of ['abc', '0', '01', '-1', '1.5', '99999999999999999999']) {
    const { estado } = await pedir(`/api/noticias/${id}`, conBearer());
    assert.equal(estado, 400, id);
  }

  const inexistente = await pedir('/api/noticias/999', conBearer());
  assert.equal(inexistente.estado, 404);
  assert.deepEqual(inexistente.cuerpo, {
    status: 'error',
    message: 'Noticia no encontrada',
  });
});

test('GET /api/noticias/:id sin token responde 401', async () => {
  const { estado } = await pedir('/api/noticias/1');
  assert.equal(estado, 401);
});

test('Rutas inexistentes responden 404 con formato JSON', async () => {
  const { estado, cuerpo } = await pedir('/api/otra-cosa');

  assert.equal(estado, 404);
  assert.deepEqual(cuerpo, {
    status: 'error',
    message: 'Ruta no encontrada',
  });
});

test('Solo se exponen métodos GET (no hay POST/PUT/DELETE)', async () => {
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const respuesta = await fetch(`${base}/api/noticias`, {
      method,
      headers: conBearer(),
    });

    assert.equal(respuesta.status, 404, method);
  }
});

test('CORS permite http://localhost:8081 con credenciales', async () => {
  const respuesta = await fetch(`${base}/health`, {
    headers: { Origin: 'http://localhost:8081' },
  });

  assert.equal(
    respuesta.headers.get('access-control-allow-origin'),
    'http://localhost:8081'
  );
  assert.equal(
    respuesta.headers.get('access-control-allow-credentials'),
    'true'
  );

  const ajeno = await fetch(`${base}/health`, {
    headers: { Origin: 'http://malicioso.example' },
  });
  assert.equal(ajeno.headers.get('access-control-allow-origin'), null);
});
