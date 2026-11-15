# Prueba de sincronización con tres dispositivos

Estado actual: **PENDIENTE DE EJECUCIÓN FÍSICA**. El 14 de noviembre de 2026
ADB no detectó teléfonos; no se simulan resultados.

## Preparación

1. Conectar A, B y C a la misma Wi-Fi que la PC.
2. Clasificar esa Wi-Fi como `Private` y permitir sólo TCP 3000/Private.
3. Mantener PostgreSQL, API y Metro activos; no usar emuladores.
4. Configurar `EXPO_PUBLIC_API_URL=http://192.168.1.75:3000`.
5. Abrir el proyecto en Expo Go y autenticar `TI001` personalmente.

## Consistencia online

| Paso | A | B | C | Evidencia |
| --- | --- | --- | --- | --- |
| Sincronización inicial | Pendiente | Pendiente | Pendiente | hora/version |
| Crear noticia sintética en A | Pendiente | — | — | UUID/outbox |
| API confirma 2xx | Pendiente | — | — | resultado `applied` |
| Polling recibe en B | — | Pendiente | — | tiempo transcurrido |
| Polling recibe en C | — | — | Pendiente | tiempo transcurrido |

Esperado: A, B y C muestran el mismo UUID y contenido en 2–5 segundos después
de que la API confirma. No usar datos personales.

## Registro

- Dispositivo A: no conectado.
- Dispositivo B: no conectado.
- Dispositivo C: no conectado.
- Cambio A → B: NO EJECUTADO.
- Cambio A → C: NO EJECUTADO.
