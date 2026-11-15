CREATE TABLE IF NOT EXISTS categorias_queja (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estados_queja (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  orden SMALLINT NOT NULL UNIQUE CHECK (orden > 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quejas (
  id UUID PRIMARY KEY,
  folio VARCHAR(32) NOT NULL UNIQUE
    CHECK (folio ~ '^FLC-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  categoria_id BIGINT NOT NULL
    REFERENCES categorias_queja(id) ON DELETE RESTRICT,
  estado_id BIGINT NOT NULL
    REFERENCES estados_queja(id) ON DELETE RESTRICT,
  remitente_usuario_id BIGINT
    REFERENCES usuarios(id) ON DELETE RESTRICT,
  anonima BOOLEAN NOT NULL DEFAULT FALSE,
  asunto VARCHAR(160) NOT NULL,
  descripcion VARCHAR(4000) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelto_en TIMESTAMPTZ,
  CONSTRAINT ck_queja_anonima_sin_remitente CHECK (
    (anonima = TRUE AND remitente_usuario_id IS NULL)
    OR
    (anonima = FALSE AND remitente_usuario_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ix_quejas_categoria
  ON quejas(categoria_id);

CREATE INDEX IF NOT EXISTS ix_quejas_estado_creado
  ON quejas(estado_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS ix_quejas_remitente
  ON quejas(remitente_usuario_id)
  WHERE remitente_usuario_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS auditoria_eventos (
  id UUID PRIMARY KEY,
  evento VARCHAR(60) NOT NULL,
  actor_usuario_id BIGINT
    REFERENCES usuarios(id) ON DELETE SET NULL,
  entidad VARCHAR(40) NOT NULL,
  entidad_id VARCHAR(64),
  detalles JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(detalles) = 'object'),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_auditoria_evento_creado
  ON auditoria_eventos(evento, creado_en DESC);

CREATE INDEX IF NOT EXISTS ix_auditoria_entidad
  ON auditoria_eventos(entidad, entidad_id);
