# Auditoría actual de repositorios FALCÓN

Fecha de corte: 14 de noviembre de 2026.

## Alcance y fuentes

| Repositorio | Rama/commit auditado | Clasificación |
| --- | --- | --- |
| `brendarlara17-ui/Proyecto-FALCON` | `main` / `daff235` | Canónico del producto |
| `AraHdzRey/falcon-app` | `master` / `dd31e7c` y refs `940bd70` | Fuente de login/API |
| `Monster8010/calpu-falcon` | `docs/github-initial-publication` / `f4e3bb1` | Histórico, no canónico |

La integración se realizó en `integration/local-api-login`, basada en
`origin/main` sin modificar `main` ni publicar cambios.

## Implementado

- Frontend Expo funcional en `frontend/` y cliente HTTP único.
- Backend único en `backend/`: Express, TypeScript, PostgreSQL y OpenAPI.
- `GET /health`, `GET /health/db`, `POST /auth/login`, `GET /auth/me`,
  `POST /auth/logout` y guard de rol en `/admin/ping`.
- Bcrypt, JWT corto, revocación por versión, rate limit y consultas parametrizadas.
- Migración normalizada para colaborador, cuenta, rol y relación cuenta/rol.
- Pruebas unitarias/integración HTTP con datos sintéticos.
- PostgreSQL restringido a `127.0.0.1` y `::1`; la API es la única capa LAN.
- Swagger UI en `/docs` y contrato en `/openapi.json`.

## Parcial

- Validación física desde teléfono: requiere teléfono conectado y Wi-Fi en
  perfil privado.
- Login contra PostgreSQL real: requiere que el propietario introduzca las
  contraseñas personalmente; no se capturan ni documentan.
- Postman y Swagger interactivo: dependen de que la API real permanezca activa.
- Android Studio tiene una actualización del editor disponible por el mecanismo
  del fabricante; no se instala sin confirmación en el momento de actuar.

## Propuesto

- Reservar o documentar la IPv4 de la computadora durante una demostración.
- Corregir la prioridad de ADB para usar `Android\Sdk\platform-tools`.
- Abrir TCP 3000 sólo en firewall `Private` si la prueba LAN lo exige.
- Ampliar RAM física cuando el equipo lo permita.

## Histórico

- `calpu-falcon` conserva patrones y documentación de la publicación inicial;
  no contiene el backend local de autenticación de esta fase.
- Los commits de Araceli fueron conservados mediante cherry-pick con autoría e
  historial visibles antes de consolidar `apps/api` en `backend`.

## Obsoleto para el estado actual

- La afirmación de la auditoría del 19 de octubre de que no había frontend,
  backend o evidencia A10 ya no describe el checkout actual.
- AWS, Azure y Render aparecen en fuentes históricas/propuestas; no son la
  arquitectura actual del piloto. Esas fuentes no fueron reescritas.
- El microservicio separado de noticias en `940bd70` no se incorporó porque esta
  fase exige un solo backend y no autoriza comenzar otros módulos.

## Evidencia A10 observada

- Estado: **Done**.
- Fecha: **16 oct – 27 oct**.
- Responsables: **Araceli, Antonio, Erik, Brenda y Emiliano**.
- Comentario del 9 de noviembre: “Pantallas proporcionadas y aprobadas por la
  empresa.”

Esta evidencia se registra sólo aquí. Notion no fue modificado.

## Validación técnica

- Backend integrado: instalación desde lockfile, árbol de dependencias,
  TypeScript, ESLint, build y once pruebas HTTP.
- Frontend integrado: instalación desde lockfile, TypeScript, ESLint, cinco
  pruebas, compatibilidad Expo y 21/21 comprobaciones de Expo Doctor.
- Dependencias de producción backend: 0 vulnerabilidades reportadas.
- Dependencias de producción frontend: tres avisos moderados transitivos de
  `minimatch` a través de Expo. El arreglo automático ofrecido degrada Expo 57
  a Expo 52; se rechazó por ser incompatible y requerir `--force`.

## Actualización Fase 0.9 — offline-first

Implementado en la rama de integración:

- SQLite `falcon_local.db` con perfil, directorio, noticias, metadata y outbox.
- JWT sólo en SecureStore; ninguna contraseña/hash en SQLite.
- Polling de cuatro segundos y refresco manual.
- Timeout de API de cinco segundos, reintentos persistentes e indicador pendiente.
- Migración `002_offline_sync.sql`, versión central e idempotencia por UUID.
- Endpoints `/sync/changes` y `/sync/operations` con rol editorial/admin.
- Conflicto por `baseVersion` con política servidor-gana documentada.
- Backend 11/11 y frontend 5/5 pruebas; Expo Doctor 21/21.

Pendiente observado: prueba física A/B/C, reapertura offline real, cambio de red
a perfil Private, regla específica de firewall y actualización de Platform
Tools bloqueada por `adb.exe`. No se declara éxito de tres dispositivos.

## Procedencia de la integración

Se conservaron los commits fuente de Araceli para backend, app, login/logout y
separación servicio/repositorio. Después se consolidó el backend dentro de la
estructura canónica y se mantuvo el frontend Expo 57 de `Proyecto-FALCON` para
evitar dos aplicaciones móviles y dos backends paralelos.
