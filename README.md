# Proyecto FALCÓN

> [!IMPORTANT]
> ## [📘 LEER LA GUÍA OBLIGATORIA DEL EQUIPO FALCÓN](README_EQUIPO_FALCON.md)
>
> Antes de modificar código, base de datos, frontend o backend, todo integrante
> debe leer esta guía completa.

Aplicación móvil de gestión con frontend React Native/Expo, API REST local en
Node.js/TypeScript y PostgreSQL como fuente central de verdad. SQLite funciona
únicamente como caché y outbox offline en cada dispositivo.

Repositorio principal de colaboración:
[`AraHdzRey/falcon-app`](https://github.com/AraHdzRey/falcon-app).

Las fases se mantienen separadas:

- Fase 0.9: `integration/local-api-login`.
- Fase 1.0: `feature/database-dev-seed`, descendiente de Fase 0.9.
- Fase 1.1: `integration/falcon-unified-api`, descendiente de Fase 1.0.

## Fases implementadas

- [Índice de fases](docs/phases/README.md)
- [Fase 0.9 — Arquitectura local, autenticación y offline-first](docs/phases/README_PHASE_0_9.md)
- [Fase 1.0 — Base de datos reproducible](docs/phases/README_PHASE_1_0.md)
- [Fase 1.1 — API modular unificada](docs/phases/README_PHASE_1_1.md)

La Fase 0.9 está implementada y validada automáticamente; su validación física
A/B/C permanece pendiente. La Fase 1.0 está completa y permite reconstruir el
esquema y los datos sintéticos sin copiar una instalación PostgreSQL.

## Documentación técnica

- [Arquitectura de la API local](docs/architecture/LOCAL_API_ARCHITECTURE.md)
- [Arquitectura offline-first](docs/architecture/OFFLINE_FIRST_ARCHITECTURE.md)
- [Referencia de la API](docs/api/README_API_LOCAL_FALCON.md)
- [Compatibilidad de API heredada](docs/api/LEGACY_API_COMPATIBILITY.md)
- [Base de datos, migraciones y seeds](docs/database/README_DATABASE.md)
- [Guía de adaptación para colaboradores](docs/collaboration/README_DATABASE_ADAPTATION_GUIDE.md)
- [Preparación del entorno local](docs/environment/LOCAL_DEVELOPMENT_SETUP.md)
- [Prueba física con tres dispositivos](docs/testing/README_THREE_DEVICE_PHYSICAL_TEST.md)
- [Escenario resumido de sincronización A/B/C](docs/testing/THREE_DEVICE_SYNC_TEST.md)
- [Prueba de recuperación offline](docs/testing/OFFLINE_RECOVERY_TEST.md)

Para probar la integración de API y base reproducible se usa Fase 1.0 porque
hereda Fase 0.9; esto no convierte ambas fases en una sola rama.
