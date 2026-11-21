/**
 * El almacenamiento local pertenece a una cuenta autenticada.
 * El archivo heredado falcon_local.db no se abre ni migra aqui.
 */
export const databaseNameForUser = (userId: number): string => {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error('Identificador de usuario invalido');
  }

  return `falcon_user_${userId}.db`;
};

/**
 * Impide aplicar a una cuenta datos recibidos para otra.
 */
export const assertSnapshotOwner = (
  expectedUserId: number,
  actualUserId: number,
): void => {
  databaseNameForUser(expectedUserId);
  databaseNameForUser(actualUserId);

  if (expectedUserId !== actualUserId) {
    throw new Error('La sincronizacion pertenece a otra cuenta');
  }
};
