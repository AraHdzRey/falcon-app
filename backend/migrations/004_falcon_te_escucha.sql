INSERT INTO categorias_queja (codigo, nombre, activo)
VALUES
  ('AMBIENTE_LABORAL', 'Ambiente laboral', TRUE),
  ('PROCESOS', 'Procesos', TRUE),
  ('INFRAESTRUCTURA', 'Infraestructura', TRUE),
  ('SEGURIDAD', 'Seguridad', TRUE),
  ('SUGERENCIA', 'Sugerencia', FALSE),
  ('OTRO', 'Otro', TRUE)
ON CONFLICT (codigo) DO NOTHING;

UPDATE categorias_queja
SET activo = FALSE,
    actualizado_en = NOW()
WHERE codigo = 'SUGERENCIA';

INSERT INTO estados_queja (codigo, nombre, orden)
VALUES
  ('RECEIVED', 'Recibida', 1),
  ('UNDER_REVIEW', 'En revisión', 2),
  ('RESOLVED', 'Resuelta', 3),
  ('CLOSED', 'Cerrada', 4)
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE quejas
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'QUEJA'
    CHECK (tipo IN ('QUEJA', 'SUGERENCIA', 'INCIDENCIA')),
  ADD COLUMN IF NOT EXISTS gravedad_reportada VARCHAR(20) NOT NULL DEFAULT 'MEDIA'
    CHECK (gravedad_reportada IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  ADD COLUMN IF NOT EXISTS gravedad VARCHAR(20) NOT NULL DEFAULT 'MEDIA'
    CHECK (gravedad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  ADD COLUMN IF NOT EXISTS nota_seguimiento VARCHAR(2000);

UPDATE quejas q
SET tipo = 'SUGERENCIA',
    categoria_id = otro.id,
    actualizado_en = NOW()
FROM categorias_queja sug,
     categorias_queja otro
WHERE q.categoria_id = sug.id
  AND sug.codigo = 'SUGERENCIA'
  AND otro.codigo = 'OTRO';

ALTER TABLE quejas
  DROP CONSTRAINT IF EXISTS ck_queja_anonima_sin_remitente;

DELETE FROM quejas
WHERE (anonima = TRUE OR remitente_usuario_id IS NULL)
  AND NOT EXISTS (SELECT 1 FROM usuarios);

UPDATE quejas
SET remitente_usuario_id = COALESCE(
      remitente_usuario_id,
      (SELECT id FROM usuarios ORDER BY id LIMIT 1)
    ),
    anonima = FALSE,
    actualizado_en = NOW()
WHERE anonima = TRUE OR remitente_usuario_id IS NULL;

UPDATE auditoria_eventos a
SET actor_usuario_id = q.remitente_usuario_id
FROM quejas q
WHERE a.entidad = 'complaint'
  AND a.entidad_id = q.id::text
  AND a.actor_usuario_id IS NULL;

ALTER TABLE quejas
  ALTER COLUMN remitente_usuario_id SET NOT NULL,
  ADD CONSTRAINT ck_queja_anonima_sin_remitente CHECK (
    anonima = FALSE AND remitente_usuario_id IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS ix_quejas_remitente_creado
  ON quejas(remitente_usuario_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS ix_quejas_gravedad_creado
  ON quejas(gravedad, creado_en DESC);
