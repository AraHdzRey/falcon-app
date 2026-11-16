# Proyecto FALCÓN — Fase 1.0

## Resultado

**FASE 1.0: COMPLETE.**

**DATABASE REPRODUCIBLE: YES.**

**DUMMY DATA: YES.**

La Fase 0.9 creó la arquitectura y el funcionamiento:

```text
App → API REST → PostgreSQL
App → SQLite local / outbox
```

La Fase 1.0 hizo reproducible la persistencia:

```text
Git → migrations + seed + scripts + tests → PostgreSQL reconstruible
```

Una persona nueva puede reconstruir el esquema y los datos de desarrollo sin
copiar la instalación física de otra computadora.

## Qué se versiona y qué no

Se versionan:

- migraciones SQL;
- seed sintético determinista;
- runner, reset y verificación;
- pruebas automatizadas;
- ejemplos de entorno sin secretos;
- documentación del modelo y la instalación.

No se versionan:

- `PostgreSQL\data` ni la base física `falcon_db`;
- dumps privados (`*.dump`, `*.backup`);
- `node_modules` o compilaciones;
- `.env`, passwords, JWT, tokens o credenciales locales.

Sólo se requieren Git, Node/npm, PostgreSQL y credenciales creadas localmente
por el propietario.

## Modelo real resultante

| Tabla | Propósito | PK | FK principales |
| --- | --- | --- | --- |
| `roles` | Catálogo de autorización | `id` | — |
| `colaboradores` | Identidad laboral separada de la cuenta | `id` | — |
| `usuarios` | Cuenta, hash bcrypt, estado y versión de token | `id` | `colaborador_id → colaboradores` |
| `usuario_roles` | Asignación de roles | `(usuario_id, rol_id)` | `usuarios`, `roles` |
| `noticias` | Noticias sincronizables | UUID `id` | `creado_por → usuarios` |
| `sync_state` | Versión central singleton | `id = 1` | — |
| `sync_operations` | Idempotencia y conflictos del outbox | UUID `id` | `usuario_id → usuarios` |
| `categorias_queja` | Catálogo de categorías | `id` | — |
| `estados_queja` | Flujo mínimo de estados | `id` | — |
| `quejas` | Quejas identificadas o anónimas | UUID `id` | categoría, estado y remitente opcional |
| `auditoria_eventos` | Trazabilidad sin secretos | UUID `id` | actor opcional → `usuarios` |
| `schema_migrations` | Registro del runner | `nombre` | — |

El detalle de campos, índices y privacidad está en
[`DATABASE_MODEL.md`](../database/DATABASE_MODEL.md).

## Migraciones

El único runner es `backend/src/scripts/migrate.ts`. Ordena los archivos,
registra cada nombre en `schema_migrations`, omite los ya aplicados y ejecuta
cada migración nueva en una transacción.

| Archivo | Función |
| --- | --- |
| `001_auth.sql` | Roles, colaboradores, cuentas y asignación de roles |
| `002_offline_sync.sql` | Versión central, noticias y operaciones idempotentes |
| `003_complaints_audit.sql` | Categorías, estados, quejas y auditoría |

Comando real:

```powershell
npm run db:migrate
```

La migración 003 protege el anonimato por restricción: una queja anónima exige
`remitente_usuario_id IS NULL`. Los folios son únicos y opacos.

## Seed sintético

Archivos reales:

- `backend/src/database/seed-data.ts`: fixtures deterministas;
- `backend/src/scripts/seed-dev.ts`: upserts transaccionales;
- `backend/src/services/password.service.ts`: bcrypt compartido con login;
- `backend/src/scripts/verify-database.ts`: conteos y controles de privacidad.

`npm run db:seed` genera:

| Dato | Total |
| --- | ---: |
| Roles físicos compatibles | 7 |
| Roles asignados del alcance actual | 6 tipos |
| Colaboradores | 20 |
| Cuentas | 20 |
| Categorías de queja | 6 |
| Estados de queja | 4 |
| Quejas | 20 |
| Quejas anónimas | 5 |
| Noticias | 10 |
| Eventos de auditoría | 15 |

Todos los datos son ficticios. Los IDs dummy van de `TI001` a `TI020` y los
correos usan el dominio reservado `example.test`. No hay CURP, RFC, cumpleaños,
correos corporativos ni números de empleado reales.

### Contraseña demo local

El repositorio no contiene una contraseña demo. Debe introducirse en la sesión
actual y eliminarse después:

```powershell
$env:DEMO_PASSWORD = Read-Host 'Contraseña demo'
npm run db:seed
Remove-Item Env:DEMO_PASSWORD
```

Debe tener entre 12 y 128 caracteres. El seed genera un hash bcrypt mediante el
mismo servicio que usa la autenticación; la variable no se guarda en Git.

## Bases de desarrollo y prueba

- `falcon_db`: desarrollo local integrado.
- `falcon_test`: pruebas automatizadas destructivas.

`backend/.env.test.example` contiene sólo marcadores sintéticos. La prueba de
integración exige simultáneamente `NODE_ENV=test` y `DB_NAME=falcon_test`.

