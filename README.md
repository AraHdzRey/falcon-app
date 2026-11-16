# Proyecto FALCÓN

Aplicación móvil de gestión con frontend React Native/Expo, API REST local en
Node.js/TypeScript y PostgreSQL como fuente central de verdad. SQLite funciona
únicamente como caché y outbox offline en cada dispositivo.

Repositorio canónico: `brendarlara17-ui/Proyecto-FALCON`.

## Fases implementadas

- [Índice de fases](docs/phases/README.md)
- [Fase 0.9 — Arquitectura local, autenticación y offline-first](docs/phases/README_PHASE_0_9.md)
- [Fase 1.0 — Base de datos reproducible](docs/phases/README_PHASE_1_0.md)

La Fase 0.9 está implementada y validada automáticamente; su validación física
A/B/C permanece pendiente. La Fase 1.0 está completa y permite reconstruir el
esquema y los datos sintéticos sin copiar una instalación PostgreSQL.

## Documentación técnica

- [Arquitectura de la API local](docs/architecture/LOCAL_API_ARCHITECTURE.md)
- [Arquitectura offline-first](docs/architecture/OFFLINE_FIRST_ARCHITECTURE.md)
- [Referencia de la API](docs/api/README_API_LOCAL_FALCON.md)
- [Base de datos, migraciones y seeds](docs/database/README_DATABASE.md)
- [Preparación del entorno local](docs/environment/LOCAL_DEVELOPMENT_SETUP.md)
- [Prueba física con tres dispositivos](docs/testing/README_THREE_DEVICE_PHYSICAL_TEST.md)
- [Escenario resumido de sincronización A/B/C](docs/testing/THREE_DEVICE_SYNC_TEST.md)
- [Prueba de recuperación offline](docs/testing/OFFLINE_RECOVERY_TEST.md)

Mientras la Fase 0.9 no se integre en `main`, el estado conjunto de las fases
0.9 y 1.0 se encuentra en `feature/database-dev-seed`.
