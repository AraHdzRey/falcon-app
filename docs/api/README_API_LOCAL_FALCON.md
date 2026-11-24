# API local FALCÓN — autenticación y sincronización

Base local: `http://127.0.0.1:3000`.

| Método | Ruta | Auth | Propósito |
| --- | --- | --- | --- |
| GET | `/health` | No | Salud HTTP |
| GET | `/health/db` | No | Acceso a `falcon_db` |
| POST | `/auth/login` | No | JWT y perfil |
| GET | `/auth/me` | Bearer | Sesión vigente |
| POST | `/auth/logout` | Bearer | Revocación por versión |
| GET | `/sync/changes` | Bearer | Perfil, directorio y cambios desde versión |
| POST | `/sync/operations` | Bearer + editor/admin | Lote idempotente del outbox |

Swagger: `http://127.0.0.1:3000/docs/`
OpenAPI: `http://127.0.0.1:3000/openapi.json`

## Operación de sincronización

```json
{
  "deviceId": "uuid-del-dispositivo",
  "operations": [
    {
      "id": "uuid-idempotente",
      "entity": "news",
      "operation": "upsert",
      "baseVersion": null,
      "payload": {
        "id": "uuid-de-noticia",
        "title": "Noticia sintética",
        "body": "Contenido exclusivo de prueba"
      }
    }
  ]
}
```

`baseVersion=null` crea. Una edición debe enviar la versión leída. Los resultados
son `applied`, `duplicate` o `conflict`. El backend nunca recibe credenciales de
PostgreSQL desde el teléfono y PostgreSQL no se expone a la LAN.

## Validación observada

- `/health`: 200.
- `/health/db`: `falcon_db`.
- Swagger: 200, ocho rutas visibles.
- Login válido e inválido, `/auth/me`, `/sync/changes` y logout: OK mediante
  entrada interactiva de contraseña, sin persistirla.
- Pruebas automatizadas backend: 11/11.
