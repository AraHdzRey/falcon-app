# Compatibilidad de API heredada

La Fase 1.1 conserva un solo backend en el puerto `3000` y no publica aliases
`/api/*`. Esta tabla sirve como guía de migración; no crea rutas duplicadas.

| API antigua | API nueva | Estado |
| --- | --- | --- |
| `POST /api/auth/login` | `POST /auth/login` | Adaptada al modelo `colaboradores/usuarios` |
| `GET /api/auth/sesion` | `GET /auth/me` | Reemplazada por identidad Bearer canónica |
| `POST /api/auth/logout` | `POST /auth/logout` | Reemplazada con revocación `token_version` |
| `GET /api/empleados` | `GET /directory` | Adaptada; sólo devuelve campos públicos internos |
| `GET /api/admin/empleados` | `GET /admin/collaborators` | Adaptada y paginada |
| `POST /api/admin/empleados` | `POST /admin/collaborators` | Adaptada sin tablas paralelas |
| `PUT /api/admin/empleados/:id` | `PUT /admin/collaborators/:id` | Adaptada al modelo canónico |
| `PATCH /api/admin/empleados/:id/desactivar` | `PATCH /admin/collaborators/:id/deactivate` | Adaptada con protección administrativa |
| `PATCH /api/admin/empleados/:id/reactivar` | `PATCH /admin/collaborators/:id/reactivate` | Adaptada |
| Noticias demo móviles | `GET /news` | Reemplazadas por datos persistentes de `falcon_db` |
| Servicio `:3101/health` | Sin equivalente independiente | Retirado; noticias es módulo del backend único |
| Cookie `falcon_sesion` | Bearer JWT | No implementada en Fase 1.1 |

## Decisiones de compatibilidad

- No se restauran las tablas `empleados` ni `cuentas_acceso`.
- No se duplican rutas bajo `/api`.
- No se crea gateway ni segundo backend.
- Una futura cookie web sólo podrá transportar la identidad canónica existente.
- Cualquier alias futuro deberá contar con una necesidad vigente, prueba de
  regresión, fecha de retiro y documentación OpenAPI.
