# FALCÓN — Estado de integración y evidencia técnica

**Fecha de corte:** 22 de noviembre de 2026
**Rama de trabajo:** `feature/capas-directorio-ti`
**Rama oficial de integración:** `integration/falcon-unified-api`
**Entrega académica prevista:** 24 de noviembre de 2026

> Este documento describe implementaciones locales y pruebas realizadas
> en el entorno de desarrollo de Ara. No significa que los cambios ya
> estén fusionados, publicados o reproducidos por el resto del equipo.

## 1. Resumen ejecutivo

FALCÓN cuenta con una aplicación Expo/React Native conectada a una
API Express/TypeScript y a PostgreSQL, con almacenamiento SQLite local.

En Android se validaron:

- Inicio de sesión y reconocimiento del rol administrador.
- Directorio de colaboradores.
- Consulta de perfil de colaborador.
- Listado y detalle de Noticias.
- Presentación de fechas de Noticias.
- Lectura de Directorio y Noticias sin conexión.
- Creación de una noticia offline mediante outbox.
- Recuperación de la conexión y envío de la operación pendiente.
- Persistencia de la noticia sincronizada en PostgreSQL.

Estas comprobaciones corresponden al entorno de ensayo. La integración
en la rama oficial y las pruebas realizadas por otros integrantes
siguen pendientes.

## 2. Arquitectura oficial: tres capas

La guía actual del equipo define tres capas principales.

| Capa | Implementación | Responsabilidad |
| --- | --- | --- |
| Presentación | `frontend/` — Expo y React Native | Pantallas, navegación y experiencia móvil |
| Lógica de negocio | `backend/` — Node.js, Express y TypeScript | Autenticación, permisos, reglas, REST y sincronización |
| Datos | PostgreSQL | Persistencia central y relaciones del modelo oficial |

El flujo principal es:

```text
Android / Expo
     |
     | HTTP / REST / JSON
     v
API Express / TypeScript
     |
     | Repositorios / pg
     v
PostgreSQL
```

SQLite es almacenamiento local del dispositivo para lectura offline
y operaciones pendientes. No sustituye a PostgreSQL como fuente central.

### Separación interna del backend

El trabajo de Directorio/Perfil distingue responsabilidades internas:

1. Presentación y entrada HTTP.
2. Controladores y rutas.
3. Aplicación y casos de uso.
4. Dominio, reglas e interfaces.
5. Infraestructura y adaptadores de persistencia.

Estas cinco responsabilidades **no reemplazan las tres capas oficiales**.
Son una organización interna aplicada al segmento de Directorio/Perfil.

Evidencia: commit `be44f2d` y documentación en
`docs/architecture/FALCON_LAYERED_ARCHITECTURE.md`.

**Limitación:** los otros módulos no han sido refactorizados completamente
a esa misma estructura. La sincronización todavía utiliza consultas
del repositorio PostgreSQL existente.

### Noticias y microservicios

La API unificada ya dispone de funcionalidades de Noticias.

Conforme a `README_EQUIPO_FALCON.md`, no se incorporará automáticamente
el servicio histórico `services/noticias/` ni se duplicarán endpoints.
Un servicio independiente requiere una decisión técnica del equipo.

La rama antigua puede consultarse como referencia, pero su existencia
no demuestra que esté integrada.

## 3. Ramas y trabajo desarrollado

La rama `feature/capas-directorio-ti` surgió de la referencia oficial
`623eb9b`. Al último `git fetch` comprobado, la referencia remota
oficial llegó a `cfe47d4`, con dos commits adicionales de documentación.

El trabajo original de diseño en `feature/sesion-web-falcon`
permanece conservado. Las pantallas se adaptaron al frontend unificado;
no se copió íntegramente el sistema anterior de Expo Router.

### Commits propios

| Commit | Trabajo |
| --- | --- |
| `be44f2d` | Arquitectura interna desacoplada de Directorio y Perfil |
| `d57c86c` | Documento de arquitectura |
| `aae1721` | SQLite separado por usuario y protección de sesión |
| `9581bc3` | Documentación inicial de integración |
| `c2abae6` | Adaptación de pantallas al frontend unificado |
| `a8c40b4` | Correcciones de efecto React e importaciones |
| `a7190ed` | Configuración TypeScript compatible con Expo |
| `25ca553` | Corrección de parámetros SQL de auditoría administrativa |
| `a4f920e` | Normalización de fechas de Noticias y pruebas |

Los commits permanecen en la rama local mientras no se publique
una rama de revisión. No realizar push directo a la rama oficial.

## 4. Estado funcional y evidencia

| Componente | Estado | Evidencia |
| --- | --- | --- |
| Login administrativo | Validado localmente | Inicio exitoso desde Android |
| API y PostgreSQL | Validado en ensayo | `/health/db` con estado `ok` |
| Directorio | Validado localmente | Cinco colaboradores visibles en Android |
| Perfil de colaborador | Validado localmente | Vista y navegación comprobadas |
| Noticias | Validado localmente | Listado y detalle mostrados |
| Fechas de Noticias | Validado localmente | Desapareció `Invalid Date` |
| Lectura SQLite offline | Validado localmente | Directorio y Noticias visibles sin red |
| Outbox offline | Validado localmente | Contador de pendientes de 0 a 1 |
| Reanudación de sincronización | Validado en una prueba | Estado volvió a `EN LÍNEA` |
| Envío de noticia pendiente | Validado localmente | Contador volvió a 0 |
| Persistencia central de noticia | Validado en ensayo | PostgreSQL: 2 noticias, versión global 2 |
| Auditoría de administrador | Validado en ensayo | 2 eventos `ADMIN_LOGIN` |
| Conflictos e intermitencia prolongada | Pendiente | Sin prueba integral en dispositivo |
| Reproducción por otro integrante | Pendiente | Requiere rama publicada y revisión |
| Integración definitiva | Pendiente | Sin merge a la rama oficial |

