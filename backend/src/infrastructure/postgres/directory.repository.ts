import type { DirectoryRepository } from '../../domain/directory/directory.repository';
import type { ModulesRepository } from '../../types/modules';

/**
 * Adaptador de transición:
 * reutiliza las consultas PostgreSQL del repositorio existente.
 * El contrato del Directorio no depende de SQL.
 */
export const createPostgresDirectoryRepository = (
  modulesRepository: Pick<ModulesRepository, 'listDirectory' | 'getProfile'>,
): DirectoryRepository => ({
  listDirectory: (filters) => modulesRepository.listDirectory(filters),
  getProfile: (userId) => modulesRepository.getProfile(userId),
});
