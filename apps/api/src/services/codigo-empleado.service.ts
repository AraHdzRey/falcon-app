import { randomInt } from 'node:crypto';

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const NUMEROS = '23456789';
const CARACTERES = LETRAS + NUMEROS;

export const generarCodigoEmpleado = (): string => {
    const codigo: string[] = [
        LETRAS[randomInt(LETRAS.length)],
        NUMEROS[randomInt(NUMEROS.length)],
    ];

    while (codigo.length < 12) {
        const indice = randomInt(CARACTERES.length);
        codigo.push(CARACTERES[indice]);
    }

    for (let i = codigo.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);

        [codigo[i], codigo[j]] = [
            codigo[j],
            codigo[i],
        ];
    }

    return codigo.join('');
};

export const conCodigoEmpleadoUnico = async <T>(
    guardar: (codigoEmpleado: string) => Promise<T>
): Promise<T> => {
    const MAX_INTENTOS = 5;

    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
        const codigoEmpleado = generarCodigoEmpleado();

        try {
            return await guardar(codigoEmpleado);
        } catch (error: unknown) {
            const errorPostgres = error as {
                code?: string;
                constraint?: string;
            };

            const codigoDuplicado =
                errorPostgres?.code === '23505' &&
                errorPostgres?.constraint ===
                    'ux_empleados_codigo_empleado';

            if (!codigoDuplicado) {
                throw error;
            }
        }
    }

    throw new Error(
        'No fue posible generar un ID de empleado único'
    );
};