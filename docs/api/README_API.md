# FALCÓN Local API

API REST de Node.js, TypeScript y Express para el piloto académico local.

## Direcciones

- API local: `http://127.0.0.1:3000`
- Swagger UI: `http://127.0.0.1:3000/docs`
- OpenAPI: `http://127.0.0.1:3000/openapi.json`
- Teléfono: `http://<IP_LAN_DEL_HOST>:3000`

## Endpoints

| Método | Ruta | Autenticación | Resultado principal |
| --- | --- | --- | --- |
| GET | `/health` | No | Estado del proceso HTTP |
| GET | `/health/db` | No | Conectividad con `falcon_db` |
| POST | `/auth/login` | No | JWT y perfil público |
| GET | `/auth/me` | Bearer | Usuario y rol actuales |
| POST | `/auth/logout` | Bearer | Revoca sesiones del usuario |
| GET | `/admin/ping` | Bearer + administrador | Prueba de autorización |

Solicitud de login:

```json
{
  "employeeId": "TI001",
  "password": "valor-introducido-por-el-usuario"
}
```

Nunca registrar el cuerpo de login, el hash, el JWT ni credenciales de base.

## Comandos

```powershell
npm ci
npm run db:migrate
npm run build
npm start
```

`db:seed-demo` prepara la cuenta sintética `TI001` con rol `administrador`; la
contraseña debe llegar sólo mediante la variable temporal `DEMO_PASSWORD`.
No usar datos personales ni incluir esa variable en archivos versionados.

## Prueba sin credenciales

```powershell
curl.exe -i http://127.0.0.1:3000/health
curl.exe -i http://127.0.0.1:3000/openapi.json
curl.exe -i http://127.0.0.1:3000/auth/me
```

La última petición debe devolver `401`. Las pruebas de login y rutas protegidas
deben introducir la contraseña de forma interactiva, no como literal en el
historial de PowerShell.

## Respuestas esperadas

- `200`: operación correcta.
- `400`: estructura de solicitud inválida.
- `401`: credenciales o token inválidos, expirados o revocados.
- `403`: usuario autenticado sin el rol requerido.
- `429`: demasiados intentos de login.
- `500`: error interno sin detalles sensibles.
- `503`: base de datos no disponible en `/health/db`.

## Pruebas automatizadas

```powershell
npm run typecheck
npm run lint
npm test
npm audit --omit=dev
```

Las pruebas usan repositorios en memoria y datos sintéticos; no dependen de la
base local ni contienen contraseñas reales.
