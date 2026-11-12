import { pool } from '../config/database';

export const listarEmpleados = async () => {
  const resultado = await pool.query(
    `SELECT id, nombre, apellido_paterno,
            apellido_materno, correo, departamento,
            puesto, fecha_ingreso, activo
     FROM empleados
     ORDER BY id ASC`
  );

  return resultado.rows;
};
