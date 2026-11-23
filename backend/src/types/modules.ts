import type { FalconRole, SessionUser } from './auth';

export interface DirectoryFilters {
  search?: string;
  area?: string;
}

export interface NewsFilters {
  search?: string;
}

export interface CollaboratorView {
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

export interface ProfileView extends CollaboratorView {
  userId: number;
}

export interface CollaboratorInput {
  employeeNumber: string;
  name: string;
  email: string | null;
  position: string | null;
  area: string | null;
  role: FalconRole;
  passwordHash: string;
}

export interface CollaboratorUpdate {
  name: string;
  email: string | null;
  position: string | null;
  area: string | null;
  role: FalconRole;
}

export interface NewsView {
  id: string;
  title: string;
  body: string;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintCategoryView {
  code: string;
  name: string;
}

export interface ComplaintView {
  id: string;
  folio: string;
  category: ComplaintCategoryView;
  status: ComplaintCategoryView;
  anonymous: boolean;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  submitter?: {
    employeeNumber: string;
    name: string;
    email: string | null;
  } | null;
}

export interface ComplaintTrackingView {
  folio: string;
  status: string;
  statusName: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AuditView {
  id: string;
  event: string;
  actorEmployeeNumber: string | null;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export type MutationResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'not_found' | 'conflict' | 'self_action' | 'last_admin' };

export interface ModulesRepository {
  listDirectory(filters: DirectoryFilters): Promise<CollaboratorView[]>;
  getProfile(userId: number): Promise<ProfileView | null>;
  listCollaborators(page: number, pageSize: number): Promise<{
    items: CollaboratorView[];
    total: number;
  }>;
  createCollaborator(
    input: CollaboratorInput,
    actor: SessionUser,
  ): Promise<MutationResult<CollaboratorView>>;
  updateCollaborator(
    id: number,
    input: CollaboratorUpdate,
    actor: SessionUser,
  ): Promise<MutationResult<CollaboratorView>>;
  deactivateCollaborator(
    id: number,
    actor: SessionUser,
  ): Promise<MutationResult<CollaboratorView>>;
  reactivateCollaborator(
    id: number,
    actor: SessionUser,
  ): Promise<MutationResult<CollaboratorView>>;
  listNews(filters?: NewsFilters): Promise<NewsView[]>;
  getNews(id: string): Promise<NewsView | null>;
  createNews(
    input: { title: string; body: string },
    actor: SessionUser,
  ): Promise<NewsView>;
  updateNews(
    id: string,
    input: { title: string; body: string },
    actor: SessionUser,
  ): Promise<NewsView | null>;
  listComplaintCategories(): Promise<ComplaintCategoryView[]>;
  createComplaint(
    input: {
      categoryCode: string;
      anonymous: boolean;
      subject: string;
      description: string;
    },
    actor: SessionUser | null,
  ): Promise<MutationResult<{ id: string; folio: string }>>;
  trackComplaint(folio: string): Promise<ComplaintTrackingView | null>;
  listComplaints(page: number, pageSize: number): Promise<{
    items: ComplaintView[];
    total: number;
  }>;
  getComplaint(id: string): Promise<ComplaintView | null>;
  updateComplaintStatus(
    id: string,
    statusCode: string,
    actor: SessionUser,
  ): Promise<MutationResult<ComplaintView>>;
  listAudit(page: number, pageSize: number): Promise<{
    items: AuditView[];
    total: number;
  }>;
}
