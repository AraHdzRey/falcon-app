# Base de datos FALCÓN

## Arquitectura y alcance

PostgreSQL es la fuente central de verdad y sólo recibe conexiones de la API
Node.js. La aplicación React Native nunca se conecta directamente a PostgreSQL;
SQLite se limita a caché local y outbox para el funcionamiento offline.

- `falcon_db`: desarrollo local integrado.
- `falcon_test`: pruebas automatizadas destructivas.
- `5432`: sólo loopback (`127.0.0.1`/`::1`), nunca expuesto a la LAN.

El proyecto usa SQL versionado en `backend/migrations/`, el paquete `pg` y un
único runner (`src/scripts/migrate.ts`). No utiliza ORM.

## Requisitos

- Node.js 24 LTS y npm 11.
- PostgreSQL 18.
- Un usuario local de PostgreSQL con permiso para crear las dos bases.

Desde `backend/`:

```powershell
npm ci
Copy-Item .env.example .env
```

Editar `.env` localmente. Mantener `DB_HOST=127.0.0.1`, usar
`DB_NAME=falcon_db` y sustituir sólo los marcadores `CHANGE_ME`. El archivo
`.env` está ignorado por Git.

## Crear las bases

No colocar la contraseña en la línea de comandos. Permitir que `psql` la pida:

```powershell
psql -U postgres -h 127.0.0.1 -d postgres -c "CREATE DATABASE falcon_db;"
psql -U postgres -h 127.0.0.1 -d postgres -c "CREATE DATABASE falcon_test;"
```

Si una base ya existe, no volver a crearla.

## Migraciones, seed y verificación

```powershell
npm run db:migrate
$env:DEMO_PASSWORD = Read-Host 'Contraseña dummy temporal'
npm run db:seed
npm run db:verify
Remove-Item Env:DEMO_PASSWORD
```

`DEMO_PASSWORD` debe tener entre 12 y 128 caracteres. Sólo vive en el entorno
del proceso; el seed genera el hash bcrypt y nunca persiste la contraseña.
`db:seed` usa identificadores deterministas y upserts, por lo que puede
repetirse sin duplicar registros.

## Reset autorizado

`db:reset` elimina y reconstruye el esquema `public` de la base seleccionada,
aplica todas las migraciones y luego el seed. Sólo acepta `falcon_db` o
`falcon_test` y aborta con `NODE_ENV=production`.

```powershell
$env:DEMO_PASSWORD = Read-Host 'Contraseña dummy temporal'
npm run db:reset
npm run db:verify
Remove-Item Env:DEMO_PASSWORD
```

Revisar siempre `NODE_ENV` y `DB_NAME` antes de ejecutar el reset. Nunca usarlo
contra una base que contenga información que deba conservarse.

## Pruebas con PostgreSQL real

Copiar `.env.test.example` a un archivo local ignorado o cargar sus variables
en la sesión. La prueba se niega a correr si no detecta simultáneamente
`NODE_ENV=test` y `DB_NAME=falcon_test`.

```powershell
$env:NODE_ENV = 'test'
$env:DB_NAME = 'falcon_test'
$env:DEMO_PASSWORD = Read-Host 'Contraseña dummy temporal'
$env:RUN_DB_INTEGRATION = '1'
npm run db:reset
npm run test:db
Remove-Item Env:DEMO_PASSWORD
Remove-Item Env:RUN_DB_INTEGRATION
```

La prueba cubre login válido, contraseña errónea, usuario inexistente,
usuario inactivo, autorización de administrador, rechazo de no administrador y
privacidad de directorio, quejas anónimas y auditoría.

## Backup y restauración

Los dumps son locales y están ignorados por Git. No incluir credenciales en
scripts ni nombres de archivo compartidos.

```powershell
pg_dump -U postgres -h 127.0.0.1 -d falcon_db -Fc -f falcon_db_local.backup
createdb -U postgres -h 127.0.0.1 falcon_restore
pg_restore -U postgres -h 127.0.0.1 -d falcon_restore --clean --if-exists falcon_db_local.backup
```

Para un dump SQL plano se usa `psql -f archivo.sql`. La restauración nunca debe
sobrescribir una base sin confirmar antes su nombre y propósito.

## Solución de problemas

- `ECONNREFUSED`: comprobar el servicio PostgreSQL y que `DB_HOST` sea
  `127.0.0.1`.
- `password authentication failed`: corregir sólo `DB_PASSWORD` en el `.env`
  local; no modificar `pg_hba.conf`.
- `database does not exist`: crear `falcon_db` o `falcon_test` explícitamente.
- `DEMO_PASSWORD debe contener...`: cargar una contraseña temporal válida.
- `Base no autorizada...` o protección de producción: corregir `DB_NAME` y
  `NODE_ENV`; no evadir la protección.
- Migración ya aplicada: el runner la omite según `schema_migrations`.

