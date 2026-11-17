# Guía de adaptación de bases de datos y módulos

Esta guía describe cómo integrar trabajo previo en la rama
`integration/falcon-unified-api` sin duplicar la base, la identidad, la API ni
los servicios de FALCÓN. Refleja el estado publicado de la Fase 1.1.

## Arquitectura vigente

```text
Frontend Expo / Web
        ↓
API unificada Express + TypeScript :3000
        ↓
PostgreSQL falcon_db :5432
```

En móvil:

```text
Expo
├── API HTTP
├── SQLite falcon_local.db
└── SecureStore
```

- El frontend nunca se conecta directamente a PostgreSQL.
- Todos los módulos usan el mismo backend Express/TypeScript.
- No existe un gateway activo ni un microservicio separado de noticias.
- No se crea una base PostgreSQL independiente por módulo.
- PostgreSQL es la fuente central de verdad; SQLite es caché y soporte
  local-first.

## Base de datos canónica

La base oficial de desarrollo es `falcon_db` y el esquema es `public`. La
identidad se modela con:

| Tabla | Función real |
| --- | --- |
| `colaboradores` | Perfil laboral: `numero_empleado`, nombre, correo, puesto, área y estado `activo`. |
| `usuarios` | Cuenta de acceso vinculada uno a uno con un colaborador; contiene `password_hash`, estado `activo` y `token_version`. |
| `roles` | Catálogo de roles mediante `codigo` y `nombre`. |
| `usuario_roles` | Relación entre cuentas y roles; `es_principal` determina el rol principal de sesión. |

### Modelo antiguo y modelo actual

El código histórico usaba `empleados`, `cuentas_acceso` y una columna `rol`.
No se deben recrear en paralelo.

| Modelo antiguo | Modelo actual |
| --- | --- |
| `empleados` | `colaboradores` |
| `cuentas_acceso` | `usuarios` |
| columna `rol` | `roles` + `usuario_roles` |
| `codigo_empleado` | `numero_empleado` |
| estado empleado | `colaboradores.activo` |
| estado cuenta | `usuarios.activo` |
| password hash | `usuarios.password_hash` |
| sin revocación | `usuarios.token_version` |

### Tablas disponibles

| Área | Tablas reales |
| --- | --- |
| Identidad | `colaboradores`, `usuarios`, `roles`, `usuario_roles` |
| Sincronización y noticias | `sync_state`, `noticias`, `sync_operations` |
| Quejas | `categorias_queja`, `estados_queja`, `quejas` |
| Auditoría | `auditoria_eventos` |
| Infraestructura | `schema_migrations` |

`schema_migrations` es creada por el runner antes de aplicar los archivos SQL.
No es una migración adicional.

## SQLite móvil y sesión

`frontend/src/storage/database.ts` abre `falcon_local.db` y crea estas tablas:

- `sync_metadata`: versión central, fecha de sincronización e identificador del
  dispositivo;
- `cached_profile`: copia local temporal del perfil público;
- `directory_cache`: caché del directorio;
- `news_cache`: noticias sincronizadas y pendientes;
- `outbox`: operaciones locales pendientes o en conflicto.

Las contraseñas no se guardan en SQLite. El JWT y su vencimiento se guardan en
SecureStore mediante `frontend/src/storage/session.ts`. SQLite no reemplaza a
`falcon_db`: sólo aporta caché, outbox y continuidad local-first.

## Ya tenía tablas o una BD para mi módulo, ¿qué hago?

1. Identificar las tablas que creó y la funcionalidad que representan.
2. Compararlas contra las tablas publicadas de `falcon_db`.
3. Clasificar cada tabla como `YA EXISTE`, `SE PUEDE ADAPTAR` o
   `REALMENTE NUEVA`.
4. Si ya existe, adaptar modelos, repositorios y consultas.
5. Si se puede adaptar, conservar la regla de negocio y mapearla al esquema
   canónico.
6. Si realmente es nueva, justificarla y proponer una migración incremental.
7. No crear tablas, usuarios, bases o conexiones duplicadas.

**No se tira la lógica útil; se adapta al esquema canónico.**

### Ejemplo: empleados

Antes:

