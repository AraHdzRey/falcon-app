# Auditoría integral de ramas FALCÓN

Fecha de corte: 16 de noviembre de 2026.

Repositorio activo: `https://github.com/AraHdzRey/falcon-app`.

Esta auditoría es de sólo lectura sobre las ramas. Los únicos cambios locales son
los documentos de auditoría solicitados; no se hizo commit, push, merge,
cherry-pick ni cambio de rama remota.

## Resumen ejecutivo

1. `master` es la base histórica con `apps/api` y `apps/mobile`.
2. `feature/falcon-noticias-service`, `feature/falcon-gateway-infra` y
   `feature/sesion-web-falcon` apuntan al mismo SHA `940bd70`; no representan
   tres arquitecturas distintas.
3. El supuesto gateway no existe: no hay reverse proxy, BFF, nginx, service
   discovery, routing entre servicios ni configuración de gateway.
4. El microservicio `services/noticias` es un Express aislado en TCP 3101 con
   sólo `GET /health`; no usa BD, autenticación, CRUD, Swagger ni es consumido
   por la API o el frontend.
5. La sesión web de `940bd70` agrega cookie HttpOnly alrededor del mismo JWT,
   pero conserva también el token en el cuerpo y el middleware protegido sigue
   exigiendo Bearer. No hay refresh token ni revocación persistente.
6. `integration/local-api-login` es la implementación completa de Fase 0.9:
   backend único, OpenAPI, auth Bearer, revocación por `token_version`, SQLite,
   SecureStore, outbox y sincronización.
7. `feature/database-dev-seed` hereda Fase 0.9 y añade exclusivamente el alcance
   reproducible de Fase 1.0: migración 003, seed determinista, reset protegido,
   verificación y prueba PostgreSQL.
8. Para el proyecto académico conviene conservar un solo backend modular sobre
   `feature/database-dev-seed`, una sola `falcon_db`, una sola autenticación y
   un único OpenAPI. No hay evidencia que justifique un gateway o varias bases.

## Repositorio y remotos

| Campo | Resultado |
| --- | --- |
| Remoto activo | `origin` → `AraHdzRey/falcon-app` |
| Rama por defecto | `master` |
| Checkout auditado | `feature/database-dev-seed` |
| Estado inicial | limpio y al día con `origin/feature/database-dev-seed` |
| Remoto histórico | `legacy-proyecto-falcon`; fuera del flujo activo |

## Inventario de ramas

| Branch | HEAD | Último commit | Fecha | Autor | Clasificación |
| --- | --- | --- | --- | --- | --- |
| `master` | `dd31e7c` | FALCON: aplicacion movil Expo preparada | 2026-10-25 | Araceli | BASE, FRONTEND, BACKEND, AUTH |
| `feature/falcon-noticias-service` | `940bd70` | feat(noticias): crear microservicio Express independiente | 2026-11-13 | Araceli | FRONTEND, BACKEND, AUTH, MICROSERVICE, EXPERIMENTAL |
| `feature/falcon-gateway-infra` | `940bd70` | feat(noticias): crear microservicio Express independiente | 2026-11-13 | Araceli | FRONTEND, BACKEND, AUTH, MICROSERVICE, EXPERIMENTAL; no contiene gateway |
| `feature/sesion-web-falcon` | `940bd70` | feat(noticias): crear microservicio Express independiente | 2026-11-13 | Araceli | FRONTEND, BACKEND, AUTH, MICROSERVICE, EXPERIMENTAL |
| `integration/local-api-login` | `282b4f3` | docs: set falcon-app as primary repository | 2026-11-15 | Antonio Alvarado SJ | INTEGRATION, FRONTEND, BACKEND, AUTH, DATABASE |
| `feature/database-dev-seed` | `2c231c1` | chore: connect phase 1.0 to falcon-app history | 2026-11-15 | Antonio Alvarado SJ | INTEGRATION, FRONTEND, BACKEND, AUTH, DATABASE, DOCUMENTATION |

No se encontraron otras ramas remotas activas en `origin`.

## Hecho crítico: tres nombres, un solo árbol

Las ramas de noticias, gateway y sesión web tienen el mismo HEAD, los mismos 92
archivos y diff cero entre sí. Cada una está seis commits delante de `master`.
Por tanto, cualquier diferencia atribuida a una de ellas está presente también
en las otras dos. El nombre de la rama no demuestra una separación por servicio.

## `master`

### Propósito real

