# Conexiones y puertos de servicios FALCÓN

Fecha de corte: 16 de noviembre de 2026.

Este documento enumera únicamente conexiones observadas en imports, `fetch`,
configuración HTTP, módulos `pg` y SQLite.

## Matriz de puertos

| Branch | Proceso | Puerto | Propósito | Evidencia |
| --- | --- | ---: | --- | --- |
| `master` | `apps/api` | 3000 | API Express | `apps/api/src/server.ts` |
| `master` | `apps/api` test guard | 3001 | ejecución con `falcon_seguridad_test` | `apps/api/src/server.ts` |
| `master` | PostgreSQL | 5432 por defecto | persistencia | `apps/api/src/config/database.ts` |
| SHA `940bd70` | `apps/api` | 3000 | API Express | `apps/api/src/server.ts` |
| SHA `940bd70` | Expo/web origin | 8081 | origen CORS permitido | `apps/api/src/server.ts` |
| SHA `940bd70` | `services/noticias` | 3101 | sólo health de noticias | `services/noticias/src/server.ts` |
| SHA `940bd70` | PostgreSQL | 5432 por defecto | persistencia de API | `apps/api/src/config/database.ts` |
| Fase 0.9/1.0 | `backend` | 3000 | API REST, OpenAPI y Swagger | `backend/src/config/env.ts` |
| Fase 0.9/1.0 | Metro/origen local | 8081 | desarrollo móvil/CORS ejemplo | env examples |
| Fase 0.9/1.0 | PostgreSQL | 5432 | `falcon_db`, sólo API | env examples |

## Colisiones

- `apps/api` antiguo y `backend` Fase 0.9 usan TCP 3000. No pueden ejecutarse
  simultáneamente en la misma interfaz sin cambiar configuración.
- El guard de test antiguo usa 3001; no colisiona con noticias 3101.
- Metro usa normalmente 8081 y no colisiona con la API.
- PostgreSQL 5432 debe permanecer en loopback; ningún teléfono debe usarlo.

## Conexiones verificadas por implementación

### `master`

```text
apps/mobile
    (no cliente FALCÓN integrado confirmado en master)

apps/api :3000
    -> PostgreSQL DB_* :5432 mediante pg Pool
```

La API no llama a otros servicios. No hay gateway ni proxy.

### SHA compartido `940bd70`

```text
apps/mobile Expo 54
    -> EXPO_PUBLIC_API_URL/api/auth/login
    -> EXPO_PUBLIC_API_URL/api/auth/sesion
    -> EXPO_PUBLIC_API_URL/api/auth/logout

apps/api :3000
    -> PostgreSQL DB_* :5432 mediante pg Pool

services/noticias :3101
    -> ninguna base
    -> ningún downstream
    <- ningún consumidor versionado
```

El móvil obtiene noticias de `NOTICIAS_DEMO` y carga imágenes desde URLs
externas de Unsplash. No existe `fetch` hacia TCP 3101.

### Fase 0.9 y Fase 1.0

```text
frontend Expo 57
    -> EXPO_PUBLIC_API_URL :3000 mediante fetch
    -> falcon_local.db mediante expo-sqlite
    -> SecureStore para sesión JWT

backend :3000
    -> PostgreSQL falcon_db :5432 mediante pg Pool
    -> Swagger UI y OpenAPI servidos por el mismo proceso
```

No hay llamadas backend-a-backend, colas, brokers, proxy ni servicio cloud.

## Matriz de comunicación

| Origen | Destino | Protocolo | Uso | Branch |
| --- | --- | --- | --- | --- |
| Expo antiguo | `apps/api:3000` | HTTP/fetch | login, sesión, logout | SHA `940bd70` |
| `apps/api` | PostgreSQL | protocolo pg | auth, empleados/admin | `master`, SHA `940bd70` |
| Expo Fase 0.9 | `backend:3000` | HTTP/fetch | auth, sync | Fase 0.9/1.0 |
| `backend` | PostgreSQL | protocolo pg | identidad, noticias, sync, datos dummy | Fase 0.9/1.0 |
| Expo Fase 0.9 | SQLite local | API nativa local | caché, metadata, outbox | Fase 0.9/1.0 |
| Expo Fase 0.9 | SecureStore local | API nativa local | JWT y expiración | Fase 0.9/1.0 |
| Expo antiguo | Unsplash | HTTPS externo | imágenes demo | SHA `940bd70` |

## Gateway

### Implementación encontrada

**NO.** La rama `feature/falcon-gateway-infra` es idéntica a las ramas de
noticias y sesión web. No contiene:

- proxy o tabla de rutas;
- servicio de entrada separado;
- autenticación central compartida;
- rate limit global entre servicios;
- service discovery;
- nginx/Traefik;
- Docker/Compose;
- agregación de OpenAPI;
- health de downstreams.

### Usable como punto de integración

**NO en su estado actual.** `apps/api` sí es una entrada HTTP, pero es un backend
monolítico, no un gateway. `services/noticias` permanece aislado.

## Dependencias externas y restricción local

- No se encontraron AWS, Azure, Render ni infraestructura cloud operativa.
- Las URLs Unsplash del demo antiguo son una dependencia de contenido externa;
  no son necesarias para la arquitectura Fase 0.9/1.0.
- La arquitectura recomendada debe ejecutar API, PostgreSQL y Metro en una PC
  local y usar únicamente TCP 3000 hacia la LAN.

## Recomendación de conexión final

```text
web/mobile
    -> backend único :3000
        -> falcon_db :5432 sólo loopback

mobile local
    -> SQLite + SecureStore
```

No introducir gateway hasta que existan al menos dos servicios con despliegue,
versionado, ownership y necesidades de escalado independientes. Si ese momento
llega, el gateway debe agregarse delante de servicios reales y no reemplazar la
autorización dentro de cada módulo.
