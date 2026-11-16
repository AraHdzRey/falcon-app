const bearer = [{ bearerAuth: [] }];

const errorResponse = {
  description: 'Error de solicitud',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
};

const pageParameters = [
  { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
  { in: 'query', name: 'pageSize', schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 } },
];

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'FALCÓN Unified Local API',
    version: '1.1.0',
    description:
      'API modular única para autenticación, directorio, noticias, quejas, auditoría y sincronización offline-first.',
  },
  servers: [{ url: 'http://127.0.0.1:3000', description: 'Host local' }],
  tags: [
    { name: 'Health' },
    { name: 'Authentication' },
    { name: 'Directory' },
    { name: 'Administration' },
    { name: 'News' },
    { name: 'Complaints' },
    { name: 'Audit' },
    { name: 'Synchronization' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['status', 'message'],
        properties: {
          status: { type: 'string', const: 'error' },
          message: { type: 'string' },
        },
      },
      Login: {
        type: 'object',
        required: ['employeeId', 'password'],
        properties: {
          employeeId: { type: 'string', example: 'TI001' },
          password: { type: 'string', format: 'password', writeOnly: true },
        },
      },
      CollaboratorCreate: {
        type: 'object',
        required: ['employeeNumber', 'name', 'role', 'temporaryPassword'],
        properties: {
          employeeNumber: { type: 'string', example: 'TI021' },
          name: { type: 'string', example: 'Colaborador sintético' },
          email: { type: ['string', 'null'], example: 'ti021@example.test' },
          position: { type: ['string', 'null'], example: 'Analista' },
          area: { type: ['string', 'null'], example: 'TI' },
          role: { type: 'string', example: 'colaborador' },
          temporaryPassword: { type: 'string', format: 'password', writeOnly: true },
        },
      },
      CollaboratorUpdate: {
        type: 'object',
        required: ['name', 'role'],
        properties: {
          name: { type: 'string', example: 'Colaborador sintético' },
          email: { type: ['string', 'null'], example: 'ti021@example.test' },
          position: { type: ['string', 'null'], example: 'Analista' },
          area: { type: ['string', 'null'], example: 'TI' },
          role: { type: 'string', example: 'colaborador' },
        },
      },
      NewsInput: {
        type: 'object',
        required: ['title', 'body'],
        properties: {
          title: { type: 'string', example: 'Aviso sintético' },
          body: { type: 'string', example: 'Contenido ficticio para pruebas locales.' },
        },
      },
      ComplaintInput: {
        type: 'object',
        required: ['categoryCode', 'anonymous', 'subject', 'description'],
        properties: {
          categoryCode: { type: 'string', example: 'PROCESOS' },
          anonymous: { type: 'boolean', example: true },
          subject: { type: 'string', example: 'Caso sintético' },
          description: { type: 'string', example: 'Descripción ficticia sin información personal.' },
        },
      },
    },
  },
  paths: {
    '/health': { get: { tags: ['Health'], summary: 'Estado de la API', responses: { '200': { description: 'API disponible' } } } },
    '/health/db': { get: { tags: ['Health'], summary: 'Estado de PostgreSQL', responses: { '200': { description: 'falcon_db disponible' }, '503': errorResponse } } },
    '/auth/login': { post: { tags: ['Authentication'], summary: 'Inicia sesión con ID de empleado', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Login' } } } }, responses: { '200': { description: 'JWT y perfil público' }, '401': errorResponse, '429': errorResponse } } },
    '/auth/me': { get: { tags: ['Authentication'], summary: 'Identidad y sesión', security: bearer, responses: { '200': { description: 'Identidad autenticada' }, '401': errorResponse } } },
    '/auth/logout': { post: { tags: ['Authentication'], summary: 'Revoca tokens mediante token_version', security: bearer, responses: { '200': { description: 'Sesión revocada' }, '401': errorResponse } } },
    '/admin/ping': { get: { tags: ['Administration'], summary: 'Comprueba autorización administrativa', security: bearer, responses: { '200': { description: 'Administrador autorizado' }, '403': errorResponse } } },
    '/directory': { get: { tags: ['Directory'], summary: 'Lista colaboradores activos', security: bearer, parameters: [{ in: 'query', name: 'search', schema: { type: 'string' } }, { in: 'query', name: 'area', schema: { type: 'string' } }], responses: { '200': { description: 'Directorio público interno' }, '401': errorResponse } } },
    '/profile/me': { get: { tags: ['Directory'], summary: 'Perfil funcional del colaborador', security: bearer, responses: { '200': { description: 'Perfil funcional' }, '401': errorResponse } } },
    '/admin/collaborators': {
      get: { tags: ['Administration'], summary: 'Lista colaboradores con paginación', security: bearer, parameters: pageParameters, responses: { '200': { description: 'Lista administrativa' }, '403': errorResponse } },
      post: { tags: ['Administration'], summary: 'Crea colaborador y cuenta canónica', security: bearer, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CollaboratorCreate' } } } }, responses: { '201': { description: 'Colaborador creado' }, '403': errorResponse, '409': errorResponse } },
    },
    '/admin/collaborators/{id}': { put: { tags: ['Administration'], summary: 'Actualiza colaborador y rol principal', security: bearer, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CollaboratorUpdate' } } } }, responses: { '200': { description: 'Colaborador actualizado' }, '403': errorResponse, '404': errorResponse } } },
    '/admin/collaborators/{id}/deactivate': { patch: { tags: ['Administration'], summary: 'Desactiva colaborador y revoca tokens', security: bearer, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Colaborador desactivado' }, '409': errorResponse } } },
    '/admin/collaborators/{id}/reactivate': { patch: { tags: ['Administration'], summary: 'Reactiva colaborador', security: bearer, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Colaborador reactivado' }, '404': errorResponse } } },
    '/news': {
      get: { tags: ['News'], summary: 'Lista noticias activas', security: bearer, responses: { '200': { description: 'Noticias' }, '401': errorResponse } },
      post: { tags: ['News'], summary: 'Publica noticia y avanza versión de sincronización', security: bearer, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/NewsInput' } } } }, responses: { '201': { description: 'Noticia publicada' }, '403': errorResponse } },
    },
    '/news/{id}': {
      get: { tags: ['News'], summary: 'Consulta una noticia', security: bearer, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Noticia' }, '404': errorResponse } },
      patch: { tags: ['News'], summary: 'Actualiza noticia y avanza versión de sincronización', security: bearer, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/NewsInput' } } } }, responses: { '200': { description: 'Noticia actualizada' }, '403': errorResponse, '404': errorResponse } },
    },
    '/complaint-categories': { get: { tags: ['Complaints'], summary: 'Lista categorías activas', responses: { '200': { description: 'Catálogo público' } } } },
    '/complaints': { post: { tags: ['Complaints'], summary: 'Crea queja identificada o anónima', description: 'La identificada requiere Bearer. La anónima nunca enlaza usuario, colaborador ni actor de auditoría.', security: [{}, { bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ComplaintInput' } } } }, responses: { '201': { description: 'Devuelve únicamente el folio público' }, '400': errorResponse, '401': errorResponse } } },
    '/complaints/track/{folio}': { get: { tags: ['Complaints'], summary: 'Seguimiento público mínimo por folio', parameters: [{ in: 'path', name: 'folio', required: true, schema: { type: 'string', example: 'FLC-ABCD-1234' } }], responses: { '200': { description: 'Estado y fechas públicas' }, '404': errorResponse } } },
    '/admin/complaints': { get: { tags: ['Complaints'], summary: 'Lista administrativa de quejas', security: bearer, parameters: pageParameters, responses: { '200': { description: 'Quejas paginadas' }, '403': errorResponse } } },
    '/admin/complaints/{id}': { get: { tags: ['Complaints'], summary: 'Detalle administrativo de queja', security: bearer, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Detalle de queja' }, '404': errorResponse } } },
    '/admin/complaints/{id}/status': { patch: { tags: ['Complaints'], summary: 'Cambia estado y registra auditoría', security: bearer, parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['statusCode'], properties: { statusCode: { type: 'string', example: 'UNDER_REVIEW' } } } } } }, responses: { '200': { description: 'Estado actualizado' }, '403': errorResponse, '409': errorResponse } } },
    '/admin/audit': { get: { tags: ['Audit'], summary: 'Bitácora paginada para administrador o auditor', security: bearer, parameters: pageParameters, responses: { '200': { description: 'Eventos sin secretos' }, '403': errorResponse } } },
    '/sync/changes': { get: { tags: ['Synchronization'], summary: 'Obtiene cambios desde versión central', security: bearer, parameters: [{ in: 'query', name: 'sinceVersion', schema: { type: 'integer', minimum: 0, default: 0 } }], responses: { '200': { description: 'Perfil, directorio y noticias' }, '401': errorResponse } } },
    '/sync/operations': { post: { tags: ['Synchronization'], summary: 'Aplica outbox idempotente de noticias', security: bearer, responses: { '200': { description: 'Resultados applied, duplicate o conflict' }, '403': errorResponse } } },
  },
} as const;
