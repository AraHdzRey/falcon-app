# Matriz consolidada de endpoints FALCÓN

Fecha de corte: 16 de noviembre de 2026.

Las rutas se extrajeron de servidores y routers versionados. No se infieren
endpoints a partir de nombres de pantallas.

## `master`

Prefijo de API: `/api`. Proceso: `apps/api`, Express, TCP 3000.

| Branch | Servicio | Método | Endpoint | Auth | DB/Entidad |
| --- | --- | --- | --- | --- | --- |
| `master` | apps/api | GET | `/api/health` | No | Ninguna |
| `master` | apps/api | GET | `/api/health/db` | No | PostgreSQL/current database |
| `master` | apps/api | POST | `/api/auth/login` | No; rate limit | `empleados`, `cuentas_acceso` |
| `master` | apps/api | GET | `/api/empleados/` | Bearer; empleado/admin | `empleados` |
| `master` | apps/api | GET | `/api/admin/verificar` | Bearer; admin | Cuenta/rol activo |
| `master` | apps/api | GET | `/api/admin/panel` | Bearer; admin | Ninguna; respuesta estática |
| `master` | apps/api | GET | `/api/admin/empleados` | Bearer; admin | `empleados` |
| `master` | apps/api | POST | `/api/admin/empleados` | Bearer; admin | `empleados` |
| `master` | apps/api | PUT | `/api/admin/empleados/:id` | Bearer; admin | `empleados` |
| `master` | apps/api | PATCH | `/api/admin/empleados/:id/desactivar` | Bearer; admin | `empleados`, `cuentas_acceso` |
| `master` | apps/api | PATCH | `/api/admin/empleados/:id/reactivar` | Bearer; admin | `empleados` |

No hay logout, consulta de sesión, noticias, Swagger ni OpenAPI.

## Ramas del SHA compartido `940bd70`

Aplica por igual a:

- `feature/falcon-noticias-service`;
- `feature/falcon-gateway-infra`;
- `feature/sesion-web-falcon`.

### API principal `apps/api`

| Branch | Servicio | Método | Endpoint | Auth | DB/Entidad |
| --- | --- | --- | --- | --- | --- |
| SHA `940bd70` | apps/api | GET | `/api/health` | No | Ninguna |
| SHA `940bd70` | apps/api | GET | `/api/health/db` | No | PostgreSQL/current database |
| SHA `940bd70` | apps/api | POST | `/api/auth/login` | No; rate limit | `empleados`, `cuentas_acceso` |
| SHA `940bd70` | apps/api | GET | `/api/auth/sesion` | Cookie HttpOnly | `empleados`, `cuentas_acceso` |
| SHA `940bd70` | apps/api | POST | `/api/auth/logout` | No; limpia cookie | Ninguna; no revoca JWT |
| SHA `940bd70` | apps/api | GET | `/api/empleados/` | Bearer; empleado/admin | `empleados` |
| SHA `940bd70` | apps/api | GET | `/api/admin/verificar` | Bearer; admin | Cuenta/rol activo |
| SHA `940bd70` | apps/api | GET | `/api/admin/panel` | Bearer; admin | Ninguna; respuesta estática |
| SHA `940bd70` | apps/api | GET | `/api/admin/empleados` | Bearer; admin | `empleados` |
| SHA `940bd70` | apps/api | POST | `/api/admin/empleados` | Bearer; admin | `empleados` |
| SHA `940bd70` | apps/api | PUT | `/api/admin/empleados/:id` | Bearer; admin | `empleados` |
| SHA `940bd70` | apps/api | PATCH | `/api/admin/empleados/:id/desactivar` | Bearer; admin | `empleados`, `cuentas_acceso` |
| SHA `940bd70` | apps/api | PATCH | `/api/admin/empleados/:id/reactivar` | Bearer; admin | `empleados` |

### Microservicio `services/noticias`

| Branch | Servicio | Método | Endpoint | Auth | DB/Entidad |
| --- | --- | --- | --- | --- | --- |
| SHA `940bd70` | services/noticias | GET | `/health` | No | Ninguna |

No existen endpoints de listar, crear, editar, eliminar o publicar noticias.
El servicio no se registra en `apps/api` y el móvil no lo consume.

## `integration/local-api-login` — Fase 0.9