Base histórica con API Express/PostgreSQL y aplicación Expo Router.

### Ficha técnica

| Campo | Resultado |
| --- | --- |
| Directorios raíz | `apps/` |
| Package manager | npm; lockfile por `apps/api` y `apps/mobile` |
| Node/engines | no declarados |
| Frameworks | Express 5, Expo 54, Expo Router, React Native 0.81 |
| Frontend | `apps/mobile` |
| Backend | `apps/api` |
| Servicios separados | ninguno |
| Database | PostgreSQL vía `pg`; nombre tomado de `DB_NAME` |
| Connection module | `apps/api/src/config/database.ts` |
| ORM | ninguno; SQL parametrizado directo |
| Migrations/seeds | no existen |
| Tests | tres archivos `.mjs` de API; no hay script `test` en package.json |
| OpenAPI/Swagger | no |
| Docker/infra | no |
| Env examples | no hay `.env.example` versionado |
| Puertos | API 3000; guard de prueba 3001; PostgreSQL 5432 por defecto |

### Qué contiene

- Login por correo y contraseña en `POST /api/auth/login`.
- JWT Bearer de 15 minutos, bcrypt y rate limit.
- Middleware de cuenta activa y roles `empleado`/`administrador`.
- Consulta y administración de empleados.
- Health HTTP y health de PostgreSQL.

### Qué NO contiene

- Logout, consulta de sesión, cookies, refresh token o revocación.
- Migraciones o esquema reproducible.
- Noticias reales, sincronización, SQLite, SecureStore u outbox.
- Swagger/OpenAPI, gateway o Docker.

### Cómo se ejecuta

Desde `apps/api`: `npm ci`, `npm run dev` o `npm run build && npm start`.
Desde `apps/mobile`: `npm ci`, `npm start`.

### Base de datos

El motor es PostgreSQL y el schema usado por las consultas es `public`. No hay
fuente versionada del esquema. El código referencia `empleados` y
`cuentas_acceso`, pero sus definiciones no están en la rama. `DB_NAME` es
configurable; el servidor reconoce `falcon_seguridad_test` sólo en su guard de
prueba.

### Fortalezas

- API y móvil claramente separados.
- Queries parametrizadas, bcrypt, JWT corto, rate limit y validación de roles.

### Problemas

- El esquema PostgreSQL no puede reconstruirse desde Git.
- No existe ejemplo de entorno ni versión de Node.
- Los tests no tienen script npm asociado.
- El login por correo es incompatible con los identificadores posteriores.

### Reutilizar

Conceptos de administración de empleados y protección del último administrador,
tras adaptarlos al modelo de Fase 1.0.

### No integrar directamente

El árbol completo `apps/` ni el modelo `empleados/cuentas_acceso`, porque
duplicarían frontend, backend e identidad.

## `feature/falcon-noticias-service`

### Propósito real

Acumula seis commits de login/sesión web, pantallas demo, repositorio de
empleados y un esqueleto de microservicio de noticias.

### Ficha técnica

| Campo | Resultado |
| --- | --- |
| Directorios raíz | `.gitignore`, `apps/`, `services/` |
| Package manager | npm con tres lockfiles |
| Node/engines | no declarados |
| Frameworks | Express 5, Expo 54, Expo Router |
| Frontend | `apps/mobile` |
| Backend | `apps/api` |
| Servicio | `services/noticias` |
| Database | PostgreSQL sólo para `apps/api`; noticias no usa BD |
| Migrations/seeds | no; hay scripts ad hoc de códigos/admin |
| Tests | los tres tests API heredados; sin script npm; noticias sin tests |
| OpenAPI/Swagger | no |
| Docker/infra | no |
| Env examples | no hay `.env.example` versionado |
| Puertos | API 3000, test 3001, noticias 3101, PostgreSQL 5432 |

### Noticias: alcance real

`services/noticias/src/server.ts` crea un proceso Express independiente. Su única
ruta es `GET /health`; responde nombre y estado del servicio. No implementa:

- base o tablas;
- migraciones;
- autenticación o permisos;
- creación, lectura, edición, eliminación o publicación;
- llamadas hacia/desde `apps/api`;
- Swagger/OpenAPI;
- pruebas.

Las pantallas de noticias del móvil usan `NOTICIAS_DEMO` y URLs externas de
imágenes; no consumen el servicio de TCP 3101.

### Autenticación

