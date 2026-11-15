# Reporte de base de datos — Fase 1.0

Fecha de validación: 14 de noviembre de 2026.

## Estado inicial

La rama se creó desde el HEAD validado de `integration/local-api-login`. El
esquema inicial tenía ocho tablas: autenticación/roles, noticias,
sincronización y el registro de migraciones. Las migraciones `001` y `002`
coincidían con `falcon_db`; no había tablas manuales ni ORM. Quejas,
categorías, estados y auditoría eran las brechas aprobadas.

## Cambios realizados

- Migración `003_complaints_audit.sql` con categorías, estados, quejas y
  auditoría.
- Restricción explícita de anonimato y folios opacos únicos.
- Servicio bcrypt compartido por autenticación y seeds.
- Dataset sintético determinista con 20 cuentas y cobertura del dominio.
- Scripts `db:seed`, `db:verify` y `db:reset` sobre el runner existente.
- Allowlist destructiva para `falcon_db`/`falcon_test` y bloqueo de producción.
- Prueba de integración PostgreSQL real para autenticación, roles y privacidad.
- Guías de modelo, dummy data, instalación, backup y restauración.

No se agregaron endpoints, ORM, segundo runner, tablas sociales ni datos
personales reales. PostgreSQL y su configuración local no se modificaron.

## Validación ejecutada

En `falcon_test` se ejecutó dos veces el ciclo reset → migraciones → seed →
verificación. Ambos ciclos terminaron con el mismo estado lógico. Una ejecución
posterior de `db:migrate` no reaplicó migraciones.

La prueba PostgreSQL real validó:

- login administrador válido;
- password incorrecto y usuario inexistente con 401;
- usuario inactivo con 401;
- `/admin/ping` permitido al administrador y rechazado con 403 al colaborador;
- directorio sin CURP, RFC ni `passwordHash`;
- quejas anónimas y auditoría sin identidad del remitente;
- ausencia de password, JWT, secret o token en detalles de auditoría.

La regresión general terminó con typecheck, lint y build correctos; 11 pruebas
HTTP/unitarias de backend y 5 pruebas de frontend pasaron. La prueba de base
real pasó por separado. `expo install --check` confirmó dependencias al día y
Expo Doctor aprobó 21/21 controles.

`npm audit --omit=dev` reportó cero vulnerabilidades de producción. El audit
completo del backend reportó 7 vulnerabilidades moderadas en la cadena de
desarrollo `typescript-eslint`/`minimatch`; npm sólo ofrece una corrección
breaking mediante `--force`, que no se aplicó. La instalación del frontend
informó 8 vulnerabilidades moderadas de su árbol actual; esta fase no modifica
dependencias ni ejecuta correcciones forzadas.

Las protecciones se probaron además contra `NODE_ENV=production` y contra
`DB_NAME=postgres`; ambas operaciones destructivas abortaron antes de tocar la
base. `falcon_db` recibió la migración incremental y el seed reproducible.

## Conteos reproducibles

| Dato | Total |
| --- | ---: |
| Roles físicos compatibles | 7 |
| Colaboradores | 20 |
| Cuentas | 20 |
| Categorías de queja | 6 |
| Estados de queja | 4 |
| Quejas | 20 |
| Quejas anónimas | 5 |
| Noticias | 10 |
| Eventos de auditoría | 15 |

## Riesgos y pendientes

- `db:reset` es deliberadamente destructivo dentro de las dos bases
  autorizadas; requiere verificar el destino antes de ejecutarlo.
- La contraseña dummy debe introducirla el propietario y no persistirse.
- Los endpoints funcionales de quejas/auditoría corresponden a una fase
  posterior; esta fase establece modelo, datos y controles.
- Las pruebas físicas A/B/C, reapertura offline y convergencia entre tres
  dispositivos permanecen `PENDING`. No se modificó su documentación.

## Resultado

El esquema y los datos son reconstruibles con Git, Node/npm y PostgreSQL. Las
pruebas destructivas están aisladas en `falcon_test`; `falcon_db` conserva el
uso de desarrollo integrado.

