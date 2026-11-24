# Prueba física de FALCÓN con tres dispositivos Android

> **ESTADO: PENDIENTE DE EJECUCIÓN FÍSICA.** Esta guía describe el protocolo;
> no registra resultados ni declara la prueba como aprobada.

## Objetivo y alcance

La prueba demuestra que tres teléfonos Android pueden usar la misma API local,
trabajar con su propia copia SQLite, conservar una operación cuando la API no
está disponible y converger cuando el servicio regresa.

El alcance es exclusivamente el piloto local implementado:

- una PC host con PostgreSQL 18 y `falcon_db`;
- API Node.js + TypeScript + Express;
- frontend React Native/Expo en tres teléfonos físicos;
- sincronización de noticias sintéticas mediante caché y outbox;
- una red Wi-Fi privada y confiable.

No se prueba comunicación P2P, acceso directo desde los teléfonos a PostgreSQL
ni disponibilidad cuando el nodo central permanece apagado.

## Arquitectura observada

```text
                         PC HOST

              PostgreSQL 18 / falcon_db
                         ^
                         | 127.0.0.1:5432
                         | sólo loopback
                   API FALCÓN
          Node.js + TypeScript + Express :3000
                         ^
                         | Wi-Fi privada / HTTP
              +----------+----------+
              |          |          |
          Android A  Android B  Android C
            SQLite     SQLite     SQLite
          SecureStore SecureStore SecureStore
          caché/outbox caché/outbox caché/outbox
```

Cada teléfono tiene su propio `falcon_local.db`, con perfil, directorio,
noticias, metadata de sincronización y outbox. El JWT vigente se almacena en
SecureStore; las contraseñas no se guardan en SQLite. PostgreSQL es la fuente
central de verdad y sólo la API se comunica con él.

## Requisitos

- 1 PC host con PostgreSQL 18 y la base local `falcon_db` disponibles.
- Backend FALCÓN instalado y ejecutándose en TCP 3000.
- Frontend FALCÓN instalado y Metro ejecutándose en modo LAN.
- 3 teléfonos Android físicos, identificados como A, B y C.
- Expo Go, mientras siga siendo compatible con la versión actual del proyecto.
- Los cuatro equipos conectados a la misma Wi-Fi privada.
- La misma revisión de FALCÓN abierta en los tres teléfonos.
- Datos y cuentas dummy creados por el seed de desarrollo.
- Espacio para guardar capturas y una bitácora sin secretos.

ADB no es requisito para ejecutar esta prueba. Puede utilizarse como herramienta
opcional de diagnóstico, pero el flujo normal se realiza con Expo Go.

## Configuración de red y API

Desde un teléfono no se debe usar `localhost`: allí identifica al propio
teléfono, no a la PC host. El frontend debe apuntar a una IPv4 LAN genérica con
el formato:

```env
EXPO_PUBLIC_API_URL=http://192.168.X.X:3000
```

No versionar `.env.local` ni registrar la IP real de ningún integrante. Los tres
teléfonos deben apuntar exactamente a la misma URL durante una ejecución.

Para el piloto:

- la API es la única superficie accesible por LAN, en TCP 3000;
- la Wi-Fi debe estar clasificada como privada y ser de confianza;
- PostgreSQL permanece en `127.0.0.1:5432`/`::1:5432`;
- TCP 5432 nunca se abre para los teléfonos;
- no se usa una red pública, de invitados con aislamiento entre clientes ni un
  hotspot que bloquee la comunicación entre dispositivos.