- Login por `codigoEmpleado` de 12 caracteres y contraseña.
- Respuesta JSON con JWT Bearer y cookie HttpOnly `falcon_sesion`.
- `GET /api/auth/sesion` valida la cookie.
- `POST /api/auth/logout` sólo elimina la cookie.
- Las rutas protegidas restantes continúan exigiendo Bearer.
- No existe refresh token, `token_version`, denylist ni revocación en BD.

### Fortalezas

- Cookie HttpOnly con `sameSite=strict` y expiración alineada a 15 minutos.
- Separación de repositorio/servicio para empleados.
- Configuración explícita para no usar localhost en teléfono.

### Problemas

- Cookie y Bearer conviven sin una política única.
- Logout no invalida un JWT ya emitido.
- CORS permite únicamente `http://localhost:8081` con credenciales.
- Noticias es sólo un health aislado; su nombre sobrestima el alcance.
- No hay esquema reproducible ni pruebas del servicio.

### Reutilizar

La idea de una cookie HttpOnly puede reutilizarse como adaptador web futuro y
las reglas de protección administrativa pueden portarse por módulo.

### No integrar directamente

No fusionar `apps/api`, `apps/mobile` o `services/noticias` completos sobre
Fase 1.0. Duplican responsabilidades y usan otro modelo de identidad.

## `feature/falcon-gateway-infra`

### Propósito real

El contenido es idéntico a `feature/falcon-noticias-service`.

### Gateway encontrado

**NO.** No hay gateway, reverse proxy, BFF, nginx, proxy Express, service
discovery, tabla de rutas, agregación de OpenAPI, contenedores ni health checks
orquestados. Tampoco existen llamadas de `apps/api` al servicio de noticias.

### Qué reutilizar

Nada específico de gateway. Sólo aplican los componentes descritos para el SHA
compartido `940bd70`.

### Qué no integrar directamente

No tratar esta rama como infraestructura ni usarla como base de integración por
su nombre: técnicamente es el mismo snapshot de sesión/noticias.

## `feature/sesion-web-falcon`

### Propósito real

El contenido es idéntico a `feature/falcon-noticias-service`; su aporte de sesión
web está mezclado con los demás commits del SHA `940bd70`.

### Frontend y backend

Expo Router 54 consume `apps/api` en TCP 3000. No hay frontend web independiente;
el mismo código móvil incluye soporte `Platform.OS === 'web'`.

### Mecanismo de sesión

JWT HS256 de 15 minutos emitido a la vez en JSON y en cookie HttpOnly. La cookie
sirve para `/api/auth/sesion`; el middleware normal lee Bearer. El logout limpia
la cookie, pero no revoca el JWT.

### Reutilizar

Los atributos de cookie y el endpoint de consulta de sesión, únicamente si se
adaptan a la identidad canónica y a revocación por versión.

### No integrar directamente

No conservar dos transportes de sesión sin definir clientes, CORS, CSRF y
revocación. No conservar el modelo `cuentas_acceso` en paralelo.

## `integration/local-api-login` — Fase 0.9

### Propósito real

Integración local completa: un backend modular y un frontend Expo offline-first.

### Ficha técnica

| Campo | Resultado |
| --- | --- |
| Directorios raíz | `backend/`, `frontend/`, `docs/` |
| Package manager | npm con lockfile por workspace; sin root workspace |
| Engines | Node `>=24 <25`, npm `>=11 <12` |
| Frameworks | Express 5, Expo 57, React Native 0.86 |
| Frontend | `frontend/`, SQLite, SecureStore, caché y outbox |
| Backend | `backend/`, API REST única |
| Servicios separados | ninguno |
| Database | PostgreSQL `falcon_db`, schema `public`; SQLite `falcon_local.db` por teléfono |
| Connection module | `backend/src/config/database.ts` |
| ORM | ninguno; `pg` y SQL parametrizado |
| Migrations | `001_auth.sql`, `002_offline_sync.sql` |
| Seeds | `seed-demo-user.ts` |
| Tests | backend HTTP y frontend config/sync |
| OpenAPI/Swagger | OpenAPI 3.1 en `/openapi.json`; Swagger en `/docs` |
| Docker/infra | no |
| Env examples | backend y frontend |
| Puertos | API 3000, PostgreSQL 5432, Metro/origen permitido 8081 |

### Confirmación de alcance

La rama contiene realmente Express, TypeScript, PostgreSQL, JWT, bcrypt, roles,
health HTTP/DB, login/me/logout, admin ping, sync changes/operations, SQLite,
SecureStore, outbox, polling, migraciones 001/002 y tests.

