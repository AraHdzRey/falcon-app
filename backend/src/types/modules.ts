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

export type ComplaintType = 'QUEJA' | 'SUGERENCIA' | 'INCIDENCIA';

export type ComplaintSeverity = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type ComplaintStatusCode =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'CLOSED';

export interface ComplaintSubmitterView {
  userId: number;
  employeeNumber: string;
  name: string;
  email: string | null;
  area: string | null;
  position: string | null;
}

export interface ComplaintView {
  id: string;
  folio: string;
  type: ComplaintType;
  category: ComplaintCategoryView;
  reportedSeverity: ComplaintSeverity;
  severity: ComplaintSeverity;
  status: ComplaintCategoryView;
  anonymous: boolean;
  subject: string;
  description: string;
  followUpNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  submitter: ComplaintSubmitterView;
}

export interface CreateComplaintInput {
  type: ComplaintType;
  categoryCode: string;
  severity: ComplaintSeverity;
  subject: string;
  description: string;
}

export interface CreatedComplaintSummary {
  id: string;
  folio: string;
  type: ComplaintType;
  reportedSeverity: ComplaintSeverity;
  severity: ComplaintSeverity;
  status: ComplaintStatusCode;
  createdAt: string;
}

export interface ComplaintTrackingView {
  folio: string;
  type: ComplaintType;
  reportedSeverity: ComplaintSeverity;
  severity: ComplaintSeverity;
  status: string;
  statusName: string;
  followUpNote: string | null;
  updatedAt: string;
  resolvedAt: string | null;
  remitenteUsuarioId: number;
}

export interface ComplaintFilters {
  status?: ComplaintStatusCode;
  severity?: ComplaintSeverity;
  type?: ComplaintType;
  category?: string;
  from?: string;
  to?: string;
}

export interface ComplaintsSummary {
  bySeverity: Record<ComplaintSeverity, number>;
  byStatus: Record<ComplaintStatusCode, number>;
}

export interface ComplaintStatusUpdate {
  statusCode?: ComplaintStatusCode;
  severity?: ComplaintSeverity;
  followUpNote?: string | null;
}

export interface ComplaintReportExportDetails {
  scope: 'single' | 'summary';
  complaintId?: string | null;
  folio?: string;
  filters?: ComplaintFilters;
  totalItems: number;
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
    input: CreateComplaintInput,
    actor: SessionUser,
  ): Promise<MutationResult<CreatedComplaintSummary>>;
  listMyComplaints(
    userId: number,
    page: number,
    pageSize: number,
  ): Promise<{
    items: ComplaintView[];
    total: number;
  }>;
  getComplaintByFolio(folio: string): Promise<ComplaintTrackingView | null>;
  trackComplaint(folio: string): Promise<ComplaintTrackingView | null>;
  listComplaints(
    page: number,
    pageSize: number,
    filters?: ComplaintFilters,
  ): Promise<{
    items: ComplaintView[];
    total: number;
    summary: ComplaintsSummary;
  }>;
  getComplaint(id: string): Promise<ComplaintView | null>;
  updateComplaintStatus(
    id: string,
    input: ComplaintStatusUpdate,
    actor: SessionUser,
  ): Promise<MutationResult<ComplaintView>>;
  recordComplaintReportExport(
    actor: SessionUser,
    details: ComplaintReportExportDetails,
  ): Promise<void>;
  listAudit(page: number, pageSize: number): Promise<{
    items: AuditView[];
    total: number;
  }>;
}
