CREATE TABLE IF NOT EXISTS sync_state (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sync_state (id, version)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS noticias (
  id UUID PRIMARY KEY,
  titulo VARCHAR(160) NOT NULL,
  contenido VARCHAR(2000) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  version BIGINT NOT NULL CHECK (version > 0),
  creado_por BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_noticias_version
  ON noticias(version);

CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY,
  device_id UUID NOT NULL,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  entidad VARCHAR(40) NOT NULL,
  operacion VARCHAR(40) NOT NULL,
  payload JSONB NOT NULL,
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('applied', 'conflict')),
  applied_version BIGINT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_sync_operations_usuario
  ON sync_operations(usuario_id, creado_en DESC);