### Autenticación

`employeeId/password`, JWT Bearer de 15 minutos, bcrypt coste 12, rate limit,
consulta de cuenta activa y `token_version`. Logout incrementa la versión y
revoca tokens previos. No usa cookies ni refresh token.

### Sincronización

El móvil guarda perfil/directorio/noticias en SQLite, JWT en SecureStore y
operaciones `news/upsert` en outbox. Sube pendientes antes de descargar cambios,
usa UUID para idempotencia y política servidor-gana en conflictos.

### Fortalezas

- Una sola API y una identidad normalizada.
- Esquema reproducible, OpenAPI y pruebas.
- PostgreSQL queda detrás de la API; el teléfono sólo usa HTTP.
- Offline-first implementado, no sólo documentado.

### Problemas

- La UI piloto es más pequeña que las pantallas Expo Router del snapshot antiguo.
- Sólo noticias tiene escritura sincronizable.
- No incorpora todavía el CRUD administrativo antiguo.
- No hay prueba física A/B/C ejecutada.

### Reutilizar

Toda la base técnica para la API unificada: configuración, repositorio,
middleware, token versionado, OpenAPI y motor offline.

### No integrar directamente

No añadir el backend viejo o el microservicio vacío en paralelo.

## `feature/database-dev-seed` — Fase 1.0

### Propósito real

Extiende Fase 0.9 con una base reproducible y datos completamente sintéticos.

### Herencia

`integration/local-api-login` es ancestro de esta rama. La diferencia propia son
ocho commits y 28 archivos cambiados; no es una rama unificada con Fase 0.9.

### Ficha técnica

| Campo | Resultado |
| --- | --- |
| Backend/frontend/endpoints | heredados sin cambio funcional de Fase 0.9 |
| Database | `falcon_db`; test aislado `falcon_test`; SQLite local heredado |
| Migrations | 001 auth, 002 sync, 003 complaints/audit |
| Seeds | `seed-data.ts`, `seed-dev.ts`, `seed-demo-user.ts` |
| Scripts | migrate, seed, seed-demo, verify, reset, test:db |
| Tests | HTTP, integración PostgreSQL y frontend |
| OpenAPI/Swagger | heredado y operativo |
| Docker/ORM | no |

### Datos dummy

El seed determinista crea 7 roles, 20 colaboradores/usuarios, 6 categorías, 4
estados, 20 quejas, 10 noticias y 15 eventos de auditoría. `DEMO_PASSWORD` se
define localmente; no hay contraseña fija versionada.

### Seguridad operativa

Seed/reset sólo aceptan `falcon_db` o `falcon_test` y rechazan producción. El
test de BD exige `NODE_ENV=test` y `DB_NAME=falcon_test`.

### Fortalezas

- Reproducción completa sin copiar un directorio de datos PostgreSQL.
- Privacidad validada: datos sintéticos y reglas para quejas anónimas.
- Reset explícito y protegido, prueba real de auth/roles/privacidad.

### Problemas

- La migración 003 crea tablas de quejas/auditoría, pero todavía no expone rutas
  HTTP para esos módulos.
- El reset elimina el schema `public`; sólo debe usarse en bases autorizadas.

### Reutilizar

Es la base recomendada para el siguiente diseño porque ya contiene Fase 0.9 y el
modelo reproducible más completo.

### No integrar directamente

No duplicar `empleados/cuentas_acceso` ni crear una segunda base para noticias.

## Comparación de autenticación

| Aspecto | `master` | SHA `940bd70` | Fase 0.9/1.0 |
| --- | --- | --- | --- |
| Identificador de login | correo | código de 12 caracteres | `numero_empleado` (`employeeId`) |
| Cuenta | `cuentas_acceso` | `cuentas_acceso` | `usuarios` |
| Persona | `empleados` | `empleados` | `colaboradores` |
| Roles | columna `rol` | columna `rol` | tablas `roles` + `usuario_roles` |
| Sesión | Bearer JWT | Bearer JWT + cookie | Bearer JWT + SecureStore móvil |
| Logout | no | borra cookie | incrementa `token_version` |
| Revocación JWT | no | no | sí |
| Refresh token | no | no | no |

Son soluciones distintas y no deben coexistir con modelos de usuario paralelos.
La candidata canónica es Fase 1.0 porque tiene esquema versionado, roles
normalizados, revocación y pruebas reproducibles. La cookie de sesión web puede
adaptarse después como transporte, no como segundo sistema de identidad.

