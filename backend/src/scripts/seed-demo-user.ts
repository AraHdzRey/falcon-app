import { createPool } from '../config/database';
import { loadConfig } from '../config/env';
import { hashPassword } from '../services/password.service';

const EMPLOYEE_ID = 'TI001';
const DEMO_NAME = 'Usuario Demo FALCÓN';
const DEMO_ROLE = 'administrador';

const run = async () => {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error('DEMO_PASSWORD debe contener entre 12 y 128 caracteres');
  }

  const passwordHash = await hashPassword(password);
  const pool = createPool(loadConfig());
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const collaborator = await client.query<{ id: number }>(
      `INSERT INTO colaboradores (numero_empleado, nombre, activo)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (numero_empleado) DO UPDATE
       SET nombre = EXCLUDED.nombre,
           activo = TRUE,
           actualizado_en = NOW()
       RETURNING id`,
      [EMPLOYEE_ID, DEMO_NAME],
    );
    const collaboratorId = collaborator.rows[0]?.id;
    if (!collaboratorId) throw new Error('No se pudo crear el colaborador demo');

    const user = await client.query<{ id: number }>(
      `INSERT INTO usuarios (colaborador_id, password_hash, activo)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (colaborador_id) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           activo = TRUE,
           token_version = usuarios.token_version + 1,
           actualizado_en = NOW()
       RETURNING id`,
      [collaboratorId, passwordHash],
    );
    const userId = user.rows[0]?.id;
    if (!userId) throw new Error('No se pudo crear la cuenta demo');

    await client.query(
      `INSERT INTO usuario_roles (usuario_id, rol_id, es_principal)
       SELECT $1, id, TRUE FROM roles WHERE codigo = $2
       ON CONFLICT (usuario_id, rol_id) DO UPDATE SET es_principal = TRUE`,
      [userId, DEMO_ROLE],
    );
    await client.query('COMMIT');
    console.log(`Cuenta sintética lista: ${EMPLOYEE_ID} (${DEMO_ROLE})`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

void run().catch((error) => {
  console.error('No se pudo preparar la cuenta sintética:', error);
  process.exitCode = 1;
});
