# Prueba de caída y recuperación offline

Estado actual: lógica validada automáticamente; ejecución física pendiente.

## Caída

1. Sincronizar A/B/C y registrar `server_version`.
2. Detener sólo el backend.
3. Reabrir una app: perfil, directorio y noticias deben salir de SQLite.
4. En A crear una noticia sintética: debe persistir con etiqueta pendiente.
5. Reiniciar A y comprobar que la noticia sigue presente.
6. Confirmar que B y C todavía no la muestran.

## Recuperación

1. Reiniciar API; PostgreSQL permanece local.
2. A envía el outbox y recibe `applied`.
3. B y C hacen polling/refresco y descargan la nueva versión.
4. Comparar UUID, contenido y versión en A/B/C.

## Resultados disponibles

- Coordinador sube outbox antes de descargar: prueba automática OK.
- Error de API conserva outbox y registra fallo: prueba automática OK.
- Reapertura real sin API: NO EJECUTADA.
- Persistencia SQLite en teléfono: NO EJECUTADA.
- Convergencia A/B/C tras recuperación: NO EJECUTADA.

Una sesión nueva offline está **NO SOPORTADA POR DISEÑO**. Una sesión vigente
puede usar caché sólo hasta `expiresAt`; después exige conexión.
