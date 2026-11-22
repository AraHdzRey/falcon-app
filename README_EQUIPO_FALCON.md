# FALCÓN — GUÍA OBLIGATORIA PARA TODO EL EQUIPO

Este documento explica de forma directa cómo trabajar en Proyecto FALCÓN.

Antes de modificar código, base de datos, frontend o backend, leer este archivo completo.

---

# 1. Rama oficial del proyecto

La rama base actual es:

```text
integration/falcon-unified-api
```

TODOS los trabajos nuevos deben partir de esta rama.

No trabajar directamente sobre:

```text
master
integration/local-api-login
feature/database-dev-seed
feature/falcon-noticias-service
feature/falcon-gateway-infra
feature/sesion-web-falcon
```

Estas ramas contienen fases anteriores, experimentos o trabajo histórico.

Pueden consultarse como referencia, pero no deben utilizarse como base de nuevos desarrollos.

---

# 2. Regla principal

Antes de programar:

```bash
git fetch origin
git switch integration/falcon-unified-api
git pull origin integration/falcon-unified-api
```

Después crear TU rama:

```bash
git switch -c feature/nombre-de-tu-funcionalidad
```

Ejemplos:

```text
feature/ui-directorio
feature/ui-perfil
feature/noticias-mejoras
feature/catalogo-areas
feature/administracion-usuarios
```

Nunca desarrollar directamente sobre la rama de integración.

---

# 3. Arquitectura oficial de FALCÓN

FALCÓN utiliza una arquitectura de tres capas.

```text
┌──────────────────────────────┐
│ CAPA 1 — PRESENTACIÓN        │
│ React Native + Expo          │
│ frontend/                    │
└─────────────┬────────────────┘
              │
              │ HTTP / REST / JSON
              ▼
┌──────────────────────────────┐
│ CAPA 2 — LÓGICA DE NEGOCIO   │
│ Node.js + TypeScript         │
│ Express                      │
│ backend/                     │
└─────────────┬────────────────┘
              │
              │ PostgreSQL / pg
              ▼
┌──────────────────────────────┐
│ CAPA 3 — DATOS               │
│ PostgreSQL                   │
│ falcon_db                    │
└──────────────────────────────┘
```

El frontend NO se conecta directamente a PostgreSQL.

Toda operación debe pasar por la API.

PostgreSQL tampoco contiene la lógica de las pantallas. La API representa la
capa de negocio y funciona como intermediaria entre la presentación y la
persistencia.

Las tres capas pueden ejecutarse físicamente en una misma computadora cuando
existan limitaciones técnicas o económicas. Lo importante es que mantengan sus
responsabilidades separadas y se comuniquen mediante interfaces definidas.

---

# 3.1 Qué está evaluando el director

La revisión académica evalúa principalmente:

- arquitectura de tres capas;
- separación entre presentación, lógica de negocio y persistencia;
- desacoplamiento entre capas;
- escalabilidad;
- respeto a las interfaces entre componentes;
- reglas de negocio;
- evidencia y validación de los avances;
- diseño funcional pensando en el usuario y en futuros cambios.

No basta con que una pantalla o consulta funcione de manera aislada. Debe
entenderse dónde pertenece, cómo se comunica con las demás capas y cómo puede
evolucionar sin obligar a reconstruir todo el sistema.

---

# 3.2 Regla de comunicación: no saltarse capas

El flujo autorizado es:

```text
Frontend → API → Persistencia
```

No hacer:

```text
Frontend → PostgreSQL
```

Cada capa debe comunicarse mediante la interfaz correspondiente. Un flujo
completo puede verse así:

```text
Pantalla
↓
endpoint REST
↓
servicio / regla de negocio
↓
repository
↓
PostgreSQL
```

La finalidad es que una capa no dependa directamente de los detalles internos
de otra. El frontend conoce el contrato HTTP de la API, pero no necesita conocer
tablas, queries ni credenciales de PostgreSQL.

---

# 3.3 Desacoplamiento y cambio de motor de datos

Actualmente:

```text
Expo
↓
API
↓
PostgreSQL
```

Si en el futuro la organización decidiera cambiar PostgreSQL por otro motor, el
objetivo arquitectónico sería conservar la interfaz y las reglas de negocio:

```text
Expo
↓
misma API / mismo contrato
↓
otro motor de BD
```

