# Documentación FALCÓN

Este archivo es el mapa de la documentación del repositorio. No es necesario
leer todos los documentos: elige primero la tarea que vas a realizar y consulta
la guía correspondiente.

## ¿Qué necesitas hacer?

| Necesito... | Documento |
| --- | --- |
| Levantar FALCÓN y preparar una demo | [`../README_DEMO_FALCON.md`](../README_DEMO_FALCON.md) |
| Entender la fase vigente | [`phases/README_PHASE_1_1.md`](phases/README_PHASE_1_1.md) |
| Entender la evolución del proyecto | [`phases/README.md`](phases/README.md) |
| Entender la arquitectura local | [`architecture/LOCAL_API_ARCHITECTURE.md`](architecture/LOCAL_API_ARCHITECTURE.md) |
| Entender el modo offline | [`architecture/OFFLINE_FIRST_ARCHITECTURE.md`](architecture/OFFLINE_FIRST_ARCHITECTURE.md) |
| Consultar la API vigente | Swagger en `/docs` y OpenAPI en `/openapi.json`, con la API ejecutándose |
| Revisar la referencia API de Fase 0.9 | [`api/README_API_LOCAL_FALCON.md`](api/README_API_LOCAL_FALCON.md) |
| Entender compatibilidad antigua | [`api/LEGACY_API_COMPATIBILITY.md`](api/LEGACY_API_COMPATIBILITY.md) |
| Preparar PostgreSQL, migraciones y seeds | [`database/README_DATABASE.md`](database/README_DATABASE.md) |
| Entender el modelo de datos actual | [`database/DATABASE_MODEL.md`](database/DATABASE_MODEL.md) |
| Adaptar una BD o trabajo anterior | [`collaboration/README_DATABASE_ADAPTATION_GUIDE.md`](collaboration/README_DATABASE_ADAPTATION_GUIDE.md) |
| Preparar una computadora nueva | [`environment/LOCAL_DEVELOPMENT_SETUP.md`](environment/LOCAL_DEVELOPMENT_SETUP.md) |
| Probar tres dispositivos | [`testing/README_THREE_DEVICE_PHYSICAL_TEST.md`](testing/README_THREE_DEVICE_PHYSICAL_TEST.md) |
| Entender la sincronización A/B/C | [`testing/THREE_DEVICE_SYNC_TEST.md`](testing/THREE_DEVICE_SYNC_TEST.md) |
| Probar recuperación offline | [`testing/OFFLINE_RECOVERY_TEST.md`](testing/OFFLINE_RECOVERY_TEST.md) |

La especificación operativa principal de endpoints es el contrato OpenAPI que
sirve el backend. Los archivos de `docs/api/` anteriores a Fase 1.1 son útiles
para trazabilidad, pero no sustituyen Swagger ni `/openapi.json`.

## Estados usados

- **ACTUAL:** arquitectura, procedimiento o funcionalidad vigente.
- **HISTÓRICO:** documenta una fase o corte anterior y se conserva para
  trazabilidad.
- **REFERENCIA:** explica decisiones, compatibilidad o contexto, pero no define
  por sí solo el estado vigente.
- **PENDIENTE DE VALIDACIÓN:** describe una prueba física todavía no ejecutada
  por completo. La existencia del procedimiento no equivale a un resultado
  aprobado.

## Mapa completo

