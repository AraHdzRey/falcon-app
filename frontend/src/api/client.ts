import type { DirectoryApiEntry } from '../features/directory/model';
import {
  normalizeFolioInput,
  validateComplaintForm,
  type AdminComplaintFilters,
  type AdminComplaintsResponse,
  type ComplaintCategory,
  type ComplaintPdfTicketPayload,
  type ComplaintPdfTicketResult,
  type ComplaintRecord,
  type ComplaintSeverity,
  type ComplaintStatusCode,
  type ComplaintsSummary,
  type ComplaintTrackingResult,
  type ComplaintType,
  type CreateComplaintPayload,
  type CreatedComplaintSummary,
  type PaginatedComplaintsResponse,
  type UpdateAdminComplaintPayload,
} from '../features/complaints/model';
import {
  adaptNewsItem,
  normalizeNewsSearch,
  validateNewsForm,
  type NewsApiItem,
  type NewsFormInput,
} from '../features/news/model';
import type {
  NewsItem,
  OperationResult,
  OutboxOperation,
  SyncSnapshot,
} from '../sync/types';

export interface FalconUser {
  id: number;
  collaboratorId: number;
  employeeNumber: string;
  name: string;
  role: string;
}

export interface FalconSession {
  token: string;
  expiresIn: number;
  user: FalconUser;
}

export const normalizeApiUrl = (value: string | undefined): string => {
  const url = value?.trim().replace(/\/+$/, '');
  if (!url) {
    throw new Error(
      'Configura EXPO_PUBLIC_API_URL con la IP LAN de la computadora host.',
    );
  }
  if (!/^http:\/\/(?:\d{1,3}\.){3}\d{1,3}:\d+$/.test(url)) {
    throw new Error(
      'EXPO_PUBLIC_API_URL debe usar http://<IP_LAN>:<PUERTO> durante el piloto.',
    );
  }
  return url;
};

const apiBaseUrl = (): string =>
  normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);

const apiFetch = async (
  url: string,
  init: RequestInit = {},
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La API local no respondió en cinco segundos.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new Error('La API devolvió una respuesta no válida.');
  }
};

export const login = async (
  employeeId: string,
  password: string,
): Promise<FalconSession> => {
  const response = await apiFetch(`${apiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: employeeId.trim().toUpperCase(),
      password,
    }),
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'ID de empleado o contraseña incorrectos.'
        : 'No fue posible iniciar sesión.',
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('token' in body) ||
    typeof body.token !== 'string' ||
    !('expiresIn' in body) ||
    typeof body.expiresIn !== 'number' ||
    !('user' in body) ||
    typeof body.user !== 'object' ||
    body.user === null
  ) {
    throw new Error('La respuesta de autenticación no es válida.');
  }
  return {
    token: body.token,
    expiresIn: body.expiresIn,
    user: body.user as FalconUser,
  };
};

export const getMe = async (token: string): Promise<FalconUser> => {
  const response = await apiFetch(`${apiBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await readJson(response);
  if (
    !response.ok ||
    typeof body !== 'object' ||
    body === null ||
    !('user' in body)
  ) {
    throw new Error('La sesión no está activa.');
  }
  return body.user as FalconUser;
};

export const logout = async (token: string): Promise<void> => {
  const response = await apiFetch(`${apiBaseUrl()}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('No se pudo cerrar la sesión en el servidor.');
  }
};

export const pushSyncOperations = async (
  token: string,
  deviceId: string,
  operations: OutboxOperation[],
): Promise<OperationResult[]> => {
  const response = await apiFetch(`${apiBaseUrl()}/sync/operations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deviceId,
      operations: operations.map(({ deviceId: _deviceId, ...operation }) => operation),
    }),
  });
  const body = await readJson(response);
  if (
    !response.ok ||
    typeof body !== 'object' ||
    body === null ||
    !('results' in body) ||
    !Array.isArray(body.results)
  ) {
    throw new Error('La API no aceptó el outbox local.');
  }
  return body.results as OperationResult[];
};