El usuario no debería necesitar una interfaz nueva ni tendría que rehacerse todo
el sistema. El cambio debe concentrarse principalmente en la implementación o
adaptador de persistencia:

```text
Service
↓
Repository / interfaz de persistencia
↓
PostgresRepository
```

En otro escenario:

```text
Service
↓
Repository / misma interfaz
↓
OtroRepository
```

Esto NO significa que sustituir PostgreSQL sea automático. Un cambio real de
motor requiere adaptar la persistencia, revisar compatibilidad y migrar los
datos. Desacoplar significa evitar que ese cambio obligue también a reconstruir
el frontend y todas las reglas de negocio.

---

# 4. Estructura del proyecto

## `frontend/`

Contiene la aplicación móvil.

Tecnologías principales:

```text
React Native
Expo
TypeScript
SQLite
SecureStore
```

Aquí se encuentran:

- pantallas;
- navegación;
- componentes;
- conexión con la API;
- almacenamiento local;
- caché offline;
- outbox;
- sesión local.

Las pantallas nuevas deben agregarse aquí.

---

## `backend/`

Contiene la API y las reglas de negocio.

Tecnologías:

```text
Node.js
TypeScript
Express
PostgreSQL / pg
```

Aquí están los módulos de:

```text
Auth
Directorio
Administración
Noticias
Quejas
Auditoría
Sincronización
```

El backend es la única capa autorizada para comunicarse directamente con PostgreSQL.

---

# 4.1 Reglas de negocio

Las reglas críticas deben permanecer principalmente en el backend. Por ejemplo:

- autorización;
- roles;
- validaciones;
- estados;
- publicación;
- permisos;
- seguimiento de quejas;
- reglas de administración.

La pantalla puede validar datos para ayudar al usuario, pero no debe ser el único
lugar donde se apliquen permisos o reglas importantes. La API debe volver a
validarlas antes de consultar o modificar información.

---

## `backend/migrations/`

Contiene las migraciones de PostgreSQL.

Las migraciones permiten que todos podamos reconstruir la misma estructura de BD.

Actualmente existen como mínimo:

```text
001_auth.sql
002_offline_sync.sql
003_complaints_audit.sql
```

NO editar una migración publicada.

Si se necesita modificar el esquema se crea una nueva:

```text
004_nombre_cambio.sql
005_otro_cambio.sql
...
```

Antes de crear un número de migración, verificar que otro integrante no esté usando el mismo.

---

## `backend/src/scripts/`

Contiene herramientas para:

- migraciones;
- seeds;
- verificación;
- pruebas de PostgreSQL;
- preparación del entorno.

No crear scripts duplicados si ya existe uno que cumple la función.

---

## `docs/`

Contiene documentación técnica y de colaboración.

Los documentos deben mantenerse alineados con el código realmente implementado.

---

# 5. Base de datos oficial

La base oficial se llama:

```text
falcon_db
```

Motor:

```text
PostgreSQL
```

Schema:

```text
public
```

Cada integrante tendrá su propia instancia LOCAL de PostgreSQL.

Por ejemplo:

```text
PC A
└── falcon_db

PC B
└── falcon_db

PC C
└── falcon_db
```

No es literalmente la misma instancia física.

Lo que debe ser igual para todos es:

```text
mismo esquema
mismas migraciones
mismos nombres de tablas
mismas relaciones
mismo contrato de API
```

Las migraciones y seeds de Git permiten reconstruir la BD correctamente.

---

# 6. Modelo de identidad oficial

El modelo actual utiliza:

```text
colaboradores
usuarios
roles
usuario_roles
```

No crear nuevamente:

```text
empleados
cuentas_acceso
usuarios_falcon
users2
roles_nuevos
```

ni estructuras equivalentes.

Existe UNA identidad oficial.

Conceptualmente:

```text
colaboradores
      │
      ▼
usuarios
      │
      ▼
usuario_roles
      │
      ▼
roles
```

---

# 7. La BD de Ara

Los datos existentes en la BD de Ara NO tienen que perderse.

Pero su estructura debe adaptarse al modelo oficial de FALCÓN.

Regla:

```text
NO adaptamos la API a cada BD vieja.

Las BD anteriores se adaptan
al modelo actual de FALCÓN.
```

Por ejemplo:

```text
BD anterior                  MODELO FALCÓN

empleados          ────────► colaboradores

cuentas_acceso     ────────► usuarios

rol en una columna ────────► roles
                              +
                              usuario_roles

codigoEmpleado     ────────► numero_empleado
```

Los datos útiles se conservan.

Las tablas duplicadas no.

---

# 8. Procedimiento para adaptar la BD de Ara

Primero NO borrar ni modificar la BD original.

Se utiliza como fuente.

## Paso 1

Inventariar sus tablas.

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## Paso 2

Revisar columnas.

```sql
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

## Paso 3

Clasificar cada tabla:

```text
YA EXISTE EN FALCÓN
→ adaptar datos.

TIENE EQUIVALENTE
→ mapear columnas.

ES INFORMACIÓN NUEVA ÚTIL
→ evaluar nueva migración.

DUPLICA UNA FUNCIÓN EXISTENTE
→ no crear otra tabla.
```

## Paso 4

Migrar los datos útiles hacia `falcon_db`.

## Paso 5

Verificar que la API siga funcionando.

---

# 9. No crear otra base de datos para cada módulo

No hacer:

```text
falcon_db

noticias_db

usuarios_db

quejas_db

ara_db

antonio_db
```

sin que exista previamente una decisión de arquitectura aprobada por el equipo.

Actualmente la fuente central es:

```text
falcon_db
```

---

# 10. Noticias

La API actual ya tiene un módulo de noticias.

Antes de integrar cualquier trabajo viejo de Noticias:

1. comparar funcionalidad;
2. revisar endpoints;
3. revisar JWT;
4. revisar permisos;
5. revisar PostgreSQL;
6. revisar tests;
7. portar únicamente lo que aporte valor.

No hacer un merge completo de una rama vieja solamente porque contiene un directorio:

```text
services/noticias/
```

Un servicio separado sólo se implementará si existe una decisión técnica concreta.

---

# 11. ¿Qué hago si ya hice trabajo en una rama vieja?

NO lo borres.

NO lo mezcles tú mismo con `integration/falcon-unified-api`.

Primero súbelo a una rama claramente identificada.

Ejemplo:

```text
feature/noticias-mi-version
```

Después avisa:

```text
Mi trabajo está en:
feature/noticias-mi-version
```

Se revisará el diff y se migrará únicamente lo necesario.

---

# 12. Instalar el proyecto por primera vez

Clonar:

```bash
git clone https://github.com/AraHdzRey/falcon-app.git
cd falcon-app
```

Cambiar a la rama oficial:

```bash
git switch integration/falcon-unified-api
git pull
```

---

# 13. Backend

Entrar:

```bash
cd backend
```

Instalar dependencias:

```bash
npm ci
```

Consultar los scripts disponibles:

```bash
npm run
```

Usar la versión de Node/npm indicada por el proyecto.

---

# 14. Variables de entorno backend

Usar el archivo de ejemplo existente.

Nunca subir secretos reales a Git.

Variables típicas:

```text
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=falcon_db
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_LOCAL

JWT_SECRET=TU_SECRET_LOCAL
```

Cada integrante utiliza sus propias credenciales locales.

---

# 15. Preparar PostgreSQL

PostgreSQL debe estar instalado y funcionando localmente.

La aplicación utiliza:

```text
127.0.0.1:5432
```

PostgreSQL NO debe abrirse directamente al celular.

---

# 16. Aplicar migraciones

Desde `backend/` utilizar el script real:

```bash
npm run db:migrate
```

---

# 17. Cargar datos de desarrollo

Si necesitas datos sintéticos:

```bash
npm run db:seed
```

Verificar:

```bash
npm run db:verify
```

NO ejecutar `db:reset` sobre una BD con datos que quieras conservar.

---

# 18. Levantar API

Desde:

```text
backend/
```

ejecutar:

```bash
npm run dev
```

La API normalmente utiliza:

```text
http://127.0.0.1:3000
```

---

# 19. Swagger

Con la API activa:

```text
http://127.0.0.1:3000/docs
```

OpenAPI:

```text
http://127.0.0.1:3000/openapi.json
```

Antes de inventar un endpoint, revisar Swagger.

---

# 20. Frontend

Entrar:

```bash
cd frontend
```

Instalar:

```bash
npm ci
```

Levantar:

```bash
npx expo start
```

o el script equivalente definido en `package.json`.

---

# 21. URL de API en celular físico

En un teléfono físico NO usar:

```text
127.0.0.1:3000
localhost:3000
```

porque eso apunta al propio teléfono.

Debe configurarse:

```text
EXPO_PUBLIC_API_URL=http://IP_DE_LA_PC:3000
```

Ejemplo conceptual:

```text
EXPO_PUBLIC_API_URL=http://192.168.X.X:3000
```

La IP depende de la red actual.

---

# 21.1 Sincronización y trabajo offline

Cuando existe conexión:

```text
Dispositivo
↓
API
↓
PostgreSQL
```

Cuando un dispositivo queda sin conexión, puede consultar información que ya se
encuentre almacenada en SQLite y mantener operaciones permitidas como pendientes
mediante el mecanismo offline/outbox.

Los teléfonos NO se sincronizan directamente entre ellos. No existe:

```text
A ↔ B ↔ C
```

La convergencia ocurre por medio de la API y la fuente central:

```text
A ─┐
B ─┼─→ API → PostgreSQL
C ─┘
```

Durante la revisión se planteó una sincronización periódica para la simulación.
El intervalo efectivo depende de la configuración o implementación actual; no se
debe afirmar un valor exacto sin verificar primero el código.

---

# 22. Flujo correcto de desarrollo

Siempre:

```text
integration/falcon-unified-api
            │
            ▼