| Documento | Estado | Uso |
| --- | --- | --- |
| [`api/LEGACY_API_COMPATIBILITY.md`](api/LEGACY_API_COMPATIBILITY.md) | REFERENCIA | Mapea rutas y modelos heredados hacia el contrato canónico; no es la especificación principal de la API. |
| [`api/README_API_LOCAL_FALCON.md`](api/README_API_LOCAL_FALCON.md) | HISTÓRICO | Referencia de autenticación y sincronización de Fase 0.9; su conteo de rutas y pruebas no describe toda Fase 1.1. |
| [`api/README_API.md`](api/README_API.md) | HISTÓRICO | Guía básica de la API local de Fase 0.9; contiene sólo el subconjunto inicial de endpoints. |
| [`architecture/LOCAL_API_ARCHITECTURE.md`](architecture/LOCAL_API_ARCHITECTURE.md) | ACTUAL | Arquitectura de tres capas: frontend → API → PostgreSQL, con la base restringida a loopback. |
| [`architecture/OFFLINE_FIRST_ARCHITECTURE.md`](architecture/OFFLINE_FIRST_ARCHITECTURE.md) | ACTUAL | Explica Expo con SQLite, SecureStore, outbox y sincronización REST contra la API. |
| [`audit/FALCON_BRANCH_ARCHITECTURE_CURRENT.md`](audit/FALCON_BRANCH_ARCHITECTURE_CURRENT.md) | REFERENCIA | Fotografía comparativa de ramas al 16-11-2026, anterior al cierre de Fase 1.1. |
| [`audit/FALCON_BRANCH_AUDIT.md`](audit/FALCON_BRANCH_AUDIT.md) | REFERENCIA | Auditoría extensa de ramas y decisiones que motivaron la API unificada. |
| [`audit/FALCON_CURRENT_REPOSITORY_AUDIT.md`](audit/FALCON_CURRENT_REPOSITORY_AUDIT.md) | REFERENCIA | Corte de repositorios del 14-11-2026 con actualización sobre el repositorio principal. |
| [`audit/FALCON_DATABASE_MATRIX.md`](audit/FALCON_DATABASE_MATRIX.md) | REFERENCIA | Comparación de motores, esquemas, variables y entidades entre ramas anteriores. |
| [`audit/FALCON_ENDPOINT_MATRIX.md`](audit/FALCON_ENDPOINT_MATRIX.md) | REFERENCIA | Matriz de endpoints de ramas antiguas y Fases 0.9/1.0; no incluye los módulos completos de Fase 1.1. |
| [`audit/FALCON_SERVICE_CONNECTIONS.md`](audit/FALCON_SERVICE_CONNECTIONS.md) | REFERENCIA | Compara puertos y conexiones históricas, incluido el experimento aislado de noticias. |
| [`collaboration/README_DATABASE_ADAPTATION_GUIDE.md`](collaboration/README_DATABASE_ADAPTATION_GUIDE.md) | ACTUAL | Guía para adaptar ramas, tablas y módulos anteriores al modelo canónico sin duplicar arquitectura. |
| [`database/DATABASE_MODEL.md`](database/DATABASE_MODEL.md) | ACTUAL | Inventario del modelo producido por las migraciones 001, 002 y 003. |
| [`database/DUMMY_DATA.md`](database/DUMMY_DATA.md) | ACTUAL | Describe el dataset sintético, su privacidad y el uso seguro de `DEMO_PASSWORD`. |
| [`database/FALCON_DATABASE_AUDIT.md`](database/FALCON_DATABASE_AUDIT.md) | HISTÓRICO | Auditoría del 14-11-2026 previa a la migración 003; sus brechas ya no definen el estado actual. |
| [`database/PHASE_1_0_DATABASE_REPORT.md`](database/PHASE_1_0_DATABASE_REPORT.md) | HISTÓRICO | Reporte de implementación y validación de la base reproducible de Fase 1.0. |
| [`database/README_DATABASE.md`](database/README_DATABASE.md) | ACTUAL | Guía operativa de `falcon_db`, `falcon_test`, `backend/migrations/`, seeds, verificación y respaldos. |
| [`environment/FALCON_TOOLCHAIN_FINAL.md`](environment/FALCON_TOOLCHAIN_FINAL.md) | HISTÓRICO | Fotografía del equipo y toolchain al cierre de Fase 0.9; no es un requisito universal actualizado. |
| [`environment/LOCAL_DEVELOPMENT_SETUP.md`](environment/LOCAL_DEVELOPMENT_SETUP.md) | ACTUAL | Preparación de dependencias, variables locales, PostgreSQL, backend, frontend y red de desarrollo. |
| [`phases/README.md`](phases/README.md) | ACTUAL | Índice de fases; identifica Fase 1.1 como vigente y conserva pendientes físicos. |
| [`phases/README_PHASE_0_9.md`](phases/README_PHASE_0_9.md) | HISTÓRICO | Cierre de arquitectura local, autenticación y offline-first heredados por fases posteriores. |
| [`phases/README_PHASE_1_0.md`](phases/README_PHASE_1_0.md) | HISTÓRICO | Cierre de migraciones, seeds y base reproducible heredados por Fase 1.1. |
| [`phases/README_PHASE_1_1.md`](phases/README_PHASE_1_1.md) | ACTUAL | Descripción de la fase vigente y de la API modular unificada. |
| [`testing/OFFLINE_RECOVERY_TEST.md`](testing/OFFLINE_RECOVERY_TEST.md) | PENDIENTE DE VALIDACIÓN | Procedimiento de caída y recuperación; la lógica automática pasó, pero falta la ejecución física. |
| [`testing/README_THREE_DEVICE_PHYSICAL_TEST.md`](testing/README_THREE_DEVICE_PHYSICAL_TEST.md) | PENDIENTE DE VALIDACIÓN | Protocolo principal A/B/C; no constituye evidencia de una prueba física aprobada. |
| [`testing/THREE_DEVICE_SYNC_TEST.md`](testing/THREE_DEVICE_SYNC_TEST.md) | PENDIENTE DE VALIDACIÓN | Registro resumido de sincronización A/B/C, todavía sin dispositivos ejecutados. |

