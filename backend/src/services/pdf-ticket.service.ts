import { randomBytes } from 'node:crypto';
import type { SessionUser } from '../types/auth';
import type { ComplaintFilters } from '../types/modules';

export type PdfTicketScope = 'summary' | 'single';

export interface PdfTicketPayload {
  actor: SessionUser;
  scope: PdfTicketScope;
  complaintId?: string;
  filters?: ComplaintFilters;
}

interface StoredPdfTicket extends PdfTicketPayload {
  expiresAt: number;
}

export interface PdfTicketIssueResult {
  ticket: string;
  expiresInSeconds: number;
}

export interface PdfTicketService {
  issue(payload: PdfTicketPayload): PdfTicketIssueResult;
  consume(
    ticket: string,
    expectedScope: PdfTicketScope,
    expectedComplaintId?: string,
  ): PdfTicketPayload | null;
}

const DEFAULT_TTL_SECONDS = 60;

export const createPdfTicketService = (
  ttlSeconds = DEFAULT_TTL_SECONDS,
  now: () => number = Date.now,
): PdfTicketService => {
  const store = new Map<string, StoredPdfTicket>();

  const purgeExpired = (currentTime: number): void => {
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= currentTime) {
        store.delete(key);
      }
    }
  };

  return {
    issue(payload: PdfTicketPayload): PdfTicketIssueResult {
      const currentTime = now();
      purgeExpired(currentTime);

      const ticket = randomBytes(32).toString('base64url');
      store.set(ticket, {
        actor: payload.actor,
        scope: payload.scope,
        complaintId: payload.complaintId,
        filters: payload.filters ? { ...payload.filters } : undefined,
        expiresAt: currentTime + ttlSeconds * 1000,
      });

      return {
        ticket,
        expiresInSeconds: ttlSeconds,
      };
    },

    consume(
      ticket: string,
      expectedScope: PdfTicketScope,
      expectedComplaintId?: string,
    ): PdfTicketPayload | null {
      if (typeof ticket !== 'string' || ticket.trim().length === 0) {
        return null;
      }

      const currentTime = now();
      purgeExpired(currentTime);

      const normalized = ticket.trim();
      const entry = store.get(normalized);
      if (!entry || entry.expiresAt <= currentTime) {
        store.delete(normalized);
        return null;
      }

      if (
        entry.scope !== expectedScope ||
        (expectedScope === 'single' &&
          entry.complaintId !== expectedComplaintId)
      ) {
        return null;
      }

      store.delete(normalized);
      return {
        actor: entry.actor,
        scope: entry.scope,
        complaintId: entry.complaintId,
        filters: entry.filters ? { ...entry.filters } : undefined,
      };
    },
  };
};
