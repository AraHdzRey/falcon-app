export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'FALCÓN Local API',
    version: '0.8.0',
    description:
      'Contrato del piloto académico en red local. PostgreSQL permanece accesible sólo desde la computadora host.',
  },
  servers: [{ url: 'http://127.0.0.1:3000', description: 'Host local' }],
  tags: [
    { name: 'Health' },
    { name: 'Authentication' },
    { name: 'Authorization' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['employeeId', 'password'],
        additionalProperties: false,
        properties: {
          employeeId: { type: 'string', maxLength: 50, example: 'TI001' },
          password: { type: 'string', format: 'password', maxLength: 128 },
        },
      },
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string', const: 'error' },
          message: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Comprueba que la API responde',
        responses: { '200': { description: 'API disponible' } },
      },
    },
    '/health/db': {
      get: {
        tags: ['Health'],
        summary: 'Comprueba la conexión local a PostgreSQL',
        responses: {
          '200': { description: 'Base de datos disponible' },
          '503': { description: 'Base de datos no disponible' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Inicia sesión con ID de empleado y contraseña',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Token y usuario autenticado' },
          '400': { description: 'Solicitud inválida' },
          '401': { description: 'Credenciales inválidas' },
          '429': { description: 'Límite de intentos excedido' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Devuelve la sesión autenticada',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Usuario autenticado' },
          '401': { description: 'Token inválido, expirado o revocado' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoca las sesiones actuales del usuario',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Sesión revocada' },
          '401': { description: 'Autenticación requerida' },
        },
      },
    },
    '/admin/ping': {
      get: {
        tags: ['Authorization'],
        summary: 'Valida el rol administrador',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Administrador autorizado' },
          '401': { description: 'Autenticación requerida' },
          '403': { description: 'Rol insuficiente' },
        },
      },
    },
  },
} as const;
