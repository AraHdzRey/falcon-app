import {
  isAvailableProfile,
  type DirectoryProfile,
  type DirectoryRepository,
} from '../../domain/directory/directory.repository';

export const createGetMyProfileUseCase = (
  repository: Pick<DirectoryRepository, 'getProfile'>,
) => {
  return async (userId: number): Promise<DirectoryProfile | null> => {
    const profile = await repository.getProfile(userId);

    if (!profile || !isAvailableProfile(profile)) {
      return null;
    }

    return profile;
  };
};
