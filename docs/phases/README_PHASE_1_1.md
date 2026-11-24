# Fase 1.1 — API modular unificada

## Resultado

La aplicación utiliza una sola API Express/TypeScript en `:3000`, PostgreSQL
`falcon_db` en `:5432` y el mismo contrato de autenticación y sincronización de
las fases 0.9/1.0. El frontend móvil conserva SQLite y SecureStore.

No se añadió gateway, microservicio, Docker, nube ni base de datos paralela. El
esquema `public` de las migraciones `001`, `002` y `003` cubrió los requisitos;
por tanto no fue necesaria una migración `004`.

## Módulos añadidos

- directorio y perfil funcional;
- administración de colaboradores;
- noticias persistentes y versionadas;
- creación y seguimiento de quejas;
- gestión administrativa de quejas;
- consulta paginada de auditoría.

## Endpoints

### Contrato preservado

- `GET /health`
- `GET /health/db`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /admin/ping`
- `GET /sync/changes`
- `POST /sync/operations`
- `GET /openapi.json`
- `GET /docs`

### Fase 1.1

- `GET /directory`
- `GET /profile/me`
- `GET|POST /admin/collaborators`
- `PUT /admin/collaborators/:id`
- `PATCH /admin/collaborators/:id/deactivate`
- `PATCH /admin/collaborators/:id/reactivate`
- `GET|POST /news`
- `GET|PATCH /news/:id`
- `GET /complaint-categories`
- `POST /complaints`
- `GET /complaints/track/:folio`
- `GET /admin/complaints`
- `GET /admin/complaints/:id`
- `PATCH /admin/complaints/:id/status`
- `GET /admin/audit`

## Base de datos y permisos

Fuente central: `falcon_db`, esquema `public`. La identidad canónica usa
`colaboradores`, `usuarios`, `roles` y `usuario_roles`. Noticias REST y
sincronización comparten `noticias` y `sync_state`. Quejas usa las tablas de la
migración 003. Los cambios relevantes se registran en `auditoria_eventos`.

- directorio, perfil y lectura de noticias: cualquier cuenta activa;
- escritura de noticias: `editor_noticias` o `administrador`;
- mutaciones de colaboradores: `administrador`;
- consulta administrativa de colaboradores: también `capital_humano` y `director`;
- administración de quejas: `responsable_quejas`, `administrador` o `director`;
- auditoría: `administrador` o `auditor`.

Las quejas anónimas no almacenan usuario, colaborador, employeeId, correo ni
actor identificable en auditoría. El folio se genera con aleatoriedad
criptográfica y no deriva de datos personales.

## Swagger y datos dummy

1. Configurar un `.env` local desde `.env.example` sin publicarlo.
2. Ejecutar migraciones y seed con una `DEMO_PASSWORD` local.
3. Iniciar el backend con `npm run dev`.
4. Abrir `http://127.0.0.1:3000/docs`.
5. Autenticarse con datos dummy y usar `Authorize` con el Bearer recibido.

El documento JSON permanece en `http://127.0.0.1:3000/openapi.json`. Los seeds
siguen siendo sintéticos y deterministas; no existe una contraseña fija en el
repositorio.

## Validación y pendientes

Los resultados de cierre se registran en el reporte final de Fase 1.1. La tabla
de migración se encuentra en
[`LEGACY_API_COMPATIBILITY.md`](../api/LEGACY_API_COMPATIBILITY.md); no habilita
aliases `/api/*`.

Pendientes:

- migración de pantallas antiguas del frontend;
- prueba física A/B/C;
- evaluar cookie HttpOnly sólo si aparece un cliente web real;
- evaluar gateway sólo cuando existan servicios desplegables independientes.
