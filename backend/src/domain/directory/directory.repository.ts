import type { FalconRole } from '../../types/auth';

export interface DirectoryFilters {
  search?: string;
  area?: string;
}

export interface DirectoryCollaborator {
  id: number;
  employeeNumber: string;
  name: string;
  email: string | null;
  position: string | null;
  area: string | null;
  active: boolean;
  userActive: boolean;
  role: FalconRole;
  updatedAt: string;
}

export interface DirectoryProfile extends DirectoryCollaborator {
  userId: number;
}

export interface DirectoryRepository {
  listDirectory(
    filters: DirectoryFilters,
  ): Promise<DirectoryCollaborator[]>;

  getProfile(userId: number): Promise<DirectoryProfile | null>;
}

export const isVisibleInDirectory = (
  collaborator: DirectoryCollaborator,
): boolean => collaborator.active === true;

export const isAvailableProfile = (
  profile: DirectoryProfile,
): boolean => profile.active === true && profile.userActive === true;
