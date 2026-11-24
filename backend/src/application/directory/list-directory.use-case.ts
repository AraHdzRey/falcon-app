import {
  isVisibleInDirectory,
  type DirectoryCollaborator,
  type DirectoryFilters,
  type DirectoryRepository,
} from '../../domain/directory/directory.repository';

export const createListDirectoryUseCase = (
  repository: Pick<DirectoryRepository, 'listDirectory'>,
) => {
  return async (
    filters: DirectoryFilters,
  ): Promise<DirectoryCollaborator[]> => {
    const collaborators = await repository.listDirectory(filters);

    return collaborators.filter(isVisibleInDirectory);
  };
};