## Reset reproducible

```powershell
$env:DEMO_PASSWORD = Read-Host 'Contraseña demo'
npm run db:reset
npm run db:verify
Remove-Item Env:DEMO_PASSWORD
```

`db:reset`:

1. carga y valida el entorno;
2. aborta con `NODE_ENV=production`;
3. aborta si `DB_NAME` no es `falcon_db` o `falcon_test`;
4. elimina y recrea únicamente el esquema `public` de la base autorizada;
5. ejecuta las tres migraciones;
6. aplica el seed determinista.

Es una operación destructiva dentro de las dos bases autorizadas. Siempre debe
confirmarse `NODE_ENV` y `DB_NAME` antes de ejecutarla.

## Instalación desde cero

Mientras el PR de Fase 1.0 no esté integrado:

```powershell
git clone https://github.com/brendarlara17-ui/Proyecto-FALCON.git
cd Proyecto-FALCON
git switch feature/database-dev-seed
```

1. Instalar PostgreSQL 18 sin copiar directorios `data` de otra PC.
2. Crear la base de desarrollo, permitiendo que `psql` solicite la contraseña:

   ```powershell
   psql -U postgres -h 127.0.0.1 -d postgres -c "CREATE DATABASE falcon_db;"
   ```

3. Preparar y editar el entorno local:

   ```powershell
   cd backend
   npm ci
   Copy-Item .env.example .env
   ```

   Mantener `DB_HOST=127.0.0.1`, `DB_NAME=falcon_db` y reemplazar localmente los
   marcadores de `DB_PASSWORD` y `JWT_SECRET`. No versionar `.env`.

4. Migrar, cargar datos y validar:

   ```powershell
   npm run db:migrate
   $env:DEMO_PASSWORD = Read-Host 'Contraseña demo'
   npm run db:seed
   npm run db:verify
   Remove-Item Env:DEMO_PASSWORD
   ```

5. Compilar, probar e iniciar:

   ```powershell
   npm run typecheck
   npm run lint
   npm run build
   npm test
   npm start
   ```

6. Comprobar la API:

   ```powershell
   curl.exe http://127.0.0.1:3000/health
   curl.exe http://127.0.0.1:3000/health/db
   ```

7. Preparar el frontend en otra terminal:

   ```powershell
   cd frontend
   npm ci
   Copy-Item .env.example .env.local
   npx expo start --lan
   ```

   En `.env.local`, usar `EXPO_PUBLIC_API_URL=http://192.168.X.X:3000`.

8. En el teléfono, iniciar sesión con un `employeeId` dummy como `TI001` y la
   contraseña demo definida localmente.

## Pruebas ejecutadas en Fase 1.0

- auditoría del esquema inicial contra migraciones 001 y 002;
- migración limpia de `falcon_test` con 001, 002 y 003;
- dos ciclos reset → migraciones → seed → verificación con el mismo resultado;
- reaplicación de `db:migrate` sin duplicar migraciones;
- seed incremental y verificación en `falcon_db`;
- bloqueo del reset en producción y en `DB_NAME=postgres`;
- login válido, password incorrecto, usuario inexistente e inactivo;
- autorización admin y rechazo de colaborador;
- directorio sin CURP/RFC/hash;
- quejas anónimas y auditoría sin vínculo de identidad ni secretos;
- backend: typecheck, lint, build y 11 pruebas HTTP/unitarias;
- integración PostgreSQL real: 1/1;
- frontend: typecheck, lint y 5 pruebas;
- Expo: dependencias compatibles y Doctor 21/21;
- instalación limpia del backend desde el lockfile.

`npm audit --omit=dev` reportó cero vulnerabilidades del backend en producción.
Los avisos moderados del tooling/frontend quedaron documentados; no se ejecutó
`npm audit fix --force`.

## Archivos incorporados o modificados

- migración `backend/migrations/003_complaints_audit.sql`;
- configuración, seguridad y dataset en `backend/src/config/` y
  `backend/src/database/`;
- scripts de migración, seed, reset y verificación en `backend/src/scripts/`;
- servicio de password compartido;
- prueba `backend/tests/database.integration.test.ts`;
- `.env.example`, `.env.test.example` y reglas `.gitignore`;
- modelo, auditoría, datos dummy, instalación y reporte en `docs/database/`.

## Seguridad y límites

- `.env` y passwords versionados: no;
- hashes: generados por el backend con bcrypt;
- datos personales reales: no;
- dumps o directorios PostgreSQL: no;
- PostgreSQL expuesto en 5432 a la LAN: no;
- acceso móvil directo a PostgreSQL: no.

La Fase 1.0 agregó persistencia y datos de prueba, no endpoints de quejas ni un
workflow funcional nuevo. Las pruebas físicas A/B/C y offline continúan
pendientes y no bloquean la reproducibilidad de la base.

## Continuación

Revisar el PR #2 contra `integration/local-api-login`. No modificar `main`
mientras la Fase 0.9 no haya sido integrada. Después de la revisión, continuar
sólo con módulos formalmente aprobados y conservar las pruebas físicas como
pendientes hasta ejecutarlas con dispositivos reales.
