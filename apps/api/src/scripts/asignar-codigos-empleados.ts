import { pool } from '../config/database';
import { generarCodigoEmpleado } from '../services/codigo-empleado.service';

const MAX_INTENTOS = 5;

async function asignarCodigosEmpleados(): Promise<void> {
    const base = await pool.query(
        'SELECT current_database() AS nombre'
    );

    if (base.rows[0]?.nombre !== 'falcon_dev') {
        throw new Error(
            'Este script solo puede ejecutarse en falcon_dev'
        );
    }

    const pendientes = await pool.query<{ id: string }>(
        `SELECT id
         FROM public.empleados
         WHERE codigo_empleado IS NULL
         ORDER BY id`
    );

    console.log(
        'Empleados pendientes:',
        pendientes.rows.length
    );

    let actualizados = 0;

    for (const empleado of pendientes.rows) {
        let asignado = false;

        for (let intento = 0; intento < MAX_INTENTOS; intento++) {
            const codigo = generarCodigoEmpleado();

            try {
                const resultado = await pool.query(
                    `UPDATE public.empleados
                     SET codigo_empleado = $1
                     WHERE id = $2
                       AND codigo_empleado IS NULL
                     RETURNING id`,
                    [codigo, empleado.id]
                );

                if (resultado.rowCount === 1) {
                    actualizados++;
                }

                asignado = true;
                break;
            } catch (error: unknown) {
                const errorPostgres = error as {
                    code?: string;
                    constraint?: string;
                };

                const duplicado =
                    errorPostgres.code === '23505' &&
                    errorPostgres.constraint ===
                        'ux_empleados_codigo_empleado';

                if (!duplicado) {
                    throw error;
                }
            }
        }

        if (!asignado) {
            throw new Error(
                'No se pudo asignar un codigo al empleado'
            );
        }
    }

    console.log(
        'Empleados actualizados:',
        actualizados
    );
}

asignarCodigosEmpleados()
    .catch((error) => {
        console.error(
            'Error al asignar codigos:',
            error
        );
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });