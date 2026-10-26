export const esUltimoAdministradorActivo = (
    administradores: Array<{ id: string | number }>,
    empleadoId: string
): boolean => {
    const esAdministradorActivo = administradores.some(
        (administrador) =>
            String(administrador.id) === empleadoId
    );

    return (
        esAdministradorActivo &&
        administradores.length <= 1
    );
};