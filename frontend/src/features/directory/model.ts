import type { DirectoryEntry } from '../../sync/types';

/** Contrato de GET /directory de la API unificada. */
export interface DirectoryApiEntry {
  id: number;
  employeeNumber: string;
  name: string;
  email: string | null;
  position: string | null;
  area: string | null;
  active: boolean;
  userActive: boolean;
  role: string;
  updatedAt: string;
}

/** Modelo visual adaptado a las pantallas originales de Ara. */
export interface Colaborador {
  id: number;
  nombre: string;
  puesto: string;
  area: string;
  correo: string;
  iniciales: string;
  employeeNumber: string;
}

const initials = (name: string): string =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();

export const adaptDirectory = (
  entries: readonly (DirectoryApiEntry | DirectoryEntry)[],
): Colaborador[] =>
  entries.filter((entry) => !('active' in entry) || entry.active === true).map((entry) => ({
    id: entry.id,
    nombre: entry.name,
    employeeNumber: 'employeeNumber' in entry ? entry.employeeNumber : entry.employeeId,
    puesto: 'position' in entry ? entry.position ?? 'No disponible' : 'No disponible sin conexión',
    area: 'area' in entry ? entry.area ?? 'No disponible' : 'No disponible sin conexión',
    correo: 'email' in entry ? entry.email ?? 'No disponible' : 'No disponible sin conexión',
    iniciales: initials(entry.name),
  }));