```sql
SELECT *
FROM empleados
WHERE codigo_empleado = $1;
```

Ahora, con columnas reales:

```sql
SELECT id, numero_empleado, nombre, correo, puesto, area, activo
FROM colaboradores
WHERE numero_empleado = $1;
```

### Ejemplo: cuentas y roles

Antes, una consulta dependía de `cuentas_acceso` y su columna `rol`. Ahora la
relación es:

```text
usuarios
   ↓
usuario_roles
   ↓
roles
```

Consulta parametrizada de referencia:

```sql
SELECT
  u.id AS usuario_id,
  c.numero_empleado,
  r.codigo AS rol,
  ur.es_principal
FROM usuarios AS u
JOIN colaboradores AS c ON c.id = u.colaborador_id
JOIN usuario_roles AS ur ON ur.usuario_id = u.id
JOIN roles AS r ON r.id = ur.rol_id
WHERE c.numero_empleado = $1
  AND c.activo = TRUE
  AND u.activo = TRUE
ORDER BY ur.es_principal DESC, r.id
LIMIT 1;
```

Los valores se envían como parámetros; no se concatenan en el SQL.

## Noticias, quejas y auditoría

### Noticias

Noticias ya usa `noticias`, `sync_state` y, para el outbox recibido,
`sync_operations`. No crear `noticias_db`, `news`, `noticias_service_db`, otra
instancia PostgreSQL ni un servicio en otro puerto. La lectura requiere una
cuenta activa; la escritura requiere `editor_noticias` o `administrador`.

### Quejas

El módulo usa `categorias_queja`, `estados_queja` y `quejas`. Una queja
identificada requiere autenticación. Una queja anónima guarda
`remitente_usuario_id` como `NULL`, no vincula colaborador o usuario, no asigna
un actor identificable en auditoría y devuelve sólo el folio público. El
seguimiento público expone únicamente estado y fechas previstas por el
contrato.

### Auditoría

`auditoria_eventos` es la bitácora central de eventos funcionales y
administrativos. No crear otro audit log salvo un requisito justificado. Nunca
guardar contraseñas, JWT, secretos ni la identidad del remitente de una queja
anónima en `detalles`.

## Migraciones

Las migraciones publicadas son:

1. `001_auth.sql`: identidad, cuentas y roles;
2. `002_offline_sync.sql`: estado de sincronización, noticias y operaciones;
3. `003_complaints_audit.sql`: catálogos de quejas, quejas y auditoría.

La Fase 1.1 no creó una migración `004`: el esquema existente cubrió sus
módulos. No se edita una migración ya publicada. La siguiente evolución debe
usar el siguiente número disponible, por ejemplo `004_nombre.sql`, seguida por
`005_nombre.sql` y `006_nombre.sql`.

### Conflictos entre colaboradores

Si dos ramas paralelas crean:

```text
Persona A: 004_directory.sql
Persona B: 004_news.sql
```

antes de integrar se conserva una como `004_directory.sql` y se renumera la
otra, por ejemplo, a `005_news.sql`. También se actualizan las pruebas y la
documentación que mencionen el nombre anterior. La numeración se decide contra
la rama de integración actualizada, no contra una copia antigua.

## Seeds

Los componentes reales son:

- `backend/src/database/seed-data.ts`: fixtures sintéticos;
- `backend/src/scripts/seed-dev.ts`: seed completo, expuesto como `db:seed`;
- `backend/src/scripts/seed-demo-user.ts`: cuenta demo, expuesta como
  `db:seed-demo`.

Usar sólo datos dummy. `DEMO_PASSWORD` es local, debe tener entre 12 y 128
caracteres y sólo se entrega al proceso para generar el hash bcrypt. Nunca se
versionan contraseñas, datos personales reales ni un `.env`.

## Variables de entorno

Cada colaborador mantiene su propio `.env` ignorado. Los nombres reales del
backend son:

```text
NODE_ENV
HOST
PORT
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
JWT_SECRET
CORS_ORIGINS
DOTENV_CONFIG_PATH
DEMO_PASSWORD
RUN_DB_INTEGRATION
```

El frontend usa:

```text
EXPO_PUBLIC_API_URL
```

No se documentan ni versionan valores reales.

