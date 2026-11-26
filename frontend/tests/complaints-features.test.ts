import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createComplaint,
  fetchAdminComplaintById,
  fetchAdminComplaints,
  fetchComplaintCategories,
  fetchMyComplaints,
  requestComplaintPdfTicket,
  trackComplaintByFolio,
  updateAdminComplaint,
} from '../src/api/client';
import {
  COMPLAINT_DESCRIPTION_MAX_LENGTH,
  COMPLAINT_SUBJECT_MAX_LENGTH,
  normalizeFolioInput,
  validateComplaintForm,
  type ComplaintRecord,
} from '../src/features/complaints/model';

const sampleComplaintRecord: ComplaintRecord = {
  id: '10000000-0000-4000-8000-000000000001',
  folio: 'FLC-7K2M-9Q4R',
  type: 'INCIDENCIA',
  category: { code: 'SEGURIDAD', name: 'Seguridad' },
  reportedSeverity: 'ALTA',
  severity: 'CRITICA',
  status: { code: 'UNDER_REVIEW', name: 'En revisión' },
  anonymous: false,
  subject: 'Falla en acceso de laboratorio',
  description: 'La cerradura electrónica del área 2 presenta intermitencia.',
  followUpNote: 'Personal de soporte asignado para revisión física.',
  createdAt: '2026-11-25T12:00:00.000Z',
  updatedAt: '2026-11-25T14:00:00.000Z',
  resolvedAt: null,
  submitter: {
    userId: 2,
    employeeNumber: 'TI002',
    name: 'Mariana López Ruiz',
    email: 'ti002@example.test',
    area: 'Área sintética 2',
    position: 'Puesto sintético 2',
  },
};

const withMockedFetch = async (
  handler: typeof fetch,
  action: () => Promise<void>,
): Promise<void> => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'http://192.0.2.20:3000';
  globalThis.fetch = handler;
  try {
    await action();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
    }
  }
};

test('validateComplaintForm exige selección única de tipo, categoría, gravedad y valida longitudes', () => {
  const valid = validateComplaintForm({
    type: 'QUEJA',
    categoryCode: '  procesos ',
    severity: 'ALTA',
    subject: '  Demora en validación  ',
    description: '  Detalle línea 1\nDetalle línea 2  ',
  });
  assert.deepEqual(valid, {
    ok: true,
    value: {
      type: 'QUEJA',
      categoryCode: 'PROCESOS',
      severity: 'ALTA',
      subject: 'Demora en validación',
      description: 'Detalle línea 1\nDetalle línea 2',
    },
  });

  assert.equal(
    validateComplaintForm({
      type: null,
      categoryCode: 'PROCESOS',
      severity: 'MEDIA',
      subject: 'Asunto',
      description: 'Descripción',
    }).ok,
    false,
  );
  assert.equal(
    validateComplaintForm({
      type: 'SUGERENCIA',
      categoryCode: '   ',
      severity: 'MEDIA',
      subject: 'Asunto',
      description: 'Descripción',
    }).ok,
    false,
  );
  assert.equal(
    validateComplaintForm({
      type: 'SUGERENCIA',
      categoryCode: 'PROCESOS',
      severity: null,
      subject: 'Asunto',
      description: 'Descripción',
    }).ok,
    false,
  );
  assert.equal(
    validateComplaintForm({
      type: 'QUEJA',
      categoryCode: 'PROCESOS',
      severity: 'BAJA',
      subject: 'a'.repeat(COMPLAINT_SUBJECT_MAX_LENGTH + 1),
      description: 'Descripción',
    }).ok,
    false,
  );
  assert.equal(
    validateComplaintForm({
      type: 'QUEJA',
      categoryCode: 'PROCESOS',
      severity: 'BAJA',
      subject: 'Asunto',
      description: 'a'.repeat(COMPLAINT_DESCRIPTION_MAX_LENGTH + 1),
    }).ok,
    false,
  );
});

test('normalizeFolioInput valida formato FLC-XXXX-XXXX', () => {
  assert.deepEqual(normalizeFolioInput('  flc-7k2m-9q4r '), {
    ok: true,
    value: 'FLC-7K2M-9Q4R',
  });
  assert.equal(normalizeFolioInput('').ok, false);
  assert.equal(normalizeFolioInput('FOLIO-123').ok, false);
});