feature/mi-funcionalidad
            │
            ▼
trabajo
            │
            ▼
commit
            │
            ▼
push
            │
            ▼
Pull Request
            │
            ▼
revisión
            │
            ▼
integration/falcon-unified-api
```

---

# 23. Antes de comenzar a trabajar

Ejecutar:

```bash
git switch integration/falcon-unified-api
git pull origin integration/falcon-unified-api
git switch -c feature/mi-trabajo
```

---

# 24. Al terminar

Ver:

```bash
git status
```

Agregar únicamente los archivos de tu funcionalidad:

```bash
git add archivo1 archivo2
```

Commit:

```bash
git commit -m "feat: descripcion corta"
```

Push:

```bash
git push -u origin feature/mi-trabajo
```

Después crear Pull Request.

---

# 25. NO hacer merge por tu cuenta

No ejecutar:

```bash
git merge
```

hacia la rama oficial sin revisión.

No hacer push directo sobre:

```text
integration/falcon-unified-api
```

---

# 26. Si Git muestra conflictos

DETENERSE.

No aceptar automáticamente:

```text
Accept Current
Accept Incoming
Accept Both
```

sin entender qué contiene cada versión.

No pedirle a una IA:

```text
"arregla todos mis conflictos"
```

sin explicar qué rama es la oficial.

Reportar:

```text
rama actual
rama base
archivos con conflicto
```

antes de continuar.

---

# 27. Reglas que NO se deben romper

```text
❌ No crear otro backend.

❌ No crear otro sistema de autenticación.

❌ No crear otra tabla de usuarios equivalente.

❌ No crear otra BD sin aprobación.

❌ No cambiar nombres de endpoints unilateralmente.

❌ No modificar migraciones ya publicadas.

❌ No trabajar desde master.

❌ No mezclar ramas antiguas completas.

❌ No subir passwords.

❌ No subir JWT_SECRET.

❌ No conectar Expo directamente a PostgreSQL.

❌ No modificar arquitectura únicamente para hacer pasar una demo.
```

---

# 28. Qué SÍ se puede hacer

```text
✅ Crear pantallas.

✅ Mejorar componentes.

✅ Agregar funcionalidades al backend existente.

✅ Crear endpoints nuevos cuando sean necesarios.

✅ Crear migraciones nuevas.

✅ Agregar tests.

✅ Mejorar documentación.

✅ Adaptar trabajo previo al modelo actual.

✅ Crear Pull Requests.

