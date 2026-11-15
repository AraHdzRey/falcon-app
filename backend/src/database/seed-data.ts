export interface SeedCollaborator {
  employeeNumber: string;
  name: string;
  email: string;
  position: string;
  area: string;
  role: string;
}

const names = [
  'Daniel Vega Torres',
  'Mariana López Ruiz',
  'Carlos Méndez Soto',
  'Fernanda Pérez Mora',
  'Ricardo Luna Castro',
  'Andrea Salgado Reyes',
  'Miguel Torres Luna',
  'Laura Méndez Ortiz',
  'Jorge Navarro Gil',
  'Sofía Campos Vera',
  'Emilio Rojas Peña',
  'Valeria Cruz Solís',
  'Hugo Serrano Paz',
  'Natalia Fuentes Mar',
  'Iván Romero Cid',
  'Paula Silva Neri',
  'Óscar Cabrera Luz',
  'Diana Ponce Valle',
  'Mateo Lara Rey',
  'Elena Vázquez Ríos',
] as const;

const roleSequence = [
  'administrador',
  'colaborador',
  'capital_humano',
  'responsable_quejas',
  'editor_noticias',
  'auditor',
] as const;

export const seedCollaborators: SeedCollaborator[] = names.map((name, index) => {
  const number = String(index + 1).padStart(3, '0');
  return {
    employeeNumber: `TI${number}`,
    name,
    email: `ti${number}@example.test`,
    position: `Puesto sintético ${index + 1}`,
    area: `Área sintética ${(index % 4) + 1}`,
    role: roleSequence[index % roleSequence.length]!,
  };
});

export const seedRoles = [
  ['colaborador', 'Colaborador activo'],
  ['capital_humano', 'Capital Humano'],
  ['responsable_quejas', 'Responsable de quejas'],
  ['editor_noticias', 'Editor de noticias'],
  ['administrador', 'Administrador técnico'],
  ['auditor', 'Auditor autorizado'],
] as const;

export const seedComplaintCategories = [
  ['AMBIENTE_LABORAL', 'Ambiente laboral'],
  ['PROCESOS', 'Procesos'],
  ['INFRAESTRUCTURA', 'Infraestructura'],
  ['SEGURIDAD', 'Seguridad'],
  ['SUGERENCIA', 'Sugerencia'],
  ['OTRO', 'Otro'],
] as const;

export const seedComplaintStatuses = [
  ['RECEIVED', 'Recibida', 1],
  ['UNDER_REVIEW', 'En revisión', 2],
  ['RESOLVED', 'Resuelta', 3],
  ['CLOSED', 'Cerrada', 4],
] as const;

const folios = [
  'FLC-7K2M-9Q4R', 'FLC-B8X3-P6T1', 'FLC-M4N7-C2V9', 'FLC-Q9D2-L5W8',
  'FLC-H3R6-Z8K1', 'FLC-T5Y9-G2N7', 'FLC-C7P4-X1M6', 'FLC-V2L8-R9D3',
  'FLC-N6W1-K4Q8', 'FLC-X8G5-T3P2', 'FLC-D1M9-V7L4', 'FLC-R4Q2-H6Y8',
  'FLC-P9T7-C5N1', 'FLC-K2V6-W8G4', 'FLC-Y5L3-D9R7', 'FLC-G8N4-Q1X5',
  'FLC-L7C2-M6T9', 'FLC-W3P8-K5V1', 'FLC-Z6R1-H4D8', 'FLC-M9X5-G2Q7',
] as const;

export const seedComplaints = folios.map((folio, index) => {
  const anonymous = index % 4 === 0;
  const status = seedComplaintStatuses[index % seedComplaintStatuses.length]![0];
  return {
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    folio,
    category: seedComplaintCategories[index % seedComplaintCategories.length]![0],
    status,
    employeeNumber: anonymous
      ? null
      : `TI${String((index % 20) + 1).padStart(3, '0')}`,
    anonymous,
    subject: `Caso sintético ${index + 1}`,
    description: `Descripción ficticia para validar el flujo de quejas ${index + 1}.`,
    createdAt: `2026-01-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
    resolvedAt: ['RESOLVED', 'CLOSED'].includes(status)
      ? `2026-02-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`
      : null,
  };
});

export const seedNews = Array.from({ length: 10 }, (_, index) => ({
  id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  title: `Noticia sintética ${index + 1}`,
  body: `Contenido ficticio de la publicación ${index + 1} para pruebas locales.`,
  active: index < 8,
  version: index + 1,
  createdAt: `2026-03-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
}));

const auditEventTypes = [
  'LOGIN_SUCCESS',
  'USER_CREATED',
  'ROLE_CHANGED',
  'NEWS_PUBLISHED',
  'COMPLAINT_STATUS_CHANGED',
] as const;

export const seedAuditEvents = Array.from({ length: 15 }, (_, index) => {
  const complaint = seedComplaints[index % seedComplaints.length]!;
  const complaintEvent = index % 5 === 4;
  return {
    id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    event: auditEventTypes[index % auditEventTypes.length]!,
    actorEmployeeNumber:
      complaintEvent && complaint.anonymous
        ? null
        : `TI${String((index % 20) + 1).padStart(3, '0')}`,
    entity: complaintEvent ? 'complaint' : 'synthetic_fixture',
    entityId: complaintEvent ? complaint.id : `fixture-${index + 1}`,
    details: complaintEvent
      ? { status: complaint.status, synthetic: true }
      : { synthetic: true },
    createdAt: `2026-04-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
  };
});