test('fetchComplaintCategories, createComplaint, fetchMyComplaints y trackComplaintByFolio consumen el contrato real', async () => {
  const calls: Array<{ url: string; method: string; auth: string | null }> = [];

  await withMockedFetch(
    (async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      calls.push({
        url,
        method: init?.method ?? 'GET',
        auth: headers.get('Authorization'),
      });

      if (url.endsWith('/complaint-categories')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            total: 2,
            items: [
              { code: 'PROCESOS', name: 'Procesos' },
              { code: 'SEGURIDAD', name: 'Seguridad' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/complaints') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            status: 'ok',
            complaint: {
              id: sampleComplaintRecord.id,
              folio: sampleComplaintRecord.folio,
              type: 'INCIDENCIA',
              reportedSeverity: 'ALTA',
              severity: 'ALTA',
              status: 'RECEIVED',
              createdAt: '2026-11-25T12:00:00.000Z',
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.includes('/complaints/mine')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            items: [sampleComplaintRecord],
            total: 1,
            page: 1,
            pageSize: 25,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/complaints/track/FLC-7K2M-9Q4R')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            complaint: {
              folio: sampleComplaintRecord.folio,
              type: sampleComplaintRecord.type,
              reportedSeverity: sampleComplaintRecord.reportedSeverity,
              severity: sampleComplaintRecord.severity,
              status: 'UNDER_REVIEW',
              statusName: 'En revisión',
              followUpNote: sampleComplaintRecord.followUpNote,
              updatedAt: sampleComplaintRecord.updatedAt,
              resolvedAt: null,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ status: 'error', message: 'Folio no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch,
    async () => {
      const categories = await fetchComplaintCategories('token-colab');
      assert.equal(categories.length, 2);

      const created = await createComplaint('token-colab', {
        type: 'INCIDENCIA',
        categoryCode: 'SEGURIDAD',
        severity: 'ALTA',
        subject: 'Falla en acceso de laboratorio',
        description: 'La cerradura electrónica presenta intermitencia.',
      });
      assert.equal(created.folio, 'FLC-7K2M-9Q4R');
      assert.equal(created.severity, 'ALTA');

      const mine = await fetchMyComplaints('token-colab');
      assert.equal(mine.total, 1);
      assert.equal(mine.items[0]?.submitter.employeeNumber, 'TI002');

      const tracked = await trackComplaintByFolio(
        'token-colab',
        'flc-7k2m-9q4r',
      );
      assert.equal(tracked.severity, 'CRITICA');
      assert.equal(
        tracked.followUpNote,
        'Personal de soporte asignado para revisión física.',
      );

      await assert.rejects(
        () => trackComplaintByFolio('token-colab', 'FLC-0000-0000'),
        /pertenece a otra cuenta|No se encontró/,
      );
    },
  );

  assert.equal(calls.length, 5);
});

test('endpoints de administrador (bandeja, detalle, evaluación y ticket PDF) respetan filtros y generan downloadUrl', async () => {
  await withMockedFetch(
    (async (input, init) => {
      const url = String(input);

      if (url.includes('/admin/complaints?')) {
        assert.match(url, /severity=CRITICA/);
        assert.match(url, /type=INCIDENCIA/);
        return new Response(
          JSON.stringify({
            status: 'ok',
            items: [sampleComplaintRecord],
            total: 1,
            page: 1,
            pageSize: 25,
            summary: {
              bySeverity: { BAJA: 0, MEDIA: 0, ALTA: 0, CRITICA: 1 },
              byStatus: {
                RECEIVED: 0,
                UNDER_REVIEW: 1,
                RESOLVED: 0,
                CLOSED: 0,
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (
        url.endsWith(`/admin/complaints/${sampleComplaintRecord.id}`) &&
        (!init?.method || init.method === 'GET')
      ) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            complaint: sampleComplaintRecord,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (
        url.endsWith(`/admin/complaints/${sampleComplaintRecord.id}/status`) &&
        init?.method === 'PATCH'
      ) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            complaint: {
              ...sampleComplaintRecord,
              status: { code: 'RESOLVED', name: 'Resuelta' },
              resolvedAt: '2026-11-25T18:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (
        url.endsWith('/admin/complaints/report-ticket') &&
        init?.method === 'POST'
      ) {
        const parsed = JSON.parse(String(init.body)) as {
          scope: 'summary' | 'single';
          complaintId?: string;
        };
        const downloadPath =
          parsed.scope === 'summary'
            ? '/admin/complaints/report.pdf?ticket=tck-summary-123'
            : `/admin/complaints/${parsed.complaintId}/report.pdf?ticket=tck-single-456`;
        return new Response(
          JSON.stringify({
            status: 'ok',
            ticket:
              parsed.scope === 'summary'
                ? 'tck-summary-123'
                : 'tck-single-456',
            expiresInSeconds: 60,
            downloadPath,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ status: 'error', message: 'Ruta no esperada' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch,
    async () => {
      const tray = await fetchAdminComplaints('token-admin', {
        severity: 'CRITICA',
        type: 'INCIDENCIA',
      });
      assert.equal(tray.total, 1);
      assert.equal(tray.summary.bySeverity.CRITICA, 1);

      const detail = await fetchAdminComplaintById(
        'token-admin',
        sampleComplaintRecord.id,
      );
      assert.equal(detail.submitter.userId, 2);

      const updated = await updateAdminComplaint(
        'token-admin',
        sampleComplaintRecord.id,
        {
          statusCode: 'RESOLVED',
          severity: 'CRITICA',
          followUpNote: 'Cerradura reemplazada y verificada.',
        },
      );
      assert.equal(updated.status.code, 'RESOLVED');

      const summaryTicket = await requestComplaintPdfTicket('token-admin', {
        scope: 'summary',
        filters: { severity: 'CRITICA' },
      });
      assert.equal(
        summaryTicket.downloadUrl,
        'http://192.0.2.20:3000/admin/complaints/report.pdf?ticket=tck-summary-123',
      );

      const singleTicket = await requestComplaintPdfTicket('token-admin', {
        scope: 'single',
        complaintId: sampleComplaintRecord.id,
      });
      assert.equal(
        singleTicket.downloadUrl,
        `http://192.0.2.20:3000/admin/complaints/${sampleComplaintRecord.id}/report.pdf?ticket=tck-single-456`,
      );
    },
  );
});
