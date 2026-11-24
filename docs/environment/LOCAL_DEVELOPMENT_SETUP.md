# Preparación del entorno local FALCÓN

## Requisitos validados

- Node.js 24 LTS y npm 11.
- PostgreSQL 18 con la base `falcon_db`.
- Expo SDK 57, React Native 0.86 y teléfono Android físico.
- Git, VS Code y, opcionalmente, Postman.

## Instalación reproducible

```powershell
git clone https://github.com/AraHdzRey/falcon-app.git
cd falcon-app

cd backend
npm ci
npm run db:migrate
$env:DEMO_PASSWORD = Read-Host 'Contraseña dummy temporal'
npm run db:seed
npm run db:verify
Remove-Item Env:DEMO_PASSWORD
npm run typecheck
npm run lint
npm run build
npm test

cd ..\frontend
npm ci
npx expo install --check
npx expo-doctor
npm run typecheck
npm run lint
npm test
```

No ejecutar `npm audit fix --force`: el remedio ofrecido para dependencias
transitivas de Expo implica una regresión mayor de SDK.

Antes de migrar, crear `falcon_db` y configurar `backend/.env`. Para pruebas
destructivas usar exclusivamente `falcon_test`, `NODE_ENV=test` y
`backend/.env.test.example` como referencia. El procedimiento completo,
incluidos reset, pruebas con PostgreSQL real, backup y restore, está en
[`README_DATABASE.md`](../database/README_DATABASE.md).

## Configuración

Copiar los ejemplos, sin versionar los archivos resultantes:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
git check-ignore backend\.env frontend\.env.local
```

En backend, `DB_HOST` permanece en `127.0.0.1`. En frontend, obtener la IPv4
del adaptador Wi-Fi activo con `ipconfig` y configurar una sola variable:

```env
EXPO_PUBLIC_API_URL=http://192.168.X.X:3000
```

Nunca usar `localhost` desde el teléfono: allí se refiere al propio teléfono.

## Orden de arranque

1. Confirmar `Get-Service postgresql*`.
2. En `backend/`, ejecutar `npm run db:migrate`, `npm run build` y luego
   `npm start`.
3. Verificar `curl.exe http://127.0.0.1:3000/health`.
4. Verificar `curl.exe http://127.0.0.1:3000/health/db`.
5. En `frontend/`, ejecutar `npx expo start --lan`.
6. Abrir Expo Go en el teléfono físico y comprobar login/logout.

No guardar la contraseña de PostgreSQL en comandos. Usar un `.env` local
ignorado o una consola que la solicite con `Read-Host -AsSecureString`.

## Red y firewall

La API escucha en `0.0.0.0:3000`; PostgreSQL sólo en loopback. Antes de abrir
el puerto, la red Wi-Fi debe estar clasificada como `Private`. Un administrador
puede crear, sólo si la prueba desde el teléfono lo requiere:

```powershell
New-NetFirewallRule -DisplayName 'FALCON API local TCP 3000' `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 `
  -Profile Private
```

No crear una regla para 5432 ni usar perfil `Public`/`Any`.

## ADB

Usar directamente el ADB actual del SDK:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices -l
```

Si se desea corregir el PATH de máquina, abrir PowerShell como administrador y
ejecutar, tras revisar el valor actual:

```powershell
$sdkAdb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools"
$machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
$parts = $machinePath -split ';' | Where-Object { $_ -and $_ -ne $sdkAdb }
[Environment]::SetEnvironmentVariable('Path', ($sdkAdb + ';' + ($parts -join ';')), 'Machine')
```

Esto evita el `C:\Windows\adb.exe` antiguo sin borrarlo.

## Uso de RAM

Durante la demo mantener sólo VS Code, backend, Metro y el teléfono. Cerrar
Android Emulator, Docker, Android Studio, pgAdmin y Postman cuando no sean
necesarios. PostgreSQL puede detenerse al terminar el trabajo de backend, pero
no cambiar su tipo de inicio durante esta fase.