export const pullSyncChanges = async (
  token: string,
  sinceVersion: number,
): Promise<SyncSnapshot> => {
  const response = await apiFetch(
    `${apiBaseUrl()}/sync/changes?sinceVersion=${sinceVersion}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = await readJson(response);
  if (
    !response.ok ||
    typeof body !== 'object' ||
    body === null ||
    !('serverVersion' in body) ||
    typeof body.serverVersion !== 'number' ||
    !('profile' in body) ||
    !('directory' in body) ||
    !Array.isArray(body.directory) ||
    !('news' in body) ||
    !Array.isArray(body.news) ||
    ('removedNewsIds' in body &&
      body.removedNewsIds !== undefined &&
      (!Array.isArray(body.removedNewsIds) ||
        !body.removedNewsIds.every((item: unknown) => typeof item === 'string')))
  ) {
    throw new Error('La API devolvió una sincronización inválida.');
  }
  const removedNewsIds =
    'removedNewsIds' in body && Array.isArray(body.removedNewsIds)
      ? (body.removedNewsIds as string[])
      : [];
  return {
    ...(body as SyncSnapshot),
    removedNewsIds,
  };
};

/** Listado autenticado de la API unificada. No utiliza datos ficticios. */
export const listDirectory = async (token: string): Promise<DirectoryApiEntry[]> => {
  const response = await apiFetch(`${apiBaseUrl()}/directory`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await readJson(response);
  if (!response.ok || typeof body !== 'object' || body === null ||
      !('items' in body) || !Array.isArray(body.items) ||
      !body.items.every((item: unknown) =>
        typeof item === 'object' && item !== null &&
        'id' in item && typeof item.id === 'number' &&
        'name' in item && typeof item.name === 'string')) {
    throw new Error('No se pudo cargar el Directorio desde la API.');
  }
  return body.items as DirectoryApiEntry[];
};

const isNewsApiItem = (item: unknown): item is NewsApiItem =>
  typeof item === 'object' &&
  item !== null &&
  'id' in item &&
  typeof item.id === 'string' &&
  'title' in item &&
  typeof item.title === 'string' &&
  'body' in item &&
  typeof item.body === 'string' &&
  'version' in item &&
  typeof item.version === 'number' &&
  'updatedAt' in item &&
  typeof item.updatedAt === 'string';

const readErrorMessage = (body: unknown, fallback: string): string =>
  typeof body === 'object' &&
  body !== null &&
  'message' in body &&
  typeof body.message === 'string' &&
  body.message.trim().length > 0
    ? body.message
    : fallback;

export const listNews = async (
  token: string,
  search?: string,
): Promise<NewsItem[]> => {
  let query = '';
  if (search !== undefined) {
    const normalized = normalizeNewsSearch(search);
    if (!normalized.ok) {
      throw new Error(normalized.error);
    }
    if (normalized.value) {
      query = `?search=${encodeURIComponent(normalized.value)}`;
    }
  }

  const response = await apiFetch(`${apiBaseUrl()}/news${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(
      readErrorMessage(body, 'No se pudieron cargar las noticias desde la API.'),
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('items' in body) ||
    !Array.isArray(body.items) ||
    !body.items.every(isNewsApiItem)
  ) {
    throw new Error('La API devolvió un listado de noticias inválido.');
  }
  return body.items.map(adaptNewsItem);
};

export const updateNews = async (
  token: string,
  id: string,
  payload: NewsFormInput,
): Promise<NewsItem> => {
  const validated = validateNewsForm(payload.title, payload.body);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const response = await apiFetch(
    `${apiBaseUrl()}/news/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validated.value),
    },
  );
  const body = await readJson(response);
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('No tienes permisos para editar noticias.');
    }
    if (response.status === 404) {
      throw new Error('La noticia ya no existe en el servidor.');
    }
    throw new Error(
      readErrorMessage(body, 'No se pudo actualizar la noticia.'),
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('news' in body) ||
    !isNewsApiItem(body.news)
  ) {
    throw new Error('La API devolvió una noticia actualizada inválida.');
  }
  return adaptNewsItem(body.news);
};

export const deactivateNews = async (
  token: string,
  id: string,
): Promise<NewsItem> => {
  const response = await apiFetch(
    `${apiBaseUrl()}/news/${encodeURIComponent(id)}/deactivate`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const body = await readJson(response);
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('No tienes permisos para retirar noticias.');
    }
    if (response.status === 404) {
      throw new Error('La noticia ya no existe o ya fue retirada.');
    }
    throw new Error(
      readErrorMessage(body, 'No se pudo retirar la noticia.'),
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('news' in body) ||
    !isNewsApiItem(body.news)
  ) {
    throw new Error('La API devolvió una respuesta inválida al retirar la noticia.');
  }
  return adaptNewsItem(body.news);
};

const VALID_COMPLAINT_TYPES: ReadonlySet<ComplaintType> = new Set([
  'QUEJA',
  'SUGERENCIA',
  'INCIDENCIA',
]);

const VALID_COMPLAINT_SEVERITIES: ReadonlySet<ComplaintSeverity> = new Set([
  'BAJA',
  'MEDIA',
  'ALTA',
  'CRITICA',
]);

const VALID_COMPLAINT_STATUSES: ReadonlySet<ComplaintStatusCode> = new Set([
  'RECEIVED',
  'UNDER_REVIEW',
  'RESOLVED',
  'CLOSED',
]);

const isComplaintCategory = (item: unknown): item is ComplaintCategory =>
  typeof item === 'object' &&
  item !== null &&
  'code' in item &&
  typeof item.code === 'string' &&
  'name' in item &&
  typeof item.name === 'string';

const isComplaintType = (value: unknown): value is ComplaintType =>
  typeof value === 'string' &&
  VALID_COMPLAINT_TYPES.has(value as ComplaintType);

const isComplaintSeverity = (value: unknown): value is ComplaintSeverity =>
  typeof value === 'string' &&
  VALID_COMPLAINT_SEVERITIES.has(value as ComplaintSeverity);

const isComplaintStatusCode = (value: unknown): value is ComplaintStatusCode =>
  typeof value === 'string' &&
  VALID_COMPLAINT_STATUSES.has(value as ComplaintStatusCode);

const isComplaintRecord = (item: unknown): item is ComplaintRecord =>
  typeof item === 'object' &&
  item !== null &&
  'id' in item &&
  typeof item.id === 'string' &&
  'folio' in item &&
  typeof item.folio === 'string' &&
  'type' in item &&
  isComplaintType(item.type) &&
  'category' in item &&
  isComplaintCategory(item.category) &&
  'reportedSeverity' in item &&
  isComplaintSeverity(item.reportedSeverity) &&
  'severity' in item &&
  isComplaintSeverity(item.severity) &&
  'status' in item &&
  isComplaintCategory(item.status) &&
  'subject' in item &&
  typeof item.subject === 'string' &&
  'description' in item &&
  typeof item.description === 'string' &&
  'createdAt' in item &&
  typeof item.createdAt === 'string' &&
  'updatedAt' in item &&
  typeof item.updatedAt === 'string' &&
  'submitter' in item &&
  typeof item.submitter === 'object' &&
  item.submitter !== null &&
  'userId' in item.submitter &&
  typeof item.submitter.userId === 'number' &&
  'employeeNumber' in item.submitter &&
  typeof item.submitter.employeeNumber === 'string' &&
  'name' in item.submitter &&
  typeof item.submitter.name === 'string';

export const fetchComplaintCategories = async (
  token: string,
): Promise<ComplaintCategory[]> => {
  const response = await apiFetch(`${apiBaseUrl()}/complaint-categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(
      readErrorMessage(
        body,
        'No se pudieron cargar las categorías de Falcón te escucha.',
      ),
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('items' in body) ||
    !Array.isArray(body.items) ||
    !body.items.every(isComplaintCategory)
  ) {
    throw new Error('La API devolvió un catálogo de categorías inválido.');
  }
  return body.items;
};

export const createComplaint = async (
  token: string,
  payload: CreateComplaintPayload,
): Promise<CreatedComplaintSummary> => {
  const validated = validateComplaintForm(payload);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const response = await apiFetch(`${apiBaseUrl()}/complaints`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(validated.value),
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(
      readErrorMessage(body, 'No se pudo registrar el reporte.'),
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('complaint' in body) ||
    typeof body.complaint !== 'object' ||
    body.complaint === null ||
    !('id' in body.complaint) ||
    typeof body.complaint.id !== 'string' ||
    !('folio' in body.complaint) ||
    typeof body.complaint.folio !== 'string' ||
    !('type' in body.complaint) ||
    !isComplaintType(body.complaint.type) ||
    !('reportedSeverity' in body.complaint) ||
    !isComplaintSeverity(body.complaint.reportedSeverity) ||
    !('severity' in body.complaint) ||
    !isComplaintSeverity(body.complaint.severity) ||
    !('status' in body.complaint) ||
    !isComplaintStatusCode(body.complaint.status) ||
    !('createdAt' in body.complaint) ||
    typeof body.complaint.createdAt !== 'string'
  ) {
    throw new Error('La API devolvió una confirmación de reporte inválida.');
  }
  return body.complaint as CreatedComplaintSummary;
};

export const fetchMyComplaints = async (
  token: string,
  page = 1,
  pageSize = 25,
): Promise<PaginatedComplaintsResponse> => {
  const response = await apiFetch(
    `${apiBaseUrl()}/complaints/mine?page=${page}&pageSize=${pageSize}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(
      readErrorMessage(body, 'No se pudieron cargar tus casos.'),
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('items' in body) ||
    !Array.isArray(body.items) ||
    !body.items.every(isComplaintRecord) ||
    !('total' in body) ||
    typeof body.total !== 'number'
  ) {
    throw new Error('La API devolvió un listado de casos inválido.');
  }
  return {
    items: body.items,
    total: body.total,
    page: 'page' in body && typeof body.page === 'number' ? body.page : page,
    pageSize:
      'pageSize' in body && typeof body.pageSize === 'number'
        ? body.pageSize
        : pageSize,
  };
};

export const trackComplaintByFolio = async (
  token: string,
  folio: string,
): Promise<ComplaintTrackingResult> => {
  const normalized = normalizeFolioInput(folio);
  if (!normalized.ok) {
    throw new Error(normalized.error);
  }

  const response = await apiFetch(
    `${apiBaseUrl()}/complaints/track/${encodeURIComponent(normalized.value)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const body = await readJson(response);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        'No se encontró el folio o pertenece a otra cuenta.',
      );
    }
    throw new Error(
      readErrorMessage(body, 'No se pudo consultar el folio.'),
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('complaint' in body) ||
    typeof body.complaint !== 'object' ||
    body.complaint === null ||
    !('folio' in body.complaint) ||
    typeof body.complaint.folio !== 'string' ||
    !('type' in body.complaint) ||
    !isComplaintType(body.complaint.type) ||
    !('reportedSeverity' in body.complaint) ||
    !isComplaintSeverity(body.complaint.reportedSeverity) ||
    !('severity' in body.complaint) ||
    !isComplaintSeverity(body.complaint.severity) ||
    !('status' in body.complaint) ||
    !isComplaintStatusCode(body.complaint.status) ||
    !('statusName' in body.complaint) ||
    typeof body.complaint.statusName !== 'string' ||
    !('updatedAt' in body.complaint) ||
    typeof body.complaint.updatedAt !== 'string'
  ) {
    throw new Error('La API devolvió un seguimiento de folio inválido.');
  }
  return body.complaint as ComplaintTrackingResult;
};

export const fetchAdminComplaints = async (
  token: string,
  filters: AdminComplaintFilters = {},
  page = 1,
  pageSize = 25,
): Promise<AdminComplaintsResponse> => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (filters.status) params.set('status', filters.status);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.type) params.set('type', filters.type);
  if (filters.category) params.set('category', filters.category);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);

  const response = await apiFetch(
    `${apiBaseUrl()}/admin/complaints?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const body = await readJson(response);
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        'Solo el rol Administrador puede acceder a la Bandeja general.',
      );
    }
    throw new Error(
      readErrorMessage(
        body,
        'No se pudo cargar la bandeja administrativa de casos.',
      ),
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('items' in body) ||
    !Array.isArray(body.items) ||
    !body.items.every(isComplaintRecord) ||
    !('total' in body) ||
    typeof body.total !== 'number' ||
    !('summary' in body) ||
    typeof body.summary !== 'object' ||
    body.summary === null
  ) {
    throw new Error('La API devolvió una bandeja administrativa inválida.');
  }
  return {
    items: body.items,
    total: body.total,
    page: 'page' in body && typeof body.page === 'number' ? body.page : page,
    pageSize:
      'pageSize' in body && typeof body.pageSize === 'number'
        ? body.pageSize
        : pageSize,
    summary: body.summary as ComplaintsSummary,
  };
};

export const fetchAdminComplaintById = async (
  token: string,
  id: string,
): Promise<ComplaintRecord> => {
  const response = await apiFetch(
    `${apiBaseUrl()}/admin/complaints/${encodeURIComponent(id)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const body = await readJson(response);
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        'Solo el rol Administrador puede consultar el detalle del caso.',
      );
    }
    if (response.status === 404) {
      throw new Error('El caso solicitado no existe.');
    }
    throw new Error(
      readErrorMessage(body, 'No se pudo cargar el detalle del caso.'),
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('complaint' in body) ||
    !isComplaintRecord(body.complaint)
  ) {
    throw new Error('La API devolvió un detalle de caso inválido.');
  }
  return body.complaint;
};

export const updateAdminComplaint = async (
  token: string,
  id: string,
  payload: UpdateAdminComplaintPayload,
): Promise<ComplaintRecord> => {
  const response = await apiFetch(
    `${apiBaseUrl()}/admin/complaints/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  const body = await readJson(response);
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Solo el rol Administrador puede evaluar o actualizar casos.');
    }
    if (response.status === 404) {
      throw new Error('El caso que intentas actualizar no existe.');
    }
    throw new Error(
      readErrorMessage(body, 'No se pudo actualizar la evaluación del caso.'),
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('complaint' in body) ||
    !isComplaintRecord(body.complaint)
  ) {
    throw new Error('La API devolvió un caso actualizado inválido.');
  }
  return body.complaint;
};

export const requestComplaintPdfTicket = async (
  token: string,
  payload: ComplaintPdfTicketPayload,
): Promise<ComplaintPdfTicketResult> => {
  const baseUrl = apiBaseUrl();
  const response = await apiFetch(`${baseUrl}/admin/complaints/report-ticket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await readJson(response);
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Solo el rol Administrador puede exportar reportes PDF.');
    }
    throw new Error(
      readErrorMessage(body, 'No se pudo generar el ticket de descarga PDF.'),
    );
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('ticket' in body) ||
    typeof body.ticket !== 'string' ||
    !('expiresInSeconds' in body) ||
    typeof body.expiresInSeconds !== 'number' ||
    !('downloadPath' in body) ||
    typeof body.downloadPath !== 'string' ||
    !body.downloadPath.startsWith('/')
  ) {
    throw new Error('La API devolvió un ticket de descarga PDF inválido.');
  }
  return {
    ticket: body.ticket,
    expiresInSeconds: body.expiresInSeconds,
    downloadPath: body.downloadPath,
    downloadUrl: `${baseUrl}${body.downloadPath}`,
  };
};