## Diferencias y riesgos de merge

| Comparación | Commits exclusivos destino | Archivos cambiados | Riesgo |
| --- | ---: | ---: | --- |
| `master` → cada rama `940bd70` | 6 | 45 | medio; evolución lineal pero mezcla tres alcances |
| `master` → Fase 0.9 | 15 visibles por procedencia | 110 | alto; reestructura `apps/` a `backend/frontend` |
| Fase 0.9 → Fase 1.0 | 8 | 28 | bajo si se conserva la dirección de herencia |
| noticias ↔ gateway ↔ sesión | 0 | 0 | no hay contenido distinto que fusionar |

Las ramas antiguas y Fase 0.9 modifican en común 14 rutas críticas, incluidas
auth, admin, server y manifests. Un merge directo puede reintroducir dos APIs,
dos frontends y dos modelos de identidad. Reutilizar debe hacerse por requisito
y archivo, no por merge completo.

## Clasificación final

| Branch | Clasificación |
| --- | --- |
| `master` | BASE, FRONTEND, BACKEND, AUTH |
| `feature/falcon-noticias-service` | FRONTEND, BACKEND, AUTH, MICROSERVICE, EXPERIMENTAL |
| `feature/falcon-gateway-infra` | igual al anterior; nombre GATEWAY no respaldado por código |
| `feature/sesion-web-falcon` | FRONTEND, BACKEND, AUTH, EXPERIMENTAL |
| `integration/local-api-login` | INTEGRATION, FRONTEND, BACKEND, AUTH, DATABASE |
| `feature/database-dev-seed` | INTEGRATION, FRONTEND, BACKEND, AUTH, DATABASE, DOCUMENTATION |

## Arquitectura final recomendada

### Decisión

**Opción A: un solo backend modular**, basado en
`feature/database-dev-seed`.

### Razón

- Sólo hay un backend productivo conectado a una BD reproducible.
- El microservicio de noticias no tiene lógica ni integración.
- No existe gateway que conservar.
- El alcance académico favorece operación local simple.
- Un backend único ofrece un único OpenAPI y evita duplicar auth/DB.

### Estrategia

| Tema | Recomendación |
| --- | --- |
| Base branch | `feature/database-dev-seed` |
| API | `backend/` modular por rutas/repositorios/servicios |
| Frontend | `frontend/`; portar pantallas antiguas por componente, no el árbol completo |
| Database | una `falcon_db`, schema `public` por ahora |
| Auth | modelo `colaboradores/usuarios/roles`, Bearer y `token_version` |
| Web session | adaptador HttpOnly futuro sobre la misma identidad, con CSRF/CORS definidos |
| Noticias | módulo dentro del backend actual; no conservar servicio 3101 vacío |
| Gateway | ninguno inicialmente; reevaluar sólo con dos servicios reales independientes |
| Swagger | un único OpenAPI servido por el backend |
| Cloud | ninguna; PC local, API 3000, PostgreSQL loopback 5432 |

## Próximo paso exacto — sin implementar todavía

1. Crear desde `feature/database-dev-seed` una rama de diseño para API unificada.
2. Congelar contratos públicos actuales y generar una tabla de compatibilidad
   entre `/api/*` antiguo y rutas Fase 0.9.
3. Decidir los módulos prioritarios: empleados/admin, noticias y quejas.
4. Diseñar DTOs usando el modelo `colaboradores/usuarios/roles`; no crear tablas
   `empleados/cuentas_acceso` paralelas.
5. Portar primero pruebas de comportamiento administrativo, después
   controladores/servicios, adaptando SQL al esquema canónico.
6. Incorporar noticias como router/repositorio en el backend y documentarlo en
   el OpenAPI existente.
7. Portar pantallas Expo antiguas sobre el cliente HTTP y storage actuales.
8. Si se necesita web, diseñar una cookie HttpOnly con revocación compartida,
   protección CSRF y CORS explícito.
9. Mantener una sola `falcon_db`; agregar migraciones numeradas y seeds dummy.
10. Ejecutar typecheck, lint, tests, migraciones, seed, Swagger y prueba física
    antes de cualquier PR.

No crear gateway, segundo backend o segunda base hasta que un requisito medido
demuestre que el monolito modular ya no es suficiente.

## Estado Git de esta auditoría

- Archivos modificados: documentos de auditoría locales únicamente.
- Commit: **NONE**.
- Push: **NONE**.
- Merge: **NONE**.
