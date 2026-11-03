import { pool } from '../config/database';
import { generarHash } from '../services/auth.service';
import { generarCodigoEmpleado } from '../services/codigo-empleado.service';

const CORREO_PRUEBA = 'admin.pruebas.falcon@example.invalid';

async function crearAdministradorPrueba(): Promise<void> {
    const contrasena = process.env.FALCON_TEST_ADMIN_PASSWORD;

    if (!contrasena || contrasena.length < 12) {
        throw new Error(
            'Configura una contraseña de prueba de al menos 12 caracteres'
        );
    }

    const base = await pool.query(
        'SELECT current_database() AS nombre'
    );

    if (base.rows[0]?.nombre !== 'falcon_dev') {
        throw new Error(
            'Este script solo puede ejecutarse en falcon_dev'
        );
    }

    const hash = await generarHash(contrasena);

    for (let intento = 1; intento <= 5; intento++) {
        const cliente = await pool.connect();

        try {
            await cliente.query('BEGIN');

            const codigo = generarCodigoEmpleado();

            const empleado = await cliente.query(
                `INSERT INTO public.empleados (
                    codigo_empleado,
                    nombre,
                    apellido_paterno,
                    apellido_materno,
                    correo,
                    departamento,
                    puesto,
                    fecha_ingreso,
                    activo
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
                RETURNING id, codigo_empleado`,
                [
                    codigo,
                    'Administrador',
                    'Pruebas',
                    null,
                    CORREO_PRUEBA,
                    'Tecnologia',
                    'Administrador de pruebas',
                    '2026-10-31',
                ]
            );

            const id = empleado.rows[0].id;

            await cliente.query(
                `INSERT INTO public.cuentas_acceso (
                    empleado_id,
                    password_hash,
                    rol,
                    activo
                )
                VALUES ($1, $2, 'administrador', TRUE)`,
                [id, hash]
            );

            await cliente.query('COMMIT');

            console.log('Administrador de prueba creado.');
            console.log('Correo:', CORREO_PRUEBA);
            console.log('ID:', empleado.rows[0].codigo_empleado);

            return;
        } catch (error: unknown) {
            await cliente.query('ROLLBACK');

            const errorPostgres = error as {
                code?: string;
                constraint?: string;
            };

            const codigoDuplicado =
                errorPostgres.code === '23505' &&
                errorPostgres.constraint ===
                    'ux_empleados_codigo_empleado';

            if (!codigoDuplicado) {
                throw error;
            }
        } finally {
            cliente.release();
        }
    }

    throw new Error(
        'No se pudo generar un código único después de 5 intentos'
    );
}

crearAdministradorPrueba()
    .catch((error) => {
        console.error('No se pudo crear el administrador:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });