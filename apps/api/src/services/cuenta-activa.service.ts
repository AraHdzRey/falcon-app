import { pool } from '../config/database';

interface CuentaActiva {
  rol: string;
}

/**
 * Comprueba que el empleado y su cuenta de acceso
 * continúen activos en PostgreSQL.
 *
 * Devuelve el rol si existe exactamente una cuenta
 * activa. En otro caso devuelve null.
 */
export const obtenerRolCuentaActiva = async (
  empleadoId: number
): Promise<string | null> => {
  if (
    !Number.isSafeInteger(empleadoId) ||
    empleadoId <= 0
  ) {
    return null;
  }

  const resultado = await pool.query<CuentaActiva>(
    `SELECT c.rol
     FROM cuentas_acceso c
     INNER JOIN empleados e
       ON e.id = c.empleado_id
     WHERE c.empleado_id = $1
       AND c.activo = TRUE
       AND e.activo = TRUE`,
    [empleadoId]
  );

  if (resultado.rows.length !== 1) {
    return null;
  }

  return resultado.rows[0].rol;
};