## Conexión PostgreSQL y API unificada

`backend/src/config/database.ts` contiene el único `createPool`. El proceso lo
crea una vez en `backend/src/server.ts` y lo comparte con los repositorios. Un
módulo nuevo debe recibir y reutilizar ese pool; no debe crear un `new Pool(...)`
propio.

La API se consume en:

```text
http://<host>:3000
```

- Swagger: `/docs`
- OpenAPI JSON: `/openapi.json`

No se crea otro Swagger ni otro puerto para noticias, quejas o directorio.

## Endpoints disponibles

El OpenAPI de Fase 1.1 contiene **23 paths** y **26 operaciones HTTP**. En la
tabla se agrupan las operaciones que comparten path para conservar el conteo
real de 23 rutas.

| Módulo | Método | Endpoint | Acceso o rol |
| --- | --- | --- | --- |
| Health | GET | `/health` | Público |
| Health | GET | `/health/db` | Público |
| Auth | POST | `/auth/login` | Público; rate limit |
| Auth | GET | `/auth/me` | Cuenta activa autenticada |
| Auth | POST | `/auth/logout` | Cuenta activa autenticada |
| Admin | GET | `/admin/ping` | `administrador` |
| Directory | GET | `/directory` | Cuenta activa autenticada |
| Directory | GET | `/profile/me` | Cuenta activa autenticada |
| Admin | GET / POST | `/admin/collaborators` | GET: `administrador`, `capital_humano` o `director`; POST: `administrador` |
| Admin | PUT | `/admin/collaborators/{id}` | `administrador` |
| Admin | PATCH | `/admin/collaborators/{id}/deactivate` | `administrador` |
| Admin | PATCH | `/admin/collaborators/{id}/reactivate` | `administrador` |
| News | GET / POST | `/news` | GET: cuenta activa; POST: `editor_noticias` o `administrador` |
| News | GET / PATCH | `/news/{id}` | GET: cuenta activa; PATCH: `editor_noticias` o `administrador` |
| Complaints | GET | `/complaint-categories` | Público |
| Complaints | POST | `/complaints` | Público si es anónima; autenticado si es identificada |
| Tracking | GET | `/complaints/track/{folio}` | Público |
| Complaints | GET | `/admin/complaints` | `responsable_quejas`, `administrador` o `director` |
| Complaints | GET | `/admin/complaints/{id}` | `responsable_quejas`, `administrador` o `director` |
| Complaints | PATCH | `/admin/complaints/{id}/status` | `responsable_quejas`, `administrador` o `director` |
| Audit | GET | `/admin/audit` | `administrador` o `auditor` |
| Sync | GET | `/sync/changes` | Cuenta activa autenticada |
| Sync | POST | `/sync/operations` | `editor_noticias` o `administrador` |

`/docs` y `/openapi.json` son superficies de documentación servidas por la
aplicación, pero no forman parte de los 23 paths declarados en el documento
OpenAPI.

### Adaptar un endpoint antiguo

Antes:

```text
PATCH /api/admin/empleados/:id/desactivar
```

Equivalente actual:

```text
PATCH /admin/collaborators/:id/deactivate
```

La adaptación debe actualizar la ruta, el modelo (`colaboradores` y
`usuarios`), la autorización de `administrador`, el SQL parametrizado y las
pruebas. No se habilita un alias `/api/*` para conservar el backend antiguo.

## No fusionar ramas antiguas completas

No hacer:

```bash
git merge feature/sesion-web-falcon
```

ni equivalentes sólo para traer una funcionalidad. Las ramas antiguas pueden
contener otro backend, otro frontend o el modelo de identidad anterior. La
adaptación se hace por funcionalidad.

Sí se pueden reutilizar:

- reglas de negocio;
- pantallas y componentes;
- validaciones;
- DTOs adaptables;
- consultas una vez adaptadas;
- casos de prueba;
- comportamiento esperado.

## Flujo Git

Mientras Fase 1.1 siga como rama de integración, cada colaborador parte de
`integration/falcon-unified-api`:

```bash
git fetch origin
git switch integration/falcon-unified-api
git pull --ff-only
git switch -c feature/falcon-<modulo>
```

Ejemplos:

```text
feature/falcon-news-ui
feature/falcon-directory-ui
feature/falcon-complaints
feature/falcon-admin
```

El pull request de cada feature debe apuntar a
`integration/falcon-unified-api`, no directamente a `master`, salvo una
decisión posterior del equipo.

## Desarrollo local

Los comandos siguientes corresponden a los scripts versionados actuales.

1. Clonar y seleccionar la rama:

   ```powershell
   git clone https://github.com/AraHdzRey/falcon-app.git
   cd falcon-app
   git switch integration/falcon-unified-api
   ```

2. Instalar el backend y crear un `.env` local a partir del ejemplo:

   ```powershell
   cd backend
   npm ci
   Copy-Item .env.example .env
   git check-ignore .env
   ```

3. Crear `falcon_db` si todavía no existe y completar localmente el `.env`.
   PostgreSQL debe permanecer detrás de la API.
4. Aplicar las migraciones:

   ```powershell
   npm run db:migrate
   ```

5. Cargar y verificar los datos sintéticos:

   ```powershell
   $env:DEMO_PASSWORD = Read-Host 'Contraseña dummy temporal'
   npm run db:seed
   npm run db:verify
   Remove-Item Env:DEMO_PASSWORD
   ```

6. Levantar el backend:

   ```powershell
   npm run dev
   ```

7. Abrir Swagger en `http://127.0.0.1:3000/docs` y comprobar
   `/health` y `/health/db`.
8. En otra consola, instalar y levantar el frontend:

   ```powershell
   cd frontend
   npm ci
   Copy-Item .env.example .env.local
   git check-ignore .env.local
   npm start
   ```

Antes de proponer cambios ejecutar, según el paquete modificado:

```powershell
npm run typecheck
npm run lint
npm run build
npm test
```

El frontend no define `build`; allí se ejecutan `typecheck`, `lint` y `test`.

### `falcon_test`

`falcon_test` se reserva para pruebas PostgreSQL destructivas. Las
protecciones reales exigen simultáneamente `NODE_ENV=test` y
`DB_NAME=falcon_test` para `test:db`. Seeds y reset sólo aceptan `falcon_db` o
`falcon_test` y abortan con `NODE_ENV=production`. Nunca usar una base de
producción, externa o con información que deba conservarse.

## Checklist para colaboradores

```text
[ ] Partí de integration/falcon-unified-api
[ ] Revisé las tablas existentes
[ ] No dupliqué tablas
[ ] No creé otra BD
[ ] No creé otro sistema de usuarios
[ ] Uso falcon_db
[ ] Reutilizo la conexión PostgreSQL actual
[ ] Mis consultas están parametrizadas
[ ] Sólo agregué migración si era necesaria
[ ] Actualicé seeds si corresponde
[ ] Usé datos sintéticos
[ ] Agregué/actualicé tests
[ ] Actualicé OpenAPI si añadí endpoint
[ ] No subí .env
[ ] No subí contraseñas
[ ] No subí tokens
[ ] No subí IP personal
[ ] Typecheck pasa
[ ] Lint pasa
[ ] Build pasa
[ ] Tests pasan
[ ] Swagger funciona
```

## Plantilla de adaptación

```text
Nombre:

Módulo:

Branch:

Código/BD que ya tenía:

Tablas anteriores:

Tablas canónicas equivalentes:

Endpoints anteriores:

Endpoints actuales que utilizará:

Migración nueva:
YES / NO

Seed nuevo:
YES / NO

OpenAPI:
UPDATED / NOT REQUIRED

Tests:

Estado:
```

## Diagramas de decisión

Para una tabla que ya existe:

```text
TRABAJO ANTERIOR
       ↓
Identificar funcionalidad útil
       ↓
Comparar con falcon_db
       ↓
┌────────────────────┐
│ Tabla ya existente │
└─────────┬──────────┘
          ↓
 Adaptar repositorio
          ↓
    API unificada
          ↓
        Tests
          ↓
       Swagger
```

Para una entidad realmente nueva:

```text
No existe tabla
      ↓
Justificar modelo
      ↓
Nueva migración
      ↓
Seed dummy
      ↓
Repositorio/API
      ↓
Tests/OpenAPI
```
