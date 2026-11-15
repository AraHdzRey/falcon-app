# Toolchain final FALCÓN — Fase 0.9

Fecha de corte: 14 de noviembre de 2026.

| Herramienta | Antes | Después | Estado |
| --- | --- | --- | --- |
| Git | 2.51.0 | 2.56.0.windows.4 | Actualizado |
| Git Credential Manager | 2.6.1 | 2.9.1 | Actualizado |
| GitHub CLI | 2.102.0 | 2.104.0 | Actualizado, sin login automático |
| Node.js | 24.16.0 | 24.22.3 LTS | Compatible con Expo 57 |
| npm / npx | 11.13.0 | 11.19.1 | Compatible con Node 24 |
| VS Code | 1.139.1 | 1.146.0 Stable | Actualizado |
| Android Studio | 2024.2 | 2024.2 | Actualización Stable detectada; pendiente de confirmación visual |
| Android SDK Platform | 34 | 34 y 36 | Platform 36 instalada |
| Build Tools | 34/35 | 34/35/36.0.0 | 36.0.0 instalada |
| Platform Tools | 35.0.2 | 35.0.2 | 37.0.1 disponible; reemplazo bloqueado por `adb.exe` |
| ADB efectivo por PATH | `C:\Windows\adb.exe` 1.0.40 | Igual | Usar ruta explícita del SDK; PATH pendiente de admin |
| ADB del SDK | 1.0.41 / 35.0.2 | Igual | Funcional, sin teléfonos conectados |
| Java/JBR | 21.0.3 | 21.0.3 | Compatible |
| PostgreSQL / psql | 18.6 | 18.7 | Validado; no reinstalar ni actualizar |
| pgAdmin | 9.18 | 9.19 | Actualizado |
| Postman | 12.16.0 | 12.36.4 | Actualizado |
| curl | no registrado | 8.22.0 | Funcional |

## Matriz móvil

- Expo `57.0.33`.
- React Native `0.86.3`.
- React `19.2.3`.
- TypeScript `6.0.3`.
- Node mínimo oficial de Expo 57: `22.13.x`; Node 24 LTS satisface el mínimo.
- Expo 57 usa `compileSdkVersion` y `targetSdkVersion` 36.
- Módulos instalados mediante `npx expo install`:
  - `expo-sqlite ~57.0.5`;
  - `expo-secure-store ~57.0.4`;
  - `expo-crypto ~57.0.4`.

## Extensiones de VS Code

Necesarias o útiles para FALCÓN: Error Lens, Code Spell Checker, TODO Tree,
Version Lens, Java/Gradle y las herramientas integradas de TypeScript/Git.

Prescindibles durante FALCÓN, sin desinstalarlas: AWS Toolkit/Q, Cloud Code,
Flutter/Dart, PHP, Django, Jupyter, C/C++, F#, Spring Boot, Claude y Gemini.
Mantenerlas cerradas o deshabilitadas por workspace si la RAM resulta crítica.

## PostgreSQL

`postgresql-x64-18` está `Running`, `localhost:5432` responde y `falcon_db`
acepta conexión. `pg_hba.conf` permanece en `scram-sha-256`; no volver a
modificarlo en esta fase. La comprobación final muestra PostgreSQL escuchando
sólo en `127.0.0.1:5432`; no está expuesto a la LAN.

## Memoria observada

| Medición | Inicial | Final |
| --- | ---: | ---: |
| RAM física total | 6.90 GiB | 6.90 GiB |
| RAM disponible | 0.72 GiB | 1.62 GiB |
| RAM usada | 6.19 GiB | 5.28 GiB |

La disponibilidad observada aumentó 0.90 GiB mientras se estabilizaron las
cargas. No se deshabilitó ningún servicio ni se cerró software del usuario, por
lo que se registra como variación del conjunto de trabajo y no como capacidad
física añadida. Los mayores consumidores finales fueron Memory Compression,
ChatGPT, Android Studio, Defender y Chrome. El equipo conserva 6.90 GiB
utilizables; ampliar RAM sigue siendo la mejora de hardware recomendada.

## Pendientes con privilegios

No se cambió el PATH. Para priorizar ADB del SDK, revisar y ejecutar como
administrador las instrucciones de `LOCAL_DEVELOPMENT_SETUP.md`.

La red Wi-Fi actual está clasificada como `Public` y hay reglas genéricas de
Node para ese perfil. Antes de la prueba física debe cambiarse a `Private` y
usarse una regla específica TCP 3000/Private, previa autorización del usuario.
