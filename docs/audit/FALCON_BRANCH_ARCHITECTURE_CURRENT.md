# Arquitectura actual comprobada por ramas

Fecha de corte: 16 de noviembre de 2026.

Los diagramas muestran sólo conexiones presentes en código. Una ausencia de
flecha significa que no se encontró comunicación versionada.

## Topología Git actual

```mermaid
flowchart LR
    master["master dd31e7c"]
    legacy["Tres ramas alias 940bd70"]
    phase09["Fase 0.9 282b4f3"]
    phase10["Fase 1.0 2c231c1"]

    master -->|"6 commits"| legacy
    master -->|"ancestro"| phase09
    phase09 -->|"8 commits"| phase10
```

Las tres ramas alias son `feature/falcon-noticias-service`,
`feature/falcon-gateway-infra` y `feature/sesion-web-falcon`.

## `master`

```mermaid
flowchart LR
    mobile["apps/mobile Expo 54"]
    api["apps/api Express :3000"]
    postgres[("PostgreSQL DB_* :5432")]

    api -->|"pg Pool"| postgres
```

`master` contiene móvil y API, pero no se encontró en esa rama un cliente FALCÓN
que conecte el móvil con la API. La API sí conecta a PostgreSQL.

## SHA compartido `940bd70`

```mermaid
flowchart LR
    mobile["apps/mobile Expo 54"]
    api["apps/api Express :3000"]
    postgres[("PostgreSQL DB_* :5432")]
    news["services/noticias Express :3101"]
    images["Unsplash images"]

    mobile -->|"fetch auth"| api
    api -->|"pg Pool"| postgres
    mobile -.->|"demo images"| images
```

`services/noticias` aparece sin flechas porque sólo publica `GET /health`; no
hay consumidor, base, proxy ni llamada desde `apps/api`. La rama llamada gateway
no agrega ningún componente de gateway.

## Fase 0.9 y Fase 1.0

```mermaid
flowchart LR
    mobile["frontend Expo 57"]
    localDb[("SQLite falcon_local.db")]
    secureStore[("SecureStore JWT")]
    api["backend Express :3000"]
    postgres[("PostgreSQL falcon_db :5432")]

    mobile -->|"HTTP auth and sync"| api
    mobile -->|"cache and outbox"| localDb
    mobile -->|"session"| secureStore
    api -->|"pg Pool"| postgres
```

El mismo proceso `backend` sirve `/openapi.json` y `/docs`. PostgreSQL no se
expone al frontend; SQLite y SecureStore son locales a cada teléfono.

Fase 1.0 mantiene esta topología y sólo amplía el schema, seeds y pruebas.

## Ausencias comprobadas

- no API Gateway;
- no reverse proxy;
- no comunicación entre backends;
- no cola o broker;
- no Docker/Compose;
- no service discovery;
- no nube;
- no conexión directa móvil → PostgreSQL.