## Estructura real

```text
docs/
├── README.md
├── api/
│   ├── LEGACY_API_COMPATIBILITY.md
│   ├── README_API.md
│   └── README_API_LOCAL_FALCON.md
├── architecture/
│   ├── LOCAL_API_ARCHITECTURE.md
│   └── OFFLINE_FIRST_ARCHITECTURE.md
├── audit/
│   ├── FALCON_BRANCH_ARCHITECTURE_CURRENT.md
│   ├── FALCON_BRANCH_AUDIT.md
│   ├── FALCON_CURRENT_REPOSITORY_AUDIT.md
│   ├── FALCON_DATABASE_MATRIX.md
│   ├── FALCON_ENDPOINT_MATRIX.md
│   └── FALCON_SERVICE_CONNECTIONS.md
├── collaboration/
│   └── README_DATABASE_ADAPTATION_GUIDE.md
├── database/
│   ├── DATABASE_MODEL.md
│   ├── DUMMY_DATA.md
│   ├── FALCON_DATABASE_AUDIT.md
│   ├── PHASE_1_0_DATABASE_REPORT.md
│   └── README_DATABASE.md
├── environment/
│   ├── FALCON_TOOLCHAIN_FINAL.md
│   └── LOCAL_DEVELOPMENT_SETUP.md
├── phases/
│   ├── README.md
│   ├── README_PHASE_0_9.md
│   ├── README_PHASE_1_0.md
│   └── README_PHASE_1_1.md
└── testing/
    ├── OFFLINE_RECOVERY_TEST.md
    ├── README_THREE_DEVICE_PHYSICAL_TEST.md
    └── THREE_DEVICE_SYNC_TEST.md
```

## Inconsistencias y contexto que no debe confundirse

- Los documentos de `audit/` describen cortes fechados y ramas históricas con
  `apps/api`, `apps/mobile`, tablas `empleados`/`cuentas_acceso` y un servicio
  experimental de noticias. Son evidencia comparativa, no la arquitectura
  vigente.
- `api/README_API_LOCAL_FALCON.md` y `api/README_API.md` documentan el alcance
  anterior de Fase 0.9. Para Fase 1.1, Swagger y OpenAPI son la fuente de rutas.
- `database/FALCON_DATABASE_AUDIT.md` registra como pendientes las entidades de
  quejas y auditoría porque fue escrito antes de la migración 003. El modelo
  vigente está en `database/DATABASE_MODEL.md`.
- `environment/FALCON_TOOLCHAIN_FINAL.md` contiene versiones, rutas y estado de
  red observados en una computadora concreta al cierre de Fase 0.9.
- Las tres guías de `testing/` separan resultados automáticos de evidencia
  física. La prueba A/B/C y la recuperación en teléfonos reales siguen
  pendientes.
