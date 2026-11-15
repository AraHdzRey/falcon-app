# Arquitectura offline-first FALCÓN

## Límites de verdad

PostgreSQL es la fuente central de verdad cuando la API está disponible.
Cada teléfono mantiene `falcon_local.db` como copia local de trabajo. SQLite no
reemplaza PostgreSQL y nunca contiene contraseñas ni hashes de servidor.

```text
Teléfono A/B/C
React Native + Expo
  ├─ SecureStore: JWT vigente
  └─ SQLite: perfil, directorio, noticias, metadata y outbox
          |
          | REST cuando el host responde
          v
Node + TypeScript + Express :3000
          |
          v
PostgreSQL falcon_db :5432 sólo loopback
```

## Esquema local

- `sync_metadata`: `device_id`, `server_version` y `last_sync`.
- `cached_profile`: perfil básico y expiración de sesión.
- `directory_cache`: copia del directorio sin CURP/RFC.
- `news_cache`: noticias y marca local `pending`.
- `outbox`: UUID de operación/dispositivo, entidad, operación, payload,
  versión base, estado, reintentos y último error.

La contraseña no se persiste. El JWT se conserva en SecureStore y expira según
el plazo emitido por la API. Al expirar, la app exige conexión para un login
nuevo y no valida credenciales contra SQLite.

## Ciclo de sincronización

Cada cuatro segundos y mediante refresco manual:

1. leer operaciones `pending` en orden;
2. enviar hasta 50 a `POST /sync/operations`;
3. aplicar respuestas idempotentes `applied`, `duplicate` o `conflict`;
4. solicitar `GET /sync/changes?sinceVersion=N`;
5. actualizar directorio/noticias en una transacción SQLite;
6. registrar versión central y hora de sincronización.

Si la API no responde en cinco segundos, se incrementa `retry_count`, la
operación permanece local y la interfaz muestra `PENDIENTE DE SINCRONIZACIÓN`.

## Idempotencia y conflictos

Los UUID de operación y dispositivo evitan duplicados. El backend registra cada
operación en `sync_operations`. Una actualización sólo es válida cuando su
`baseVersion` coincide con la versión central. Si no coincide, **servidor gana**:
la operación se marca `conflict`, se devuelve el registro central y no se
sobrescribe silenciosamente. Los conflictos permanecen registrados para
revisión; esta política no se extiende automáticamente a datos sensibles.

## Caída del host

Con la PC apagada, cada teléfono puede abrir la última copia y agregar una
operación permitida al outbox. A, B y C no se comunican entre sí durante la
caída. La convergencia ocurre sólo cuando vuelve la API. Sin un nodo central no
existe sincronización instantánea; P2P/mesh queda fuera de alcance.
