CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS colaboradores (
  id BIGSERIAL PRIMARY KEY,
  numero_empleado VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(160) NOT NULL,
  correo VARCHAR(254) UNIQUE,
  puesto VARCHAR(120),
  area VARCHAR(120),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  colaborador_id BIGINT NOT NULL UNIQUE
    REFERENCES colaboradores(id) ON DELETE RESTRICT,
  password_hash VARCHAR(255) NOT NULL
    CHECK (password_hash LIKE '$2%'),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  token_version INTEGER NOT NULL DEFAULT 0
    CHECK (token_version >= 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuario_roles (
  usuario_id BIGINT NOT NULL
    REFERENCES usuarios(id) ON DELETE CASCADE,
  rol_id BIGINT NOT NULL
    REFERENCES roles(id) ON DELETE RESTRICT,
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, rol_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_rol_principal
  ON usuario_roles(usuario_id)
  WHERE es_principal = TRUE;

INSERT INTO roles (codigo, nombre)
VALUES
  ('colaborador', 'Colaborador activo'),
  ('capital_humano', 'Capital Humano'),
  ('responsable_quejas', 'Responsable de quejas'),
  ('editor_noticias', 'Editor de noticias'),
  ('administrador', 'Administrador técnico'),
  ('director', 'Director'),
  ('auditor', 'Auditor autorizado')
ON CONFLICT (codigo) DO NOTHING;
