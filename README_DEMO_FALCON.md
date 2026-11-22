# FALCÓN — GUÍA DE DEMOSTRACIÓN Y ARRANQUE COMPLETO

Esta guía permite levantar una copia funcional de FALCÓN desde Git en una
computadora Windows nueva. Está escrita para seguirse literalmente: copia cada
comando, comprueba el resultado indicado y sólo entonces continúa.

La arquitectura vigente es:

```text
TELÉFONO / EXPO
       │
       │ HTTP / REST / JSON
       ▼
API FALCÓN
Node + TypeScript + Express :3000
       │
       ▼
PostgreSQL
falcon_db en 127.0.0.1:5432
```

> [!IMPORTANT]
> El teléfono **NO** se conecta a PostgreSQL. El teléfono se conecta a la API
> y la API se conecta a PostgreSQL. Nunca pongas credenciales de PostgreSQL en
> el frontend.

## Dos recorridos diferentes

- Si es la primera vez que usas FALCÓN en esa computadora, sigue
  [Primera instalación](#primera-instalación) desde el principio.
- Si ya instalaste, migraste y cargaste los datos, ve a
  [Arranque rápido diario](#arranque-rápido-diario). No necesitas repetir el
  seed todos los días.

## ¿Qué significa que todos tenemos la misma BD?

No significa que todos deban conectarse a una única instalación física de
PostgreSQL. Para desarrollo o demostración, cada integrante puede tener:

```text
PC A → falcon_db local
PC B → falcon_db local
PC C → falcon_db local
```

Las bases son reproducibles porque todas se construyen con:

```text
las mismas migraciones
+ los mismos seeds y datos sintéticos
+ el mismo esquema
+ la misma versión del código
```

Si en el futuro existe una base central de la empresa, será otra modalidad de
despliegue. Esta guía describe el entorno local actual.

---

# Primera instalación

## 0. Checklist antes de comenzar

Necesitas:

```text
[ ] Git instalado
[ ] Node.js 24 instalado
[ ] npm 11 disponible
[ ] PostgreSQL 18 instalado
[ ] pgAdmin instalado (opcional, recomendado para la demo)
[ ] Expo Go compatible con SDK 57 en Android
[ ] PC y teléfono en una red donde puedan comunicarse
```

Abre PowerShell y copia, uno por uno:

```powershell
git --version
node --version
npm --version
psql --version
```

**DEBES VER:**

- un número de versión para cada comando;
- Node `v24...`;
- npm `11...`;
- PostgreSQL/psql `18...`.

El proyecto declara Node `>=24 <25` y npm `>=11 <12`. El frontend contiene
Expo `~57.0.33`, React Native `0.86.3` y React `19.2.3`.

**SI `psql` NO SE RECONOCE:**

1. No reinstales PostgreSQL automáticamente.
2. Comprueba las versiones instaladas:

   ```powershell
   Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory
   ```

3. Si aparece la carpeta `18`, prueba:

   ```powershell
   & 'C:\Program Files\PostgreSQL\18\bin\psql.exe' --version
   ```

4. En los pasos posteriores puedes sustituir `psql` por esa ruta completa.

**EXPO GO:** el SDK de Expo Go debe coincidir con el SDK 57 del proyecto. En
Android se puede obtener una versión compatible desde
[`expo.dev/go`](https://expo.dev/go). No actualices el proyecto sólo porque el
teléfono tenga otra versión de Expo Go.

## 1. Clonar el repositorio y elegir la rama oficial

**COPIA:**

```powershell
cd $HOME\Desktop
git clone https://github.com/AraHdzRey/falcon-app.git
cd falcon-app
git fetch origin
git switch integration/falcon-unified-api
git pull --ff-only origin integration/falcon-unified-api
git branch --show-current
```

**DEBES VER AL FINAL:**

```text
integration/falcon-unified-api
```

**SI `falcon-app` YA EXISTE:** no vuelvas a clonar encima. Entra en esa carpeta,
ejecuta `git status` y confirma con el equipo qué trabajo contiene.

## 2. Verificar el estado de Git

**COPIA:**

```powershell
git status
```

**DEBES VER EN UNA INSTALACIÓN NUEVA:**

```text
nothing to commit, working tree clean
```

Esto significa que no hay cambios locales pendientes. Si aparecen archivos
modificados que no reconoces, **no ejecutes `reset`, `restore` ni los borres**.
Consulta con la persona que trabajó en esa computadora.

## 3. Instalar las dependencias del backend

Desde la raíz `falcon-app`:

```powershell
cd backend
npm ci
npm run
```

`npm ci` utiliza `backend/package-lock.json` y reproduce las dependencias
versionadas. `npm run` debe mostrar, entre otros, estos scripts reales:

```text
dev
build
start
typecheck
lint
test
test:db
db:migrate
db:seed
db:seed-demo
db:verify
db:reset
```

> [!CAUTION]
> Esta guía no usa `db:reset`. Es destructivo para el esquema permitido y no
> debe ser el camino predeterminado para preparar una demostración.

**SI `npm ci` FALLA:** confirma primero `node --version`, `npm --version`, la
conexión a Internet y que estás dentro de `falcon-app\backend`.

## 4. Crear el archivo local del backend

Todavía dentro de `backend`:

```powershell
Copy-Item .env.example .env
git check-ignore .env
```

**DEBES VER:** `.env`. Eso confirma que Git lo ignora.

Abre `backend\.env` en un editor local. Conserva los valores no secretos:

```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=falcon_db
DB_USER=postgres
DB_PASSWORD=<ESCRIBE_AQUÍ_TU_CONTRASEÑA_LOCAL_DE_POSTGRESQL>
JWT_SECRET=<ESCRIBE_AQUÍ_TU_SECRETO_LOCAL_DE_AL_MENOS_64_CARACTERES>
CORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
```

No copies los signos `<` y `>`. No publiques `.env`, `DB_PASSWORD`,
`JWT_SECRET`, contraseñas demo ni tokens en Git, mensajes, capturas o la
presentación.

## 5. Confirmar que PostgreSQL está ejecutándose

### Opción A — pgAdmin

1. Abre pgAdmin.
2. Expande **Servers**.
3. Expande **PostgreSQL 18** o la versión instalada.
4. Escribe tu contraseña local cuando pgAdmin la solicite.
5. Expande **Databases**.

### Opción B — PowerShell

**COPIA:**

```powershell
Get-Service | Where-Object { $_.Name -match 'postgres' -or $_.DisplayName -match 'PostgreSQL' }
```

**DEBES VER:** el servicio PostgreSQL con estado `Running`.

Si está detenido, inicia **ese servicio exacto** desde `services.msc` o desde
una PowerShell con permisos apropiados. No reinstales PostgreSQL ni cambies
`pg_hba.conf` para resolver un servicio detenido.

Comprueba que PostgreSQL permanece local:

```powershell
Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,State
```

**DEBES VER:** `127.0.0.1` y/o `::1`. Si aparece `0.0.0.0`, detente y consulta
al responsable: PostgreSQL no debe exponerse a la red para esta demo.

## 6. Crear `falcon_db` si todavía no existe

No crees las tablas una por una. Primero se crea la base vacía; después las
migraciones crean el esquema.

### Con pgAdmin

1. En **Databases**, busca `falcon_db`.
2. Si ya existe, no la vuelvas a crear.
3. Si no existe: clic derecho en **Databases** → **Create** → **Database**.
4. En **Database**, escribe `falcon_db`.
5. Guarda.

### Con `psql`

```powershell
psql -U postgres -h 127.0.0.1 -d postgres
```

`psql` pedirá la contraseña sin colocarla en el historial. Dentro de `psql`:

```sql
SELECT datname FROM pg_database WHERE datname = 'falcon_db';
```

- Si devuelve `falcon_db`, escribe `\q` y continúa.
- Si no devuelve filas, ejecuta:

  ```sql
  CREATE DATABASE falcon_db;
  ```

Después:

```text
\q
```

## 7. Aplicar las migraciones

Confirma que sigues en `falcon-app\backend` y ejecuta:

```powershell
npm run db:migrate
```

En una base nueva, **DEBES VER** mensajes equivalentes a:

```text
Migración aplicada: 001_auth.sql
Migración aplicada: 002_offline_sync.sql
Migración aplicada: 003_complaints_audit.sql
```

Si ya estaban aplicadas, el script las omite y puede terminar sin repetir esos
mensajes. No borres tablas por ello. Las migraciones reales viven en
`backend/migrations/` y se registran en `schema_migrations`.

## 8. Cargar los datos de desarrollo/demo

Un seed carga datos sintéticos reproducibles para probar colaboradores,
usuarios, roles, noticias, quejas y auditoría. El seed actual usa una contraseña
local para las cuentas dummy y hace `upsert`; no necesitas resetear la base.

La contraseña debe tener entre 12 y 128 caracteres. Este bloque la solicita sin
mostrarla, la entrega temporalmente al seed y luego la elimina del entorno:

```powershell
$demoSecure = Read-Host 'DEMO_PASSWORD local' -AsSecureString
$demoPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($demoSecure)
try {
  $env:DEMO_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($demoPointer)
  npm run db:seed
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($demoPointer)
  Remove-Item Env:DEMO_PASSWORD -ErrorAction SilentlyContinue
  $demoSecure.Dispose()
}
```

**DEBES VER:** un mensaje `Seed sintético listo en falcon_db` con conteos de
cuentas, quejas, noticias y eventos. No copies la contraseña al README ni a
ningún archivo versionado.

El identificador confirmado para la demostración es `TI001`, con rol
`administrador`. Su contraseña es la `DEMO_PASSWORD` que acabas de introducir.

## 9. Verificar la base

**COPIA:**

```powershell
npm run db:verify
```

**DEBES VER:** JSON con `database: falcon_db`, conteos del seed,
`anonymousComplaints: 5` y `privacyChecks: OK`.

### Consultas seguras en pgAdmin

En pgAdmin: selecciona `falcon_db` → **Tools** → **Query Tool**. Ejecuta:

```sql
SELECT current_database();

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT COUNT(*) FROM colaboradores;
SELECT COUNT(*) FROM usuarios;
SELECT COUNT(*) FROM noticias;
SELECT COUNT(*) FROM quejas;
SELECT COUNT(*) FROM auditoria_eventos;
```

No consultes ni muestres `password_hash`, JWT, tokens o secretos durante la
presentación.

## 10. Levantar la API

Usa una PowerShell dedicada y nómbrala mentalmente:

```text
TERMINAL 1 — API
```

Desde `falcon-app\backend`:

```powershell
npm run dev
```

**DEBES VER:**

```text
FALCÓN Local API escuchando en http://0.0.0.0:3000
PostgreSQL configurado exclusivamente en el host local
```

**NO CIERRES ESTA TERMINAL.** `0.0.0.0:3000` permite que el teléfono alcance la
API; `DB_HOST=127.0.0.1` mantiene PostgreSQL local.

## 11. Probar la API local

Abre otra PowerShell sin cerrar la API.

```powershell
curl.exe -i http://127.0.0.1:3000/health
curl.exe -i http://127.0.0.1:3000/health/db
```

**DEBES VER:** `HTTP/1.1 200 OK` en ambas respuestas.

```text
/health    = la API funciona
/health/db = la API y PostgreSQL funcionan juntos
```

Si `/health` funciona y `/health/db` no, no es un problema de Expo: revisa el
servicio PostgreSQL, `falcon_db` y las variables `DB_*` del `.env` local.

## 12. Abrir Swagger y OpenAPI

Abre en el navegador:

```text
http://127.0.0.1:3000/docs
```

Contrato JSON:

```text
http://127.0.0.1:3000/openapi.json
```

Swagger es la pantalla interactiva que documenta y permite probar la API.
Antes de inventar una ruta, consulta Swagger.

## 13. Instalar y configurar el frontend

Abre otra PowerShell y nómbrala mentalmente:

```text
TERMINAL 2 — EXPO
```

Desde la raíz del repositorio:

```powershell
cd frontend
npm ci
npm run
```

Los scripts reales incluyen `start`, `android`, `ios`, `web`, `typecheck`,
`lint` y `test`. El SDK actual es Expo 57.

Crea la configuración local:

```powershell
Copy-Item .env.example .env.local
git check-ignore .env.local
```

**DEBES VER:** `.env.local`.

## 14. Configurar la URL de la API para el teléfono

En un teléfono físico, `localhost` y `127.0.0.1` apuntan al teléfono, no a la
PC. Obtén la IP actual de la computadora:

```powershell
ipconfig
```

Busca:

```text
Adaptador de LAN inalámbrica Wi-Fi
→ Dirección IPv4
```

Ejemplo ilustrativo: `192.168.1.50`. **No copies esa IP literalmente.**

Abre `frontend\.env.local` y deja una sola línea con tu IP actual:

```env
EXPO_PUBLIC_API_URL=http://IP_DE_TU_PC:3000
```

Ejemplo solamente ilustrativo:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000
```

La app obtiene la URL mediante `EXPO_PUBLIC_API_URL`; no la hardcodees en el
código.

## 15. Probar la API desde el teléfono antes de abrir Expo

En el navegador del teléfono abre:

```text
http://IP_DE_TU_PC:3000/health
```

**DEBES VER:** una respuesta JSON con `status: ok`.

Si responde, ya confirmaste:

```text
API accesible desde el teléfono ✅
```

Si no responde, no culpes todavía a Expo. Revisa:

1. PC y teléfono en la misma red compatible.
2. IP actual correcta.
3. API todavía ejecutándose en la Terminal 1.
4. Red Wi-Fi sin aislamiento entre clientes.
5. Firewall de Windows.

Consulta el perfil de red:

```powershell
Get-NetConnectionProfile
```

Para una demo, prefiere una red `Private` conocida o un hotspot controlado. Si
el equipo autoriza una regla, debe limitarse a TCP 3000 y perfil Private:

```powershell
New-NetFirewallRule -DisplayName 'FALCON API local TCP 3000' `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 `
  -Profile Private
```

Este comando requiere permisos de administrador. No lo ejecutes en una red
pública ni dupliques la regla si ya existe.

> [!CAUTION]
> 🚨 **NO ABRIR 5432 EN EL FIREWALL PARA EL CELULAR.**
>
> 🚨 **NO CONFIGURAR EXPO PARA CONECTARSE A POSTGRESQL.**
>
> 🚨 **NO PONER CREDENCIALES DE POSTGRESQL EN EL FRONTEND.**

El flujo correcto siempre es:

```text
Teléfono
↓
IP_DE_TU_PC:3000 API
↓
127.0.0.1:5432 PostgreSQL
```

## 16. Levantar Expo en modo LAN

En la Terminal 2, dentro de `falcon-app\frontend`:

```powershell
npx expo start --lan -c
```

`--lan` usa la red local y `-c` limpia la caché de Metro. **DEBES VER:** Metro
en ejecución y un código QR.

1. Abre Expo Go compatible con SDK 57 en Android.
2. Escanea el QR.
3. Espera a que termine el bundle.
4. No cierres la Terminal 2.

## 17. Si la red bloquea Metro: Tunnel

Tunnel ayuda a que el teléfono llegue a Metro en redes restrictivas. La CLI
local confirma el comando `--tunnel`, pero `@expo/ngrok` no forma parte de las
dependencias versionadas del proyecto.

Primero verifica la herramienta global:

```powershell
npm list -g @expo/ngrok --depth=0
```

Si aparece vacía y realmente necesitas Tunnel, la documentación oficial de
Expo indica instalarla globalmente:

```powershell
npm install -g @expo/ngrok
```

Después, desde `frontend`:

```powershell
npx expo start --tunnel -c
```

> [!IMPORTANT]
> El Tunnel de Expo sólo ayuda a llegar a **Metro**. No convierte
> automáticamente la API local `:3000` en una API pública. La app todavía debe
> alcanzar `http://IP_DE_TU_PC:3000`.

Si la red universitaria bloquea comunicación entre dispositivos, prefiere:

1. una red privada conocida;
2. un hotspot controlado;
3. otra red donde PC y teléfono puedan verse.

No expongas PostgreSQL para hacer funcionar una demo.

## 18. Iniciar sesión en la app

En FALCÓN Expo usa:

```text
ID de empleado: TI001
Contraseña: la DEMO_PASSWORD configurada localmente
```

No escribas esa contraseña en esta guía, Git o mensajes.

**DEBES VER:** sesión activa, nombre sintético, ID `TI001`, rol
`administrador`, conteos de directorio/noticias y estado de sincronización.

La app móvil actual permite demostrar:

- login y logout;
- perfil de la sesión;
- conteos sincronizados de directorio y noticias;
- noticias almacenadas localmente;
- sincronización manual;
- creación local de una noticia sintética para roles permitidos.

Los módulos administrativos, quejas y auditoría se demuestran mediante Swagger.
No afirmes que existen pantallas móviles que el frontend todavía no implementa.

Si aparece `NoRouteToHostException`, `Host unreachable` o `fetch failed`, no
significa necesariamente que la contraseña sea incorrecta. Normalmente indica
un problema teléfono → API. Vuelve a probar `/health` en el navegador del
teléfono.

## 19. Mostrar PostgreSQL en pgAdmin

1. Abre pgAdmin.
2. Expande **Servers**.
3. Expande **PostgreSQL 18** o tu versión instalada.
4. Expande **Databases**.
5. Expande **falcon_db**.
6. Expande **Schemas**.
7. Expande **public**.
8. Expande **Tables**.
9. Abre **Query Tool** y usa sólo las consultas seguras del paso 9.

No abras ni proyectes valores de `usuarios.password_hash`.

## 20. Demostración recomendada en Swagger

Todos estos paths existen en el OpenAPI actual. Usa datos exclusivamente
sintéticos.

1. `GET /health` → **Execute** → debe devolver 200.
2. `GET /health/db` → debe devolver 200 y `falcon_db`.
3. `POST /auth/login` → usa `TI001` y escribe personalmente la
   `DEMO_PASSWORD`.
4. Copia el JWT sin mostrarlo al público. En **Authorize**, introduce sólo el
   token solicitado por el formulario Bearer.
5. `GET /auth/me` → muestra identidad y rol dummy.
6. `GET /directory` → muestra el directorio sintético.
7. `GET /news` → muestra noticias persistentes.
8. `GET /complaint-categories` → muestra categorías.
9. `POST /complaints` → opcionalmente crea una queja totalmente sintética y
   conserva el folio devuelto.
10. `GET /complaints/track/{folio}` → consulta el folio sintético.
11. `GET /admin/audit` → `TI001` tiene rol administrador y puede consultarlo.
12. `POST /auth/logout` → deja este paso al final porque revoca los tokens del
    usuario.

No uses durante la demostración rutas de actualización/desactivación de
colaboradores si no forman parte del guion aprobado.

## 21. Checklist: todo está listo

| Componente | Resultado esperado |
| --- | --- |
| PostgreSQL | RUNNING, sólo loopback en 5432 |
| `falcon_db` | READY |
| Migraciones | PASS: 001, 002 y 003 registradas |
| Seed | PASS |
| Verificación BD | `privacyChecks: OK` |
| API | RUNNING en `:3000` |
| `/health` | 200 |
| `/health/db` | 200 |
| Swagger | READY en `/docs` |
| Expo | RUNNING con SDK 57 |
| Teléfono → API | PASS |
| Login `TI001` | PASS |

## 22. Script mental para presentar

```text
1. Enseñar la arquitectura.
2. Enseñar PostgreSQL y falcon_db.
3. Enseñar /health/db.
4. Enseñar Swagger.
5. Abrir la app.
6. Login.
7. Mostrar perfil y conteo de directorio.
8. Mostrar noticias.
9. Mostrar quejas y tracking en Swagger.
10. Mostrar offline/sync sólo si fue validado antes de la demo.
```

La prueba física completa A/B/C sigue pendiente mientras no exista evidencia de
ejecución con tres dispositivos. No la presentes como aprobada.

---

# Arranque rápido diario

Usa esta sección sólo si ya existen `.env`, `.env.local`, `falcon_db`,
migraciones y datos demo.

## Terminal 1 — API

```powershell
cd RUTA_DEL_REPO\backend
npm run dev
```

No copies literalmente `RUTA_DEL_REPO`: reemplázala por tu carpeta local.

Comprueba desde otra terminal:

```powershell
curl.exe -i http://127.0.0.1:3000/health
curl.exe -i http://127.0.0.1:3000/health/db
```

## Terminal 2 — Expo

1. Ejecuta `ipconfig` y confirma que la IP no cambió.
2. Revisa `frontend\.env.local`.
3. Desde `frontend`:

```powershell
cd RUTA_DEL_REPO\frontend
npx expo start --lan -c
```

4. Prueba `http://IP_DE_TU_PC:3000/health` en el teléfono.
5. Abre Expo Go compatible con SDK 57 y escanea el QR.

No repitas migraciones o seed diariamente salvo que el código de migraciones o
los datos demo hayan cambiado y el equipo lo indique.

---

# Solución de problemas

| Problema | Qué significa | Qué revisar |
| --- | --- | --- |
| `ECONNREFUSED 127.0.0.1:3000` | La API no está escuchando. | Vuelve a `backend` y ejecuta `npm run dev`. |
| `NoRouteToHostException` o `Host unreachable` | El teléfono no alcanza la IP de la PC. | IP actual, misma red, aislamiento Wi-Fi y firewall. |
| `/health = 200`, `/health/db != 200` | Express funciona, pero PostgreSQL no. | Servicio PostgreSQL, `falcon_db` y variables `DB_*`. |
| Expo dice SDK incompatible | Expo Go no coincide con SDK 57. | Instala en Android la versión compatible desde `expo.dev/go`; no actualices el proyecto por impulso. |
| Expo abre, pero login da `fetch failed` | La app no alcanza la API. | `EXPO_PUBLIC_API_URL` y `/health` desde el navegador del teléfono. |
| `password authentication failed for user postgres` | `DB_PASSWORD` local no coincide. | Corrige sólo el `.env` local; no cambies `pg_hba.conf`. |
| `database falcon_db does not exist` | La base vacía aún no fue creada. | Ejecuta el paso 6 y después las migraciones. |
| Migración o tabla `already exists` | Puede haber un esquema previo o una migración incompleta. | Revisa `schema_migrations`; no borres ni resetees inmediatamente. |
| Puerto 3000 ocupado | Otro proceso ya escucha en ese puerto. | Identifica el proceso antes de decidir qué hacer. |
| Tunnel tarda o se cierra | ngrok o la red externa tienen problemas. | Verifica Internet, servicio ngrok y vuelve a LAN/red privada si es posible. |

## Diagnosticar el puerto 3000 sin matar procesos a ciegas

```powershell
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$port3000 | Select-Object LocalAddress,LocalPort,OwningProcess
if ($port3000) { Get-Process -Id $port3000.OwningProcess }
```

No uses `Stop-Process` hasta saber qué aplicación es y confirmar que puede
cerrarse.

## Revisar las migraciones aplicadas

En pgAdmin Query Tool, conectado a `falcon_db`:

```sql
SELECT nombre, aplicado_en
FROM schema_migrations
ORDER BY nombre;
```

**DEBES VER:** `001_auth.sql`, `002_offline_sync.sql` y
`003_complaints_audit.sql`.

---

# Qué no hacer antes de una demo

```text
❌ actualizar Expo SDK sin necesidad
❌ actualizar dependencias "porque sí"
❌ cambiar el esquema el mismo día
❌ resetear una BD con datos importantes
❌ hacer merge de ramas viejas
❌ usar force push
❌ abrir PostgreSQL a la red
❌ mostrar secretos o tokens
❌ modificar JWT_SECRET durante la demo
❌ improvisar una migración
```

Nunca versiones:

```text
.env
.env.local
contraseñas
JWT_SECRET
DEMO_PASSWORD real
tokens
dumps de bases de datos
```

Antes de empezar la presentación, haz una ejecución completa del guion y
conserva un plan sin red: capturas sanitizadas o video previamente autorizado,
sin secretos ni información real.
