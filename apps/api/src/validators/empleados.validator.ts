export interface NuevoEmpleado {
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    correo: string;
    departamento: string;
    puesto: string;
    fecha_ingreso: string;
}

export const validarNuevoEmpleado = (
    datos: unknown
): NuevoEmpleado | null => {
    if (
        typeof datos !== 'object' ||
        datos === null ||
        Array.isArray(datos)
    ) {
        return null;
    }

    const empleado = datos as Record<string, unknown>;

    const camposObligatorios = [
        'nombre',
        'apellido_paterno',
        'correo',
        'departamento',
        'puesto',
        'fecha_ingreso',
    ];

    for (const campo of camposObligatorios) {
        if (
            typeof empleado[campo] !== 'string' ||
            (empleado[campo] as string).trim() === ''
        ) {
            return null;
        }
    }

    const nombre = (empleado.nombre as string).trim();
    const apellidoPaterno =
        (empleado.apellido_paterno as string).trim();
    const correo = (empleado.correo as string).trim().toLowerCase();
    const departamento = (empleado.departamento as string).trim();
    const puesto = (empleado.puesto as string).trim();
    const fechaIngreso = empleado.fecha_ingreso as string;

    if (
        nombre.length > 100 ||
        apellidoPaterno.length > 100 ||
        departamento.length > 100 ||
        puesto.length > 100 ||
        correo.length > 254
    ) {
        return null;
    }

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    ) {
        return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaIngreso)) {
        return null;
    }

    const [anio, mes, dia] = fechaIngreso
        .split('-')
        .map(Number);

    const fecha = new Date(Date.UTC(anio, mes - 1, dia));

    if (
        fecha.getUTCFullYear() !== anio ||
        fecha.getUTCMonth() !== mes - 1 ||
        fecha.getUTCDate() !== dia
    ) {
        return null;
    }

    if (
        empleado.apellido_materno !== undefined &&
        empleado.apellido_materno !== null &&
        typeof empleado.apellido_materno !== 'string'
    ) {
        return null;
    }

    const apellidoMaterno =
        typeof empleado.apellido_materno === 'string'
            ? empleado.apellido_materno.trim()
            : null;

    if (apellidoMaterno !== null && apellidoMaterno.length > 100) {
        return null;
    }

    return {
        nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno || null,
        correo,
        departamento,
        puesto,
        fecha_ingreso: fechaIngreso,
    };
};

export const validarEdicionEmpleado = (
    datos: unknown
): NuevoEmpleado | null => {
    if (
        typeof datos !== 'object' ||
        datos === null ||
        Array.isArray(datos)
    ) {
    return null;
    }

    const empleado = datos as Record<string, unknown>;

    const camposPermitidos = [
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'correo',
        'departamento',
        'puesto',
        'fecha_ingreso',
    ];

    for (const campo of Object.keys(empleado)) {
        if (!camposPermitidos.includes(campo)) {
            return null;
        }
    }

    return validarNuevoEmpleado(empleado);
};