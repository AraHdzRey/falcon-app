# Microservicio de Noticias (`@falcon/noticias`)

> **Nota de estado e integración:** Este microservicio corresponde al avance previo del módulo de Noticias (base anterior con `apps/api` y JWT con `empleadoId`). Se publica en esta rama independiente conforme a la sección 11 de `README_EQUIPO_FALCON.md` para revisión y eventual adaptación a `userId` o integración selectiva en `integration/falcon-unified-api`.

Microservicio independiente de FALCÓN. Expone noticias de **solo lectura** (`GET`) con datos de demostración en memoria.

- **No** se conecta a PostgreSQL.
- **No** llama a `apps/api`.
- Valida los JWT de forma local con la misma `JWT_SECRET` que `apps/api`.

## Variables de entorno

Copia la plantilla y edítala (el archivo `.env` está ignorado por Git y **nunca** debe subirse):

```powershell
Copy-Item .env.example .env
```

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `NOTICIAS_PORT` | No | `3101` | Puerto (entero 1–65535). |
| `NOTICIAS_HOST` | No | `127.0.0.1` | Solo `127.0.0.1` o `0.0.0.0`. Cualquier otro valor aborta el arranque. |
| `NOTICIAS_CORS_ORIGIN` | No | `http://localhost:8081` | Origen(es) permitidos, separados por coma. Se usa `credentials: true`, por lo que no se admite `*`. |
| `JWT_SECRET` | **Sí** | — | Debe ser idéntica a la de `apps/api`, de al menos **64 caracteres**. Sin ella el servicio no arranca. |

## Instalación

```powershell
cd services\noticias
npm.cmd install
```

## Iniciar

```powershell
# Desarrollo (recarga automática)
npm.cmd run dev

# Producción local
npm.cmd run build
npm.cmd start
```

Debe mostrar: `Microservicio Noticias en http://127.0.0.1:3101`.

## Detener

Pulsa `Ctrl + C` en la terminal donde corre. Si quedó en segundo plano:

```powershell
Get-NetTCPConnection -LocalPort 3101 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID>
```

## Pruebas y verificación

```powershell
npm.cmd run typecheck   # tsc --noEmit
npm.cmd run build       # compila a dist/
npm.cmd test            # compila y ejecuta node:test (tests/noticias.test.mjs)
```

Las pruebas levantan la app en un puerto efímero y firman sus propios tokens, así que **no** necesitan `.env` ni red.

## Autenticación

Todas las rutas bajo `/api/noticias` exigen un JWT **HS256** firmado con `JWT_SECRET`, con payload `{ empleadoId }` donde `empleadoId` es un entero seguro positivo.

1. Cabecera `Authorization: Bearer <jwt>` (formato exacto: dos partes, `Bearer` con esa capitalización).
2. Solo **si no hay** cabecera `Authorization`, cookie `falcon_sesion` (leída de `Cookie`). Si hay cabecera, no se usa la cookie como respaldo.

> El JWT no contiene rol y Noticias no consulta la base de datos, por lo que en esta fase no se distingue entre `empleado` y `administrador`. Cualquier token válido puede consultar.

Errores de autenticación (HTTP 401, mismo formato y mensajes que `apps/api`):

| Caso | `message` |
|---|---|
| Sin cabecera ni cookie | `Token de autenticación requerido` |
| `Authorization` mal formado | `Formato de autorización inválido` |
| Firma incorrecta, expirado, algoritmo distinto o `empleadoId` inválido | `Token inválido o expirado` |

## Contrato HTTP

Todas las respuestas son JSON. Los errores tienen la forma `{ "status": "error", "message": "..." }`.

### `Noticia`

```ts
{
  id: number;
  titulo: string;
  fecha: string;        // ya formateada, p. ej. "16 oct. 2026"
  categoria: 'TI' | 'Administrativas';
  imagen: string;       // URL
  contenido: string;
}
```

