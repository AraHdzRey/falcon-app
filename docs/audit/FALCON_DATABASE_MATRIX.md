# Matriz de bases de datos FALCÓN

Fecha de corte: 16 de noviembre de 2026.

No se consultó ni modificó ninguna base en esta auditoría. Las conclusiones
proceden exclusivamente de configuración, migraciones y código versionado.

## Matriz general

| Branch | Motor | BD | Schema | Entidades versionadas | Connection module |
| --- | --- | --- | --- | --- | --- |
| `master` | PostgreSQL/`pg` | `DB_NAME`; guard de test menciona `falcon_seguridad_test` | `public` en SQL | ninguna; no hay migraciones/modelos | `apps/api/src/config/database.ts` |
| SHA `940bd70` (tres ramas) | PostgreSQL/`pg` | `DB_NAME`; script admin exige `falcon_dev`; guard de test usa `falcon_seguridad_test` | `public` en SQL | ninguna; no hay migraciones/modelos | `apps/api/src/config/database.ts` |
| Fase 0.9 | PostgreSQL/`pg` + SQLite móvil | `falcon_db`; SQLite `falcon_local.db` | PostgreSQL `public` | 7 tablas de dominio + `schema_migrations`; 5 tablas locales | `backend/src/config/database.ts`; `frontend/src/storage/database.ts` |
| Fase 1.0 | PostgreSQL/`pg` + SQLite móvil | `falcon_db`; test `falcon_test`; SQLite `falcon_local.db` | PostgreSQL `public` | 11 tablas de dominio + `schema_migrations`; 5 tablas locales | mismos módulos de Fase 0.9 |

No existe ORM en ninguna rama. No se encontraron Prisma, Sequelize, TypeORM,
Drizzle, Mongoose ni configuración Docker.

## Entidades PostgreSQL confirmadas por migración

| Branch | Migración | Entidad | Tabla | Clave principal/relación relevante |
| --- | --- | --- | --- | --- |
| Fase 0.9/1.0 | 001 | rol | `roles` | `id`; `codigo` único |
| Fase 0.9/1.0 | 001 | colaborador | `colaboradores` | `id`; `numero_empleado` único |
| Fase 0.9/1.0 | 001 | usuario/cuenta | `usuarios` | `id`; `colaborador_id` único; `token_version` |
| Fase 0.9/1.0 | 001 | asignación de rol | `usuario_roles` | PK compuesta usuario/rol; un rol principal |
| Fase 0.9/1.0 | 002 | versión global | `sync_state` | fila singleton `id=1` |
| Fase 0.9/1.0 | 002 | noticia | `noticias` | UUID; autor usuario; versión positiva |
| Fase 0.9/1.0 | 002 | operación idempotente | `sync_operations` | UUID de operación; dispositivo/usuario |
| Fase 1.0 | 003 | categoría de queja | `categorias_queja` | `id`; código único |
| Fase 1.0 | 003 | estado de queja | `estados_queja` | `id`; código y orden únicos |
| Fase 1.0 | 003 | queja | `quejas` | UUID; folio único; remitente opcional según anonimato |
| Fase 1.0 | 003 | auditoría | `auditoria_eventos` | UUID; actor opcional; detalles JSONB |

`schema_migrations` es creada por `backend/src/scripts/migrate.ts` antes de
aplicar archivos numerados.

## Entidades SQLite confirmadas por DDL

| Branch | Entidad | Tabla | Propósito |
| --- | --- | --- | --- |
| Fase 0.9/1.0 | metadata | `sync_metadata` | `device_id`, versión y última sincronización |
| Fase 0.9/1.0 | perfil cacheado | `cached_profile` | perfil público y expiración local |
| Fase 0.9/1.0 | directorio cacheado | `directory_cache` | copia sin credenciales |
| Fase 0.9/1.0 | noticias cacheadas | `news_cache` | contenido, versión y marca pendiente |
| Fase 0.9/1.0 | operaciones | `outbox` | UUID, payload, versión base, reintentos y conflicto |

La contraseña no se persiste en SQLite. El JWT se guarda mediante SecureStore,
fuera de estas tablas.

## Referencias SQL antiguas sin esquema versionado

`master` y el SHA `940bd70` consultan estas tablas en runtime:

| Tabla referenciada | Uso observado | Limitación de auditoría |
| --- | --- | --- |
| `public.empleados` | identidad, perfil y CRUD administrativo | definición no versionada |
| `public.cuentas_acceso` | hash, rol y estado de acceso | definición no versionada |

No se listan como entidades confirmadas de esquema porque no hay migración,
schema SQL ni modelo declarativo que permita reconstruirlas.

## Modelo de identidad comparado

| Campo | `master` | SHA `940bd70` | Fase 0.9/1.0 |
| --- | --- | --- | --- |
| PK persona | `empleados.id` referenciado por SQL | igual | `colaboradores.id` BIGSERIAL |
| Employee ID | login por correo; código usado por admin | `empleados.codigo_empleado`, 12 caracteres | `colaboradores.numero_empleado`, hasta 50 |
| Email | `empleados.correo` | `empleados.correo` | `colaboradores.correo`, opcional/único |
| Password hash | `cuentas_acceso.password_hash` | igual | `usuarios.password_hash`, bcrypt requerido |
| Role | `cuentas_acceso.rol` | igual | `roles` + `usuario_roles` |
| Status | `empleados.activo` + `cuentas_acceso.activo` | igual | `colaboradores.activo` + `usuarios.activo` |
| Session version | no | no | `usuarios.token_version` |
| Timestamps | consultas no prueban definición completa | consultas no prueban definición completa | `creado_en`/`actualizado_en` versionados |

