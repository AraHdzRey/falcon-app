# Auditoría de base de datos FALCÓN

Fecha de corte: 14 de noviembre de 2026.

## Alcance y método

Se comparó el catálogo real de `falcon_db` (PostgreSQL 18.7) contra
`001_auth.sql`, `002_offline_sync.sql`, el runner `src/scripts/migrate.ts` y
las consultas del repositorio PostgreSQL. La inspección fue de solo lectura y
no incluyó valores de credenciales ni datos personales.

## Resultado ejecutivo

- Las dos migraciones versionadas están registradas en `schema_migrations`.
- El esquema real coincide con las migraciones `001` y `002`.
- No se encontraron tablas manuales, columnas huérfanas ni migraciones sin
  aplicar.
- El proyecto usa SQL y `pg` directamente; no existe ORM ni un segundo runner.
- El runner ordena archivos, evita reaplicarlos y ejecuta cada migración en una
  transacción.
- Quejas, categorías, estados y bitácora de auditoría todavía no existen.
- Los siete roles actuales se conservan por compatibilidad del backend; el rol
  `director` no se eliminará sólo para ajustar el conteo objetivo de datos
  dummy.

## Tablas encontradas

| Tabla | Propósito | PK | FK | Índices relevantes | Timestamps | Datos sensibles |
| --- | --- | --- | --- | --- | --- | --- |
| `roles` | Catálogo de roles | `id` | — | `codigo` único | `creado_en` | No |
| `colaboradores` | Identidad laboral separada de la cuenta | `id` | — | `numero_empleado` y `correo` únicos | `creado_en`, `actualizado_en` | Correo; identidad laboral |
| `usuarios` | Cuenta y autenticación | `id` | `colaborador_id → colaboradores` | `colaborador_id` único | `creado_en`, `actualizado_en` | `password_hash`, estado y versión de token |
| `usuario_roles` | Asignación de roles | `(usuario_id, rol_id)` | `usuarios`, `roles` | un rol principal por usuario | `creado_en` | No |
| `noticias` | Noticias sincronizables | UUID `id` | `creado_por → usuarios` | `version` | `creado_en`, `actualizado_en` | Autor interno |
| `sync_state` | Versión central singleton | `id = 1` | — | PK | `actualizado_en` | No |
| `sync_operations` | Idempotencia y conflictos | UUID `id` | `usuario_id → usuarios` | `(usuario_id, creado_en DESC)` | `creado_en` | Usuario y payload operativo |
| `schema_migrations` | Registro del runner | `nombre` | — | PK | `aplicado_en` | No |

## Integridad e índices

- Las cuentas exigen hash bcrypt mediante `CHECK (password_hash LIKE '$2%')`.
- Número de empleado, correo, código de rol e identidad de cuenta son únicos.
- Todas las relaciones existentes tienen FK explícita.
- `sync_state` está protegido como singleton y con versión no negativa.
- `noticias.version` debe ser positiva y está indexada para sincronización.
- `sync_operations.estado` sólo acepta `applied` o `conflict`.
- Los índices actuales corresponden a consultas reales; no se detectó un índice
  faltante bloqueante para el código existente.

## Conteos iniciales observados

Estimaciones del catálogo: 7 roles, 1 colaborador, 1 cuenta, 1 asignación de
rol, 0 noticias y 0 operaciones de sincronización. Son datos locales previos y
no forman parte del dataset reproducible.

## Brechas frente al dominio aprobado

| Entidad | Estado inicial |
| --- | --- |
| Cuenta / colaborador / rol | Implementado |
| Noticias | Implementado sin ciclo borrador/publicación/vencimiento |
| Queja o sugerencia | Pendiente de implementación funcional |
| Categoría de queja | Pendiente de implementación funcional |
| Estado de queja | Pendiente de implementación funcional |
| Audit log | Pendiente de implementación funcional |
| Operación y versión de sincronización | Implementado |

La siguiente migración puede incorporar únicamente las cuatro entidades
aprobadas pendientes. No se crearán tablas para muro social, likes,
comentarios, cumpleaños, aniversarios, beneficios ni colaboradores destacados.

## Riesgos y decisiones

- Las quejas anónimas deberán imponer por restricción que la cuenta remitente
  sea nula y la bitácora no revele identidad.
- Los folios deberán ser únicos, opacos y ajenos al número de empleado.
- El seed deberá usar bcrypt y `DEMO_PASSWORD` sólo en memoria.
- `falcon_test` deberá aislar cualquier prueba destructiva de `falcon_db`.
- No se modificará PostgreSQL, `pg_hba.conf`, el puerto 5432 ni la autenticación
  `scram-sha-256`.
