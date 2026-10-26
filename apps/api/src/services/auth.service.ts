import bcrypt from 'bcrypt';
import { pool } from '../config/database';

const SALT_ROUNDS = 12;

export const generarHash = async (
    contrasena: string
): Promise<string> => {
    return bcrypt.hash(contrasena, SALT_ROUNDS);
};

export const verificarContrasena = async (
    contrasena: string,
    hashGuardado: string
): Promise<boolean> => {
    return bcrypt.compare(contrasena, hashGuardado);
};

export const crearCuenta = async (
    empleadoId: number,
    contrasena: string
): Promise<number> => {
    const hash = await generarHash(contrasena);

    const resultado = await pool.query(
        `INSERT INTO cuentas_acceso
        (empleado_id, password_hash, rol)
        VALUES ($1, $2, 'empleado')
        RETURNING id`,
        [empleadoId, hash]
    );

    return Number(resultado.rows[0].id);
};

export const validarCredenciales = async (
    correo: string,
    contrasena: string
): Promise<number | null> => {
    const resultado = await pool.query(
        `SELECT
            c.empleado_id,
            c.password_hash
        FROM cuentas_acceso c
        INNER JOIN empleados e
            ON e.id = c.empleado_id
        WHERE LOWER(e.correo) = LOWER($1)
            AND c.activo = TRUE
            AND e.activo = TRUE`,
        [correo]
    );

    if (resultado.rows.length !== 1) {
        return null;
    }

    const cuenta = resultado.rows[0];

    const esValida = await verificarContrasena(
        contrasena,
        cuenta.password_hash
    );

    if (!esValida) {
        return null;
    }

    return Number(cuenta.empleado_id);
};