### `GET /health` (público)

`200`
```json
{ "status": "ok", "service": "noticias", "message": "Microservicio de Noticias activo" }
```

### `GET /api/noticias` (protegido)

Query opcionales:

- `categoria`: `Todas` (por defecto), `TI` o `Administrativas`. Otro valor, o repetido → `400`.
- `q`: búsqueda parcial, insensible a mayúsculas, sobre `titulo` y `contenido`. Máx. 100 caracteres tras `trim`. Vacío equivale a no enviarlo. Repetido, con caracteres de control o más largo → `400`.

`200`
```json
{
  "status": "ok",
  "total": 1,
  "filtros": { "categoria": "Todas", "q": "Mantenimiento" },
  "noticias": [ { "id": 1, "titulo": "...", "fecha": "...", "categoria": "TI", "imagen": "...", "contenido": "..." } ]
}
```

### `GET /api/noticias/:id` (protegido)

- `:id` debe cumplir `/^[1-9]\d*$/` → si no, `400` (`Identificador de noticia inválido`).
- No existe → `404` (`Noticia no encontrada`).

`200`
```json
{ "status": "ok", "noticia": { "id": 1, "titulo": "...", "fecha": "...", "categoria": "TI", "imagen": "...", "contenido": "..." } }
```

### Otros

- Ruta inexistente o método distinto de `GET` → `404` `Ruta no encontrada`.
- Error inesperado → `500` `Error interno del servidor`.

## Ejemplos de comprobación (PowerShell)

Genera un token de prueba con tu `JWT_SECRET` (el servicio y el script deben usar el mismo valor):

```powershell
$env:JWT_SECRET = "<tu JWT_SECRET de al menos 64 caracteres>"
$token = node -e "console.log(require('jsonwebtoken').sign({empleadoId:1}, process.env.JWT_SECRET, {algorithm:'HS256', expiresIn:'15m'}))"
```

```powershell
# Público
curl.exe http://127.0.0.1:3101/health

# 401 sin token
curl.exe -i http://127.0.0.1:3101/api/noticias

# 200 con Bearer
curl.exe -H "Authorization: Bearer $token" http://127.0.0.1:3101/api/noticias

# 200 con cookie de sesión
curl.exe -H "Cookie: falcon_sesion=$token" http://127.0.0.1:3101/api/noticias

# Filtros
curl.exe -H "Authorization: Bearer $token" "http://127.0.0.1:3101/api/noticias?categoria=TI"
curl.exe -H "Authorization: Bearer $token" "http://127.0.0.1:3101/api/noticias?q=mantenimiento"
curl.exe -i -H "Authorization: Bearer $token" "http://127.0.0.1:3101/api/noticias?categoria=Invalida"   # 400

# Detalle
curl.exe -H "Authorization: Bearer $token" http://127.0.0.1:3101/api/noticias/1
curl.exe -i -H "Authorization: Bearer $token" http://127.0.0.1:3101/api/noticias/abc   # 400
curl.exe -i -H "Authorization: Bearer $token" http://127.0.0.1:3101/api/noticias/999   # 404
```

## Estructura

```
src/
  app.ts                      # construye y exporta la app Express (sin listen)
  server.ts                   # dotenv, validación de entorno y listen
  types/noticia.types.ts
  data/noticias.data.ts       # datos demo en memoria (reemplazable por PostgreSQL)
  validators/noticias.validator.ts
  services/token.service.ts   # verificación JWT local
  services/noticias.service.ts
  middlewares/auth.middleware.ts
  middlewares/error.middleware.ts
  controllers/noticias.controller.ts
  routes/noticias.routes.ts
tests/noticias.test.mjs
```

## Migración futura a PostgreSQL

Basta con sustituir `src/data/noticias.data.ts` (y adaptar `noticias.service.ts` a asíncrono); controladores, rutas y contrato HTTP no cambian.
