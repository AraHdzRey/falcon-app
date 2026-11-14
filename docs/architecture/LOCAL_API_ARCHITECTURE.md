# Arquitectura local de la API FALCÓN

## Estado objetivo del piloto

```text
Teléfono Android físico
React Native + Expo
        |
        | HTTP REST / JWT
        v
Computadora host de la LAN
Node.js + TypeScript + Express :3000
        |
        | PostgreSQL protocol, sólo loopback
        v
PostgreSQL 18 / falcon_db / 127.0.0.1:5432
```

La aplicación móvil nunca contiene credenciales de PostgreSQL ni abre una
conexión directa a la base. La única frontera pública del piloto es la API en
TCP 3000 dentro de la red local. PostgreSQL escucha únicamente en loopback.

## Responsabilidades

- `frontend/`: interfaz, captura de credenciales y consumo del cliente HTTP.
- `frontend/src/api/client.ts`: única resolución de `EXPO_PUBLIC_API_URL`.
- `backend/`: validación, autenticación, autorización y acceso SQL.
- `backend/migrations/`: esquema versionado e idempotente.
- PostgreSQL: persistencia de colaboradores, cuentas, hashes y roles.

## Autenticación y autorización

1. El teléfono envía `employeeId` y `password` a `POST /auth/login`.
2. La API busca una cuenta activa y compara el hash con bcrypt.
3. La API emite un JWT HS256 de 15 minutos con emisor y audiencia fijos.
4. `requireAuth` vuelve a consultar cuenta, colaborador y versión del token.
5. `requireRole` valida privilegios en el servidor; ocultar controles en la app
   no constituye autorización.
6. `POST /auth/logout` incrementa `token_version` y revoca las sesiones previas.

El contrato público usa `employeeId/password`. Durante la integración se
mantiene compatibilidad temporal con `numeroEmpleado/contrasena`, procedente de
`falcon-app`, para evitar una ruptura abrupta.

## Seguridad local

- Contraseñas: sólo hashes bcrypt con coste 12.
- Secretos: variables de proceso o `.env` local ignorado por Git.
- Intentos de login: cinco por ventana de quince minutos.
- Cabeceras: Helmet y `X-Powered-By` deshabilitado.
- Cuerpo JSON: máximo 32 KiB.
- PostgreSQL: `127.0.0.1`/`::1`; nunca abrir TCP 5432 a la LAN.
- Firewall: si es necesario, permitir únicamente TCP 3000 en perfil `Private`.

## Decisiones y límites

El piloto no usa AWS, Azure, Render, Docker ni otro servicio de nube. La
computadora host debe permanecer encendida. Una futura migración a un servidor
interno conserva el contrato REST y sólo requiere cambiar
`EXPO_PUBLIC_API_URL`.
