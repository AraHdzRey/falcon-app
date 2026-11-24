export type FalconRole =
  | 'colaborador'
  | 'capital_humano'
  | 'responsable_quejas'
  | 'editor_noticias'
  | 'administrador'
  | 'director'
  | 'auditor';

export interface SessionUser {
  userId: number;
  collaboratorId: number;
  employeeNumber: string;
  name: string;
  role: FalconRole;
  tokenVersion: number;
}

export interface LoginResult {
  user: SessionUser;
}

export interface AuthRepository {
  verifyCredentials(
    employeeNumber: string,
    password: string,
  ): Promise<LoginResult | null>;
  getSessionUser(
    userId: number,
    tokenVersion: number,
  ): Promise<SessionUser | null>;
  revokeSessions(userId: number): Promise<void>;
}

export interface HealthRepository {
  check(): Promise<{ database: string }>;
}