Las pruebas manuales fueron realizadas con Expo Go compatible
con el SDK 57 del frontend.

Una ejecución exitosa no garantiza funcionamiento en todos los
dispositivos ni bajo todas las condiciones de red.

## 5. PostgreSQL y adaptación de identidad

El modelo oficial utiliza:

- `colaboradores`
- `usuarios`
- `roles`
- `usuario_roles`

Las migraciones oficiales consideradas son:

```text
backend/migrations/001_auth.sql
backend/migrations/002_offline_sync.sql
backend/migrations/003_complaints_audit.sql
```

La base original `falcon_dev` se mantuvo intacta y se respaldó
antes de realizar la adaptación.

Para las pruebas se restauró una copia y se trabajó exclusivamente
en `falcon_adaptacion_ensayo_ara`.

La adaptación conservó identificadores y datos útiles de:

```text
empleados       -> colaboradores
cuentas_acceso  -> usuarios
rol anterior    -> usuario_roles
```

Se verificaron siete colaboradores, cuatro usuarios, cuatro
asignaciones de rol y siete roles definidos. Tres usuarios quedaron
activos y uno inactivo según el estado original de las cuentas y
sus colaboradores asociados.

El nombre oficial de base de datos del equipo es `falcon_db`.
La base de ensayo no reemplaza esa decisión arquitectónica.

**Pendiente:** acordar y ejecutar el procedimiento reproducible de
adaptación hacia la base oficial local, después de respaldos,
revisión de compatibilidad y autorización correspondiente.

No aplicar `db:reset` ni realizar escrituras sobre la base original.

## 6. Pruebas automatizadas

### Backend

Se ejecutaron:

```powershell
Set-Location backend
& npm.cmd run typecheck
& npm.cmd run lint
& npm.cmd test
& npm.cmd run build
```

Último resultado comprobado:

- 29 pruebas aprobadas.
- 1 prueba omitida.
- 0 fallidas.
- TypeScript, ESLint y compilación aprobados.

La prueba omitida no debe presentarse como superada.

### Frontend

Se ejecutaron:

```powershell
Set-Location frontend
& npm.cmd run typecheck
& npm.cmd run lint
node --import tsx --test tests/*.test.ts
```

Último resultado comprobado:

- 18 pruebas aprobadas.
- 0 fallidas.
- TypeScript y ESLint aprobados.

Cuatro pruebas específicas cubren formatos de fecha de Noticias.

Estas pruebas automatizadas complementan, pero no sustituyen,
la validación en Android con PostgreSQL real.

## 7. Reproducción de la demostración

Entorno utilizado: Windows PowerShell, Node.js, Expo Go y PostgreSQL.

1. Utilizar la rama de trabajo identificada y las dependencias del proyecto.
2. Levantar la API con variables de entorno locales y la base de ensayo.
3. Comprobar `/health/db`.
4. Configurar `EXPO_PUBLIC_API_URL` con la IP LAN de la computadora.
5. Iniciar Expo y abrir FALCÓN en un teléfono de la misma red.
6. Autenticarse únicamente con una cuenta de desarrollo autorizada.
7. Consultar Directorio, Perfil, Noticias y detalle.
8. Activar modo avión y comprobar lectura offline.
9. Crear una noticia sintética en la cola local.
10. Recuperar la red, comprobar el contador y la sincronización.
11. Verificar por consulta de solo lectura el registro en PostgreSQL.

No documentar contraseñas, tokens ni secretos de desarrollo.

### Seguridad y límites

- PostgreSQL no se expone directamente al teléfono.
- La conexión móvil se realiza mediante la API.
- La demostración local utiliza HTTP sin cifrar; limitarla a una
  red privada y datos de prueba.
- Para una instalación real deben revisarse TLS, credenciales
  de base de datos con privilegios mínimos y despliegue.
- El aislamiento de SQLite por cuenta no implica cifrado.
- La base SQLite heredada `falcon_local.db` no se elimina
  ni se migra automáticamente.
- La recuperación de red fue validada en el escenario descrito,
  no mediante una batería de pruebas de resistencia.

## 8. Trabajo pendiente para integrar

| Prioridad | Actividad | Criterio de aceptación |
| --- | --- | --- |
| Alta | Revisar diferencias con la rama oficial | Sin sobrescribir trabajo del equipo |
| Alta | Publicar rama revisable con aprobación | Pull Request hacia la rama oficial |
| Alta | Actualizar diagramas funcional y técnico | Consistentes con las tres capas |
| Alta | Documentar preparación de `falcon_db` | Migraciones y adaptación reproducibles |
| Media | Verificar cambio de cuenta en Android | Sin exposición de caché entre usuarios |
| Media | Probar red intermitente e idempotencia | Sin pérdidas ni duplicados |
| Media | Normalizar fechas desde la API | Contrato de timestamps consistente |
| Media | Revisar advertencia de `SafeAreaView` | Migración sin regresiones |
| Media | Revalidar con otro integrante | Evidencia reproducible |

No agregar un microservicio ni un segundo sistema de identidad
para completar la demostración.

## 9. Criterio de entrega

Una funcionalidad se diferencia como:

**Requerida → Propuesta → Implementada → Validada.**

La evidencia disponible demuestra funcionamiento local de los
recorridos descritos. La integración entre integrantes todavía
requiere publicación controlada, revisión y reproducción.

Este README debe revisarse junto con la guía oficial
`README_EQUIPO_FALCON.md`.

**Regla:** no hacer merge directo ni push sobre
`integration/falcon-unified-api` sin revisión del equipo.