### Incompatibilidad

`empleados/cuentas_acceso` y `colaboradores/usuarios/roles` son dos modelos de
identidad distintos. Mantener ambos produciría duplicación de PK, estado, roles,
hashes y lógica de sesión. La migración debe mapear requisitos, no copiar tablas.

## Duplicación por dominio

| Entidad | Ramas antiguas | Fase 0.9/1.0 | Conflicto |
| --- | --- | --- | --- |
| users/accounts | `cuentas_acceso` | `usuarios` | sí; identidad y sesión duplicadas |
| employees | `empleados` | `colaboradores` | sí; campos y employee ID diferentes |
| roles | columna `rol` | `roles` + `usuario_roles` | sí; columna vs relación normalizada |
| sessions | JWT sin versión; cookie en `940bd70` | JWT + `token_version`; SecureStore | sí; revocación y transporte diferentes |
| news | sólo demo UI; servicio sin BD | `noticias` + sync/outbox | no hay tabla antigua que migrar |
| complaints | panel marca módulo no disponible | `quejas`, categorías y estados | sólo Fase 1.0 tiene esquema |
| audit logs | no confirmados | `auditoria_eventos` | sólo Fase 1.0 tiene esquema |

## Migraciones y seeds

| Branch | Migrations | Seeds | Reset/verify |
| --- | --- | --- | --- |
| `master` | ninguna | ninguno | no |
| SHA `940bd70` | ninguna | scripts ad hoc de código/admin; no seed reproducible | no |
| Fase 0.9 | 001 y 002 | `seed-demo-user.ts` | migrate; sin reset general |
| Fase 1.0 | 001, 002 y 003 | `seed-data.ts`, `seed-dev.ts`, `seed-demo-user.ts` | `db:verify`, `db:reset`, `test:db` |

El reset de Fase 1.0 elimina y recrea `public`, pero `safety.ts` sólo permite
`falcon_db`/`falcon_test` y prohíbe producción. Esta auditoría no lo ejecutó.

## Variables de entorno

Sólo se listan nombres y propósito; no se muestran secretos.

| Variable | Branch | Propósito | Secreto/sensible |
| --- | --- | --- | --- |
| `DOTENV_CONFIG_PATH` | antiguas y fases | seleccionar archivo local | no |
| `NODE_ENV` | SHA `940bd70`, Fase 1.0 | producción/test/desarrollo; cookie y safety | no |
| `PORT` | todas las APIs | puerto HTTP principal | no |
| `HOST` | Fase 0.9/1.0 | interfaz de escucha API | no |
| `FALCON_LISTEN_HOST` | SHA `940bd70` | interfaz de escucha API antigua | no |
| `DB_HOST` | todas | host PostgreSQL | no; infraestructura |
| `DB_PORT` | todas | puerto PostgreSQL | no |
| `DB_NAME` | todas | nombre de base | no; infraestructura |
| `DB_USER` | todas | usuario PostgreSQL | sensible/credencial |
| `DB_PASSWORD` | todas | contraseña PostgreSQL | **sí** |
| `JWT_SECRET` | todas las APIs | firma JWT | **sí** |
| `CORS_ORIGINS` | Fase 0.9/1.0 | allowlist de orígenes | no |
| `FALCON_TEST_ADMIN_PASSWORD` | SHA `940bd70` | contraseña de admin sintético | **sí** |
| `DEMO_PASSWORD` | Fase 0.9/1.0 | hash de cuentas dummy | **sí** |
| `RUN_DB_INTEGRATION` | Fase 1.0 | habilitar prueba PostgreSQL | no |
| `EXPO_PUBLIC_API_URL` | móviles recientes | URL HTTP de la API | no; pública en bundle |
| `NOTICIAS_HOST` | SHA `940bd70` | interfaz del microservicio | no |
| `NOTICIAS_PORT` | SHA `940bd70` | puerto del microservicio | no |
| `EXPO_OS` | Expo antiguo | bifurcaciones por plataforma | no |

Las ramas antiguas no versionan ejemplos de entorno. Fase 0.9/1.0 sí incluye
ejemplos con placeholders; `.env` y `.env.local` permanecen ignorados.

## Estrategia recomendada

- Una sola PostgreSQL `falcon_db`.
- Un solo schema `public` durante el alcance académico.
- Una sola conexión desde `backend/`; ningún cliente conecta directo a la BD.
- Migraciones numeradas y seeds dummy como única fuente reproducible.
- `falcon_test` aislada para pruebas destructivas.
- No crear base separada para noticias: su modelo ya pertenece a `falcon_db`.
- Evaluar schemas múltiples sólo si aparecen límites regulatorios o equipos con
  despliegues realmente independientes; hoy el código no los requiere.
