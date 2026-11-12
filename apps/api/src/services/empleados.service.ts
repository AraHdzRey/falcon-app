import { listarEmpleados } from '../repositories/empleados.repository';

export const consultarEmpleados = async () => {
  return listarEmpleados();
};