Proceso: `backend`, Express, TCP 3000. No usa prefijo `/api`.

| Branch | Servicio | Método | Endpoint | Auth | DB/Entidad |
| --- | --- | --- | --- | --- | --- |
| Fase 0.9 | backend | GET | `/health` | No | Ninguna |
| Fase 0.9 | backend | GET | `/health/db` | No | PostgreSQL/current database |
| Fase 0.9 | backend | GET | `/openapi.json` | No | Ninguna |
| Fase 0.9 | backend | GET/use | `/docs` | No | Ninguna; Swagger UI |
| Fase 0.9 | backend | POST | `/auth/login` | No; rate limit | `usuarios`, `colaboradores`, roles |
| Fase 0.9 | backend | GET | `/auth/me` | Bearer | `usuarios`, `colaboradores`, roles |
| Fase 0.9 | backend | POST | `/auth/logout` | Bearer | `usuarios.token_version` |
| Fase 0.9 | backend | GET | `/admin/ping` | Bearer; administrador | Cuenta/rol activo |
| Fase 0.9 | backend | GET | `/sync/changes` | Bearer | perfil, directorio, `noticias`, `sync_state` |
| Fase 0.9 | backend | POST | `/sync/operations` | Bearer; editor/admin | `noticias`, `sync_operations`, `sync_state` |

OpenAPI 3.1 documenta ocho rutas de negocio/salud; `/docs` y
`/openapi.json` son puntos de documentación y no aparecen como paths del propio
contrato.

## `feature/database-dev-seed` — Fase 1.0

Hereda sin cambios funcionales todos los endpoints de Fase 0.9.

| Branch | Servicio | Método | Endpoint | Auth | DB/Entidad |
| --- | --- | --- | --- | --- | --- |
| Fase 1.0 | backend | GET | `/health` | No | Ninguna |
| Fase 1.0 | backend | GET | `/health/db` | No | PostgreSQL/current database |
| Fase 1.0 | backend | GET | `/openapi.json` | No | Ninguna |
| Fase 1.0 | backend | GET/use | `/docs` | No | Ninguna; Swagger UI |
| Fase 1.0 | backend | POST | `/auth/login` | No; rate limit | `usuarios`, `colaboradores`, roles |
| Fase 1.0 | backend | GET | `/auth/me` | Bearer | `usuarios`, `colaboradores`, roles |
| Fase 1.0 | backend | POST | `/auth/logout` | Bearer | `usuarios.token_version` |
| Fase 1.0 | backend | GET | `/admin/ping` | Bearer; administrador | Cuenta/rol activo |
| Fase 1.0 | backend | GET | `/sync/changes` | Bearer | perfil, directorio, `noticias`, `sync_state` |
| Fase 1.0 | backend | POST | `/sync/operations` | Bearer; editor/admin | `noticias`, `sync_operations`, `sync_state` |

La migración 003 agrega quejas y auditoría, pero esta rama no expone todavía
endpoints para `quejas`, `categorias_queja`, `estados_queja` o
`auditoria_eventos`.

## Duplicaciones e incompatibilidades

| Tema | Implementación antigua | Fase 0.9/1.0 | Compatibilidad |
| --- | --- | --- | --- |
| Health | `/api/health` | `/health` | misma finalidad, contrato/ruta diferente |
| Health DB | `/api/health/db` | `/health/db` | misma finalidad, contrato/ruta diferente |
| Login | `/api/auth/login` | `/auth/login` | payload e identidad diferentes |
| Logout | elimina cookie | revoca por `token_version` | semántica incompatible |
| Sesión | `/api/auth/sesion` por cookie | `/auth/me` por Bearer | transportes distintos |
| Admin verify | `/api/admin/verificar` | `/admin/ping` | misma intención parcial |
| Empleados | CRUD completo | sólo directorio de sync | funcionalidad antigua aún no portada |
| Noticias | sólo `/health` aislado; UI demo | sync real mediante `/sync/*` | Fase 0.9 es la única implementación persistente |

## Contrato recomendado

Mantener como canónico el contrato sin prefijo de Fase 0.9/1.0 y documentarlo en
el OpenAPI existente. Si se requiere compatibilidad temporal con `/api/*`, debe
implementarse como adaptador explícito y probado, no manteniendo dos backends.