✅ Proponer cambios de arquitectura antes de implementarlos.
```

---

# 28.1 ¿Cuándo se considera terminada una funcionalidad?

Una funcionalidad NO se considera terminada solamente porque funcione en la
computadora de quien la desarrolló. Para considerarla lista debe existir como
mínimo:

```text
Código identificable
+
rama / commit
+
forma de reproducirlo
+
pruebas o evidencia
+
compatibilidad con la arquitectura oficial
+
validación
```

Además, debe:

- partir de la rama oficial;
- respetar la arquitectura;
- utilizar el modelo oficial de datos;
- no duplicar componentes existentes;
- poder reproducirse;
- tener evidencia verificable;
- integrarse mediante el flujo de Git definido por el equipo.

```text
“Mi IA dice que funciona”
```

no constituye por sí solo evidencia de integración. La evidencia válida puede
incluir:

- pruebas automatizadas;
- resultados de endpoints;
- ejecución reproducible;
- capturas cuando correspondan;
- Swagger;
- consultas verificables;
- commit y rama;
- validación del equipo.

---

# 28.2 Diferenciar los estados del trabajo

No significan lo mismo:

```text
REQUERIDO
≠
PROPUESTO
≠
IMPLEMENTADO
≠
VALIDADO
```

**REQUERIDO:** lo solicitado por el director, la empresa o la documentación.

**PROPUESTO:** una solución planteada por el equipo que todavía puede no existir.

**IMPLEMENTADO:** existe código para esa funcionalidad.

**VALIDADO:** la implementación fue ejecutada y comprobada mediante evidencia.

Nunca presentar una propuesta o una implementación sin probar como si ya hubiera
sido validada.

---

# 28.3 Los dos diagramas solicitados

Para la siguiente revisión se requieren dos diagramas diferentes.

## Diagrama funcional o del sistema

Debe enfocarse en:

- perfiles: Usuario, Administrador y TI;
- interfaces disponibles;
- funciones;
- interacción;
- paso de información o parámetros.

No debe centrarse en servidores o tecnologías.

## Diagrama técnico o de implementación

Debe mostrar:

- frontend;
- API y backend;
- PostgreSQL;
- servidores y dispositivos;
- lenguajes y frameworks;
- protocolos y herramientas;
- conexiones entre componentes.

Debe dejar clara la separación entre presentación, lógica de negocio y datos.

---

# 29. Preguntas frecuentes

## ¿Cuál es la rama oficial?

```text
integration/falcon-unified-api
```

---

## ¿Puedo trabajar desde master?

No.

`master` contiene una versión histórica del proyecto.

---

## ¿Por qué no puedo seguir usando mi rama vieja?

Porque las ramas anteriores pueden tener:

- otra estructura;
- otro frontend;
- otro backend;
- otro modelo de usuarios;
- otra autenticación;
- otro esquema de BD;
- otros endpoints.

Tu trabajo no se pierde.

Se adapta a la rama actual.

---

## ¿FALCÓN es monolítico?

FALCÓN se diseña como una arquitectura de tres capas desacopladas:

```text
Frontend
↓
API
↓
PostgreSQL
```

La capa de negocio actualmente se despliega mediante una API modular única. No
se debe afirmar que tener un solo proceso Express convierte automáticamente a
todo el sistema en un monolito. La evaluación debe considerar la separación de
presentación, negocio y persistencia, así como las interfaces entre ellas.

Actualmente los módulos internos incluyen:

```text
Auth
Directorio
Noticias
Quejas
Administración
Auditoría
Sync
```

---

## ¿Tenemos que usar microservicios?

No necesariamente.

Los microservicios se utilizarán únicamente cuando exista una razón técnica real para separar físicamente un módulo.

No se crea un microservicio solamente para decir que el proyecto usa microservicios.

---

## ¿Tener otro puerto significa que ya tenemos microservicios?

No.

Tener procesos en diferentes puertos no demuestra por sí solo una arquitectura
de microservicios. La separación debe responder a responsabilidades, contratos,
despliegue y una razón técnica o funcional concreta.

---

## ¿Entonces por qué existe una API?

La API representa la capa de lógica de negocio.

Centraliza:

- autenticación;
- permisos;
- validaciones;
- reglas;
- acceso a datos;
- comunicación con PostgreSQL.

Esto evita que cada dispositivo implemente sus propias reglas.

---

## ¿Dónde está la base de datos?

En PostgreSQL.

La base se llama:

```text
falcon_db
```

Node.js NO es la base de datos.

Node.js ejecuta la API.

---

## ¿Si cambiamos PostgreSQL tenemos que rehacer la app?

No debería ser necesario rehacer la interfaz ni las reglas de negocio si el
acceso a persistencia está correctamente encapsulado.

Sí será necesario adaptar la implementación de persistencia y realizar la
migración técnica de datos correspondiente. El cambio no es automático; el
desacoplamiento evita que obligue a reconstruir todas las capas.

---

## ¿El celular se conecta a PostgreSQL?

No.

El flujo es:

```text
Celular
↓
API
↓
PostgreSQL
```

Nunca:

```text
Celular
↓
PostgreSQL
```

---

## ¿Todos tenemos que usar la misma BD?

Todos deben tener el mismo MODELO.

Cada integrante puede tener una `falcon_db` local.

Las migraciones hacen que las estructuras sean reproducibles.

---

## ¿Podemos usar la BD de Ara?

Sí.

Sus datos pueden conservarse.

Pero deben adaptarse al modelo oficial de FALCÓN.

No se debe modificar toda la API para volver a un modelo anterior.

---

## ¿Qué pasa si mi tabla ya existe?

No crear otra.

Adaptar los datos a la tabla oficial.

---

## ¿Qué pasa si necesito una tabla nueva?

Proponerla.

Si es necesaria:

crear una nueva migración versionada.

---

## ¿Qué pasa si necesito agregar una categoría?

Preferir catálogos dinámicos.

Ejemplo:

```text
categorias_queja
```

En lugar de programar categorías directamente en botones o condicionales.

Así se pueden agregar opciones sin recompilar toda la aplicación.

---

## ¿Qué significa parametrizar?

Significa evitar valores rígidos en el código cuando pueden venir de datos o configuración.

Ejemplo:

```text
categorías
áreas
roles
estados
```

deben poder administrarse mediante catálogos cuando corresponda.

---

## ¿La API maneja parámetros?

Sí.

Ejemplos:

Query parameter:

```text
/directory?area=TI
```

Path parameter:

```text
/recurso/:id
```

Body:

```json
{
  "employeeId": "...",
  "password": "..."
}
```

Además PostgreSQL utiliza queries parametrizadas para no concatenar directamente datos de usuario en SQL.

---

## ¿Qué pasa si A publica algo y B/C están conectados?

Conceptualmente:

```text
A
↓
API
↓
PostgreSQL
↓
B / C sincronizan
```

B y C reciben el cambio cuando realizan su proceso de sincronización.

---

## ¿Qué pasa si A está offline?

La operación permitida puede quedar en el outbox local.

```text
A offline
↓
SQLite / outbox
↓
pendiente
```

B y C todavía no reciben ese cambio.

Cuando A recupera conexión:

```text
outbox
↓
API
↓
PostgreSQL
↓
B / C
```

---

## ¿Los teléfonos se sincronizan directamente?

No.

No existe:

```text
A ↔ B
B ↔ C
```

La sincronización pasa por la API central.

---

## ¿Que funcione en mi PC significa que ya está integrado?

No.

Debe poder reproducirse desde la rama y commits identificados, respetar la
arquitectura oficial y contar con pruebas o evidencia verificable por el equipo.

---

## ¿Debemos tener las mismas terminales abiertas?

No.

No importa qué ventana de PowerShell utilice cada persona.

Lo importante es tener:

```text
misma rama base
misma estructura
mismas migraciones
mismo contrato OpenAPI
versiones compatibles
variables correctamente configuradas
```

---

## ¿Dónde veo todos los endpoints?

Swagger:

```text
http://127.0.0.1:3000/docs
```

---

## ¿Puedo inventar un endpoint nuevo porque mi pantalla lo necesita?

Primero revisar Swagger.

Si no existe, proponerlo.

No crear un segundo endpoint que haga exactamente lo mismo con otro nombre.

---

## ¿Puedo cambiar el JWT?

No unilateralmente.

La autenticación es compartida por todos los módulos.

---

## ¿Qué hago si mi implementación usa otro modelo de JWT?

Adaptarla al modelo de autenticación actual.

No crear un segundo sistema de sesión.

---

## ¿Qué hago si mi código funciona pero usa otro backend?

Portar su funcionalidad al backend actual.

No mantener dos backends haciendo la misma función.

---

# 30. Regla final

Antes de crear:

- una tabla;
- una BD;
- un backend;
- un servicio;
- un endpoint;
- un sistema de login;
- un modelo de usuarios;

revisar primero si ya existe.

La prioridad es:

```text
UNA arquitectura

UNA identidad

UN contrato API

UN modelo de datos reproducible

UNA rama oficial de integración
```

No significa que todos programen lo mismo.

Significa que todos construimos sobre la misma base.