Esta guía no modifica el firewall. Si TCP 3000 necesita una regla limitada al
perfil `Private`, revisar [Preparación del entorno local](../environment/LOCAL_DEVELOPMENT_SETUP.md#red-y-firewall).

## Datos y cuentas de prueba

Usar únicamente datos sintéticos de Fase 1.0. Nunca usar nombres, correos, CURP,
RFC, credenciales o información laboral reales.

El dataset reproducible se obtiene con los scripts existentes de `backend/`:

```powershell
npm run db:migrate
npm run db:seed
npm run db:verify
```

`db:seed` requiere que cada desarrollador establezca `DEMO_PASSWORD` localmente
para esa ejecución. La contraseña no tiene un valor fijo, no debe aparecer en
esta guía, Git, capturas, comandos compartidos ni bitácoras.

El seed crea cuentas `TI001` a `TI020`. Para esta prueba se recomienda usar
cuentas distintas:

| Dispositivo | Cuenta sugerida | Rol del seed | Uso |
| --- | --- | --- | --- |
| A | `TI005` | `editor_noticias` | Crear la noticia sintética |
| B | `TI001` | `administrador` | Observar la convergencia |
| C | `TI002` | `colaborador` | Observar la convergencia |

No cambiar roles sólo para aprobar la prueba. Evitar cerrar sesión durante el
escenario: `POST /auth/logout` incrementa la versión de token y revoca las
sesiones previas de esa cuenta. Las cuentas distintas aíslan ese efecto.

## Preparación común

1. Confirmar que PostgreSQL y `falcon_db` responden localmente en la PC.
2. Iniciar el backend con la configuración vigente y comprobar `/health` y
   `/health/db`.
3. Configurar la URL LAN genérica en el entorno local del frontend.
4. Iniciar Metro con `npx expo start --lan`.
5. Conectar A, B y C a la misma Wi-Fi privada que la PC.
6. Abrir la misma versión de FALCÓN en los tres teléfonos mediante Expo Go.
7. Iniciar sesión en cada teléfono con su cuenta dummy asignada.
8. Pulsar **Sincronizar ahora** en A, B y C y esperar que cada interfaz muestre
   `EN LÍNEA`.
9. Registrar hora, cuenta dummy, versión visible o evidencia equivalente y
   cualquier error, sin incluir tokens ni contraseñas.

La aplicación intenta sincronizar al establecer la sesión, cada 4 segundos y
al pulsar **Sincronizar ahora**. Cada llamada HTTP tiene un timeout de 5
segundos. Estos valores describen el código actual, pero no constituyen una
garantía de latencia para la red física.

## Prueba 1: conectividad A/B/C

**Objetivo:** confirmar que los tres teléfonos se comunican con la misma API.

1. Mantener PostgreSQL, backend y Metro activos.
2. Abrir FALCÓN en A, B y C.
3. Confirmar una sesión dummy vigente en cada dispositivo.
4. Ejecutar **Sincronizar ahora** en cada uno.
5. Verificar que los tres muestran datos de perfil, directorio y noticias.
6. Registrar hora, cuenta dummy y estado por dispositivo.

Resultado esperado:

```text
A: CONNECTED
B: CONNECTED
C: CONNECTED
```

Es `FAIL` si cualquier teléfono no alcanza la API común o no puede completar la
sincronización inicial después de descartar un problema local documentado.

## Prueba 2: sincronización online

**Objetivo:** demostrar que una noticia sintética creada en A llega a B y C.

La interfaz actual permite crear noticias desde roles `editor_noticias` y
`administrador`. La creación usa UUID, se guarda primero en SQLite y se envía
como `news/upsert` a `POST /sync/operations`.

1. Confirmar que A, B y C completaron la sincronización inicial.
2. En A, escribir un título y contenido inequívocamente sintéticos.
3. Pulsar **Guardar localmente** y registrar la hora de A.
4. Confirmar que A deja de mostrar `PENDIENTE DE SINCRONIZACIÓN` después de la
   respuesta exitosa.
5. Esperar el polling real o pulsar **Sincronizar ahora** en B y C.
6. Registrar la primera hora en que B muestra la noticia.
7. Registrar la primera hora en que C muestra la noticia.
8. Comparar UUID, contenido y versión en A, B y C mediante evidencia permitida.

Flujo esperado:

```text
A SQLite/outbox -> API -> PostgreSQL -> polling/refresco de B y C
```

`PASS` requiere el mismo UUID, contenido y versión lógica en los tres teléfonos.
Registrar el tiempo observado; no declarar un límite que el código no garantice.

## Prueba 3: caída de la API y lectura de caché

**Objetivo:** comprobar que una caída del backend no inutiliza inmediatamente
una sesión ya iniciada.

Precondición: los tres teléfonos deben estar sincronizados y conservar una
sesión que todavía no haya expirado.

1. Detener únicamente el backend. No detener PostgreSQL en este primer ensayo.
2. Cerrar FALCÓN en uno de los teléfonos y volver a abrirlo.
3. Confirmar que aparece `MODO OFFLINE`.
4. Consultar el perfil, directorio y noticias previamente sincronizados.
5. Registrar qué contenido permanece disponible y cualquier mensaje de error.

`PASS` requiere que la copia disponible en SQLite siga visible con una sesión
local vigente. Si la sesión expiró, el comportamiento correcto es solicitar un
nuevo login en línea; no se debe interpretar ese caso como validación de caché.

## Prueba 4: cambio offline y persistencia del outbox

**Objetivo:** demostrar que A conserva una creación permitida mientras la API
está detenida.

1. Mantener el backend detenido y la sesión vigente en A.
2. Con la cuenta editora/administradora de A, crear otra noticia sintética.
3. Confirmar `PENDIENTE DE SINCRONIZACIÓN` y registrar la hora.
4. Cerrar FALCÓN en A y volver a abrirlo.
5. Confirmar que la noticia continúa visible y pendiente.
6. Revisar B y C sin restaurar aún la API.

Resultado esperado:

- A conserva la noticia en `news_cache` y su operación en el outbox.
- Los reintentos fallidos no eliminan la operación pendiente.
- B y C **no** muestran todavía esa noticia.

### ¿Por qué B y C no reciben el cambio mientras la PC está apagada?

FALCÓN usa una arquitectura cliente-servidor. Con la API caída, A, B y C
trabajan de forma independiente con sus bases SQLite. No existe un nodo central
disponible que reciba y distribuya operaciones, y el piloto no implementa P2P o
mesh. A puede conservar cambios pendientes, pero B y C sólo los recibirán cuando
la API vuelva. Este comportamiento es correcto y no es un error de sincronización.

## Prueba 5: recuperación y convergencia

**Objetivo:** demostrar que los tres clientes convergen al restaurar la API.

1. Iniciar nuevamente el backend.
2. En A, esperar el siguiente ciclo o pulsar **Sincronizar ahora**.
3. Confirmar que A envía el outbox y desaparece el indicador pendiente.
4. Confirmar que el backend acepta la operación y PostgreSQL asigna versión.
5. En B y C, esperar el polling o pulsar **Sincronizar ahora**.
6. Comparar UUID, versión, contenido y timestamps observados.
7. Registrar el estado final de A, B, C y la evidencia permitida del backend.

`PASS` requiere que A, B, C y PostgreSQL terminen con el mismo estado lógico de
la noticia. Una respuesta `conflict` debe documentarse como tal: la política
actual es servidor gana y no debe ocultarse para forzar un resultado aprobado.

## Prueba 6: reinicio completo (opcional)

Ejecutar sólo después de aprobar las pruebas anteriores:

1. Sincronizar los tres teléfonos.
2. Detener backend y PostgreSQL.
3. Opcionalmente apagar la PC.
4. Abrir FALCÓN en los teléfonos con sesiones aún vigentes y revisar la caché.
5. Encender la PC, iniciar PostgreSQL y después el backend.
6. Sincronizar A, B y C y comprobar convergencia.

Estado de esta prueba: **OPCIONAL / PENDIENTE**.

## Login y sesión offline

- Una sesión ya guardada en SecureStore puede abrir la vista local mientras su
  `expiresAt` siga vigente.
- Al expirar, la aplicación elimina la sesión local y exige autenticación.
- Un login nuevo requiere conexión con `POST /auth/login`.
- FALCÓN no guarda ni valida contraseñas contra SQLite.

Por diseño:

```text
Sesión vigente offline: LIMITADAMENTE SOPORTADA
Nuevo login offline:    NO SOPORTADO
```

## Criterios PASS/FAIL

| Prueba | PASS | FAIL |
| --- | --- | --- |
| Conectividad A/B/C | Los tres teléfonos alcanzan la misma API y completan sincronización inicial. | Uno o más no alcanzan la API o no cargan el snapshot. |
| Sincronización online | B y C reciben la noticia confirmada por la API con el mismo UUID, contenido y versión. | El cambio confirmado se pierde, diverge o no llega a un cliente. |
| Caída y caché | Una sesión vigente reabre y muestra los datos previamente sincronizados desde SQLite. | La caché válida desaparece o la app queda inutilizable al caer la API. |
| Outbox offline | La noticia queda pendiente y sobrevive al reinicio de A. | La operación se pierde o se presenta como confirmada sin servidor. |
| Aislamiento durante caída | B y C no muestran el cambio antes de que vuelva la API. | Se afirma una sincronización inexistente o aparece contenido no confirmado. |
| Recuperación | El outbox se procesa y A/B/C/PostgreSQL convergen. | La operación se pierde, no converge o un conflicto queda oculto. |
| Login offline | La sesión vigente respeta su expiración y un login nuevo exige API. | Se valida una contraseña localmente o se conserva una sesión expirada. |
| Privacidad | Sólo se usan datos dummy y la evidencia no contiene secretos ni datos reales. | Se expone una contraseña, JWT, secreto, dato personal o credencial de base. |

Hasta realizar la prueba, todos los resultados físicos permanecen `PENDING`.

## Evidencias permitidas

Guardar, con timestamp y nombre genérico de ejecución:

- captura de A, B y C tras la sincronización inicial;
- captura de la noticia sintética creada;
- captura del indicador `PENDIENTE DE SINCRONIZACIÓN`;
- captura de A después de reabrir offline;
- capturas de A, B y C después de la recuperación;
- UUID y versión de la noticia sintética;
- horas observadas en A, B y C;
- estado HTTP o resultado sanitizado de la API;
- logs sanitizados sin secretos.

No guardar ni publicar:

- contraseñas, hashes, JWT, `DB_PASSWORD`, `JWT_SECRET` o archivos `.env`;
- CURP, RFC, correos, nombres u otros datos personales reales;
- SSID, IP LAN real, rutas personales o identificadores innecesarios;
- dumps de base de datos o cabeceras `Authorization`.

## Plantilla de ejecución

Copiar esta sección a una bitácora separada cuando se realice la prueba:

```text
## Ejecución

Fecha:
Responsables:
Revisión/commit probado:
PC host:
Red privada verificada: SÍ / NO

### Dispositivo A
Modelo:
Android:
Cuenta dummy:
Resultado: PASS / FAIL / PENDING

### Dispositivo B
Modelo:
Android:
Cuenta dummy:
Resultado: PASS / FAIL / PENDING

### Dispositivo C
Modelo:
Android:
Cuenta dummy:
Resultado: PASS / FAIL / PENDING

### Sincronización A -> B
PASS / FAIL / PENDING

### Sincronización A -> C
PASS / FAIL / PENDING

### Offline y caché
PASS / FAIL / PENDING

### Outbox
PASS / FAIL / PENDING

### Recuperación
PASS / FAIL / PENDING

UUID sintético:
Versión final:
Hora A:
Hora B:
Hora C:

### Observaciones

### Evidencias sanitizadas
```

## Estado actual

| Elemento | Estado |
| --- | --- |
| Documentación | **READY** |
| Implementación automática | **VALIDADA** |
| Prueba física A/B/C | **PENDING** |

No cambiar `PENDING` a `PASS` hasta completar la ejecución física y revisar sus
evidencias.

## Documentos relacionados

- [Escenario resumido de sincronización con tres dispositivos](THREE_DEVICE_SYNC_TEST.md)
- [Prueba de caída y recuperación offline](OFFLINE_RECOVERY_TEST.md)
- [Arquitectura offline-first](../architecture/OFFLINE_FIRST_ARCHITECTURE.md)
- [Arquitectura de la API local](../architecture/LOCAL_API_ARCHITECTURE.md)
- [Referencia de la API local](../api/README_API_LOCAL_FALCON.md)
