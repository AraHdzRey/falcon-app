export const COMPLAINT_SUBJECT_MAX_LENGTH = 160;
export const COMPLAINT_DESCRIPTION_MAX_LENGTH = 4000;
export const COMPLAINT_NOTE_MAX_LENGTH = 2000;

export const FOLIO_PATTERN = /^FLC-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export type ComplaintType = 'QUEJA' | 'SUGERENCIA' | 'INCIDENCIA';

export type ComplaintSeverity = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type ComplaintStatusCode =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'CLOSED';

export interface ComplaintCategory {
  code: string;
  name: string;
}

export interface ComplaintSubmitter {
  userId: number;
  employeeNumber: string;
  name: string;
  email: string | null;
  area: string | null;
  position: string | null;
}

export interface ComplaintRecord {
  id: string;
  folio: string;
  type: ComplaintType;
  category: ComplaintCategory;
  reportedSeverity: ComplaintSeverity;
  severity: ComplaintSeverity;
  status: ComplaintCategory;
  anonymous: boolean;
  subject: string;
  description: string;
  followUpNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  submitter: ComplaintSubmitter;
}

export interface CreateComplaintPayload {
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

export interface ComplaintTrackingResult {
  folio: string;
  type: ComplaintType;
  reportedSeverity: ComplaintSeverity;
  severity: ComplaintSeverity;
  status: ComplaintStatusCode;
  statusName: string;
  followUpNote: string | null;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AdminComplaintFilters {
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

export interface PaginatedComplaintsResponse {
  items: ComplaintRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminComplaintsResponse extends PaginatedComplaintsResponse {
  summary: ComplaintsSummary;
}

export interface UpdateAdminComplaintPayload {
  statusCode?: ComplaintStatusCode;
  severity?: ComplaintSeverity;
  followUpNote?: string | null;
}

export type ComplaintPdfTicketPayload =
  | {
      scope: 'summary';
      filters?: AdminComplaintFilters;
    }
  | {
      scope: 'single';
      complaintId: string;
    };

export interface ComplaintPdfTicketResult {
  ticket: string;
  expiresInSeconds: number;
  downloadPath: string;
  downloadUrl: string;
}

export const COMPLAINT_TYPE_OPTIONS: readonly {
  value: ComplaintType;
  label: string;
  description: string;
}[] = [
  {
    value: 'QUEJA',
    label: 'Queja',
    description: 'Inconformidad sobre condiciones, trato o cumplimiento interno.',
  },
  {
    value: 'SUGERENCIA',
    label: 'Sugerencia',
    description: 'Propuesta de mejora para procesos, entorno o herramientas.',
  },
  {
    value: 'INCIDENCIA',
    label: 'Incidencia',
    description: 'Evento operativo, técnico o de seguridad que requiere atención.',
  },
];

export const COMPLAINT_SEVERITY_OPTIONS: readonly {
  value: ComplaintSeverity;
  label: string;
  description: string;
}[] = [
  {
    value: 'BAJA',
    label: 'Baja',
    description: 'Impacto menor o informativo sin afectación continua.',
  },
  {
    value: 'MEDIA',
    label: 'Media',
    description: 'Afectación moderada que requiere seguimiento ordinario.',
  },
  {
    value: 'ALTA',
    label: 'Alta',
    description: 'Afectación importante a la operación o al equipo.',
  },
  {
    value: 'CRITICA',
    label: 'Crítica',
    description: 'Riesgo urgente de seguridad, integridad o continuidad operativa.',
  },
];

export const COMPLAINT_STATUS_OPTIONS: readonly {
  value: ComplaintStatusCode;
  label: string;
  description: string;
}[] = [
  {
    value: 'RECEIVED',
    label: 'Recibida',
    description: 'Reporte registrado en espera de revisión inicial.',
  },
  {
    value: 'UNDER_REVIEW',
    label: 'En revisión',
    description: 'Caso en análisis y seguimiento por Administración.',
  },
  {
    value: 'RESOLVED',
    label: 'Resuelta',
    description: 'Atención concluida con resolución registrada.',
  },
  {
    value: 'CLOSED',
    label: 'Cerrada',
    description: 'Expediente cerrado definitivamente.',
  },
];

export const DEFAULT_COMPLAINT_CATEGORIES: readonly ComplaintCategory[] = [
  { code: 'AMBIENTE_LABORAL', name: 'Ambiente laboral' },
  { code: 'PROCESOS', name: 'Procesos' },
  { code: 'INFRAESTRUCTURA', name: 'Infraestructura' },
  { code: 'SEGURIDAD', name: 'Seguridad' },
  { code: 'OTRO', name: 'Otro' },
];

export const getComplaintTypeLabel = (type: ComplaintType): string => {
  const found = COMPLAINT_TYPE_OPTIONS.find((item) => item.value === type);
  return found ? found.label : type;
};

export const getComplaintSeverityLabel = (
  severity: ComplaintSeverity,
): string => {
  const found = COMPLAINT_SEVERITY_OPTIONS.find(
    (item) => item.value === severity,
  );
  return found ? found.label : severity;
};

export const getComplaintStatusLabel = (
  statusCode: string,
  fallbackName?: string,
): string => {
  const found = COMPLAINT_STATUS_OPTIONS.find(
    (item) => item.value === statusCode,
  );
  if (found) return found.label;
  return fallbackName && fallbackName.trim().length > 0
    ? fallbackName
    : statusCode;
};

export const getSeverityBadgePalette = (
  severity: ComplaintSeverity,
): {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
} => {
  switch (severity) {
    case 'CRITICA':
      return {
        backgroundColor: '#FDE8E8',
        textColor: '#9B1C1C',
        borderColor: '#F8B4B4',
      };
    case 'ALTA':
      return {
        backgroundColor: '#FEF3C7',
        textColor: '#92400E',
        borderColor: '#FCD34D',
      };
    case 'MEDIA':
      return {
        backgroundColor: '#E0F2FE',
        textColor: '#075985',
        borderColor: '#BAE6FD',
      };
    case 'BAJA':
    default:
      return {
        backgroundColor: '#ECFDF5',
        textColor: '#065F46',
        borderColor: '#A7F3D0',
      };
  }
};

export const getStatusBadgePalette = (
  statusCode: string,
): {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
} => {
  switch (statusCode) {
    case 'RESOLVED':
      return {
        backgroundColor: '#E8F5E9',
        textColor: '#1B5E20',
        borderColor: '#A5D6A7',
      };
    case 'UNDER_REVIEW':
      return {
        backgroundColor: '#FFF8E1',
        textColor: '#7A4F01',
        borderColor: '#FFE082',
      };
    case 'CLOSED':
      return {
        backgroundColor: '#ECEFF1',
        textColor: '#37474F',
        borderColor: '#CFD8DC',
      };
    case 'RECEIVED':
    default:
      return {
        backgroundColor: '#FCE8E8',
        textColor: '#8E1616',
        borderColor: '#F5C2C2',
      };
  }
};

const hasAsciiControlChars = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
};

const hasDangerousMultilineControlChars = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (
      code <= 0x08 ||
      code === 0x0b ||
      code === 0x0c ||
      (code >= 0x0e && code <= 0x1f) ||
      code === 0x7f
    ) {
      return true;
    }
  }
  return false;
};

export const normalizeFolioInput = (
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } => {
  const normalized = raw.trim().toUpperCase();
  if (!normalized) {
    return {
      ok: false,
      error: 'Escribe un folio con formato FLC-XXXX-XXXX.',
    };
  }
  if (!FOLIO_PATTERN.test(normalized)) {
    return {
      ok: false,
      error: 'El folio debe tener el formato FLC-XXXX-XXXX.',
    };
  }
  return { ok: true, value: normalized };
};

export const validateComplaintForm = (input: {
  type: ComplaintType | null;
  categoryCode: string | null;
  severity: ComplaintSeverity | null;
  subject: string;
  description: string;
}):
  | { ok: true; value: CreateComplaintPayload }
  | { ok: false; error: string } => {
  if (!input.type) {
    return {
      ok: false,
      error: 'Selecciona un tipo de reporte (Queja, Sugerencia o Incidencia).',
    };
  }
  const categoryCode = input.categoryCode?.trim().toUpperCase() ?? '';
  if (!categoryCode) {
    return {
      ok: false,
      error: 'Selecciona una categoría para el reporte.',
    };
  }
  if (!input.severity) {
    return {
      ok: false,
      error: 'Selecciona el nivel de gravedad percibida.',
    };
  }

  const subject = input.subject.trim();
  if (!subject) {
    return {
      ok: false,
      error: 'El asunto del reporte es obligatorio.',
    };
  }
  if (subject.length > COMPLAINT_SUBJECT_MAX_LENGTH) {
    return {
      ok: false,
      error: `El asunto no puede exceder ${COMPLAINT_SUBJECT_MAX_LENGTH} caracteres.`,
    };
  }
  if (hasAsciiControlChars(subject)) {
    return {
      ok: false,
      error: 'El asunto no puede contener saltos de línea ni caracteres de control.',
    };
  }

  const description = input.description.trim();
  if (!description) {
    return {
      ok: false,
      error: 'La descripción del reporte es obligatoria.',
    };
  }
  if (description.length > COMPLAINT_DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      error: `La descripción no puede exceder ${COMPLAINT_DESCRIPTION_MAX_LENGTH} caracteres.`,
    };
  }
  if (hasDangerousMultilineControlChars(description)) {
    return {
      ok: false,
      error: 'La descripción contiene caracteres de control no permitidos.',
    };
  }

  return {
    ok: true,
    value: {
      type: input.type,
      categoryCode,
      severity: input.severity,
      subject,
      description,
    },
  };
};
