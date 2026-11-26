import PDFDocument from 'pdfkit';
import type { SessionUser } from '../types/auth';
import type {
  ComplaintFilters,
  ComplaintsSummary,
  ComplaintView,
} from '../types/modules';

const INSTITUTIONAL_RED = '#7A0010';
const DARK_TEXT = '#1F2937';
const MUTED_TEXT = '#4B5563';
const BORDER_GRAY = '#D1D5DB';

const CONFIDENTIAL_FOOTER =
  'Documento confidencial de uso exclusivo para Administración — Instrumentos y Equipos Falcón';

const formatValue = (value: string | null | undefined, fallback = 'No registrado'): string =>
  value && value.trim().length > 0 ? value.trim() : fallback;

const formatFiltersSummary = (filters: ComplaintFilters): string => {
  const parts: string[] = [];
  if (filters.status) parts.push(`Estado: ${filters.status}`);
  if (filters.severity) parts.push(`Gravedad: ${filters.severity}`);
  if (filters.type) parts.push(`Tipo: ${filters.type}`);
  if (filters.category) parts.push(`Categoría: ${filters.category}`);
  if (filters.from) parts.push(`Desde: ${filters.from}`);
  if (filters.to) parts.push(`Hasta: ${filters.to}`);
  return parts.length > 0 ? parts.join(' | ') : 'Sin filtros (todos los casos)';
};

const drawSectionHeading = (doc: PDFKit.PDFDocument, title: string): void => {
  if (doc.y > 700) {
    doc.addPage();
  }
  doc.moveDown(0.6);
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(INSTITUTIONAL_RED)
    .text(title);
  const currentY = doc.y + 2;
  doc
    .moveTo(48, currentY)
    .lineTo(547, currentY)
    .strokeColor(BORDER_GRAY)
    .lineWidth(0.8)
    .stroke();
  doc.moveDown(0.5);
};

const drawField = (
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
): void => {
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(DARK_TEXT)
    .text(`${label}: `, { continued: true })
    .font('Helvetica')
    .fillColor(MUTED_TEXT)
    .text(value);
};

const drawFooter = (doc: PDFKit.PDFDocument): void => {
  if (doc.y > 720) {
    doc.addPage();
  }
  doc.moveDown(1.2);
  const lineY = doc.y;
  doc
    .moveTo(48, lineY)
    .lineTo(547, lineY)
    .strokeColor(BORDER_GRAY)
    .lineWidth(0.6)
    .stroke();
  doc.moveDown(0.4);
  doc
    .font('Helvetica-Oblique')
    .fontSize(8.5)
    .fillColor(MUTED_TEXT)
    .text(CONFIDENTIAL_FOOTER, { align: 'center' });
};

const renderDocumentToBuffer = (
  build: (doc: PDFKit.PDFDocument) => void,
): Promise<Buffer> =>
  new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 48,
      info: {
        Title: 'Falcón te escucha — Reporte Confidencial',
        Author: 'FALCÓN Unified Local API',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);

    try {
      build(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });

export const buildComplaintDetailPdf = (
  complaint: ComplaintView,
  generatedBy: SessionUser,
): Promise<Buffer> =>
  renderDocumentToBuffer((doc) => {
    const emittedAt = new Date().toISOString();

    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(INSTITUTIONAL_RED)
      .text('Falcón te escucha — Ficha Confidencial de Reporte');
    doc.moveDown(0.3);
    drawField(doc, 'Fecha y hora de emisión', emittedAt);
    drawField(
      doc,
      'Generado por administrador',
      `${generatedBy.name} (${generatedBy.employeeNumber})`,
    );

    drawSectionHeading(doc, '1. Identificación del reporte');
    drawField(doc, 'Folio', complaint.folio);
    drawField(doc, 'ID interno', complaint.id);
    drawField(
      doc,
      'Estado actual',
      `${complaint.status.name} (${complaint.status.code})`,
    );
    drawField(doc, 'Fecha de creación', complaint.createdAt);
    drawField(doc, 'Última actualización', complaint.updatedAt);
    drawField(
      doc,
      'Fecha de resolución',
      formatValue(complaint.resolvedAt, 'Pendiente de resolución'),
    );

    drawSectionHeading(doc, '2. Datos de quien reporta');
    drawField(doc, 'Nombre completo', complaint.submitter.name);
    drawField(doc, 'ID de usuario', String(complaint.submitter.userId));
    drawField(doc, 'Número de empleado', complaint.submitter.employeeNumber);
    drawField(doc, 'Correo electrónico', formatValue(complaint.submitter.email));
    drawField(doc, 'Área', formatValue(complaint.submitter.area));
    drawField(doc, 'Puesto', formatValue(complaint.submitter.position));

    drawSectionHeading(doc, '3. Clasificación y gravedad');
    drawField(doc, 'Tipo de caso', complaint.type);
    drawField(
      doc,
      'Categoría',
      `${complaint.category.name} (${complaint.category.code})`,
    );
    drawField(
      doc,
      'Gravedad reportada por el colaborador',
      complaint.reportedSeverity,
    );
    drawField(doc, 'Gravedad oficial evaluada', complaint.severity);

    drawSectionHeading(doc, '4. Contenido del reporte');
    drawField(doc, 'Asunto', complaint.subject);
    doc.moveDown(0.3);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(DARK_TEXT)
      .text('Descripción completa:');
    doc.moveDown(0.2);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(DARK_TEXT)
      .text(complaint.description, {
        align: 'left',
        lineGap: 2,
      });

    drawSectionHeading(doc, '5. Seguimiento administrativo');
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(DARK_TEXT)
      .text(
        formatValue(
          complaint.followUpNote,
          'Sin nota de seguimiento registrada',
        ),
        {
          align: 'left',
          lineGap: 2,
        },
      );

    drawFooter(doc);
  });

export const buildComplaintsSummaryPdf = (
  result: {
    items: ComplaintView[];
    total: number;
    summary: ComplaintsSummary;
  },
  filters: ComplaintFilters,
  generatedBy: SessionUser,
): Promise<Buffer> =>
  renderDocumentToBuffer((doc) => {
    const emittedAt = new Date().toISOString();

    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(INSTITUTIONAL_RED)
      .text('Falcón te escucha — Reporte Consolidado de Casos');
    doc.moveDown(0.3);
    drawField(doc, 'Fecha y hora de emisión', emittedAt);
    drawField(
      doc,
      'Generado por administrador',
      `${generatedBy.name} (${generatedBy.employeeNumber})`,
    );
    drawField(doc, 'Filtros aplicados', formatFiltersSummary(filters));

    drawSectionHeading(doc, '1. Resumen general');
    drawField(doc, 'Total de casos coincidentes', String(result.total));
    drawField(doc, 'Casos incluidos en este reporte', String(result.items.length));
    drawField(
      doc,
      'Desglose por gravedad',
      `CRITICA: ${result.summary.bySeverity.CRITICA} | ALTA: ${result.summary.bySeverity.ALTA} | MEDIA: ${result.summary.bySeverity.MEDIA} | BAJA: ${result.summary.bySeverity.BAJA}`,
    );
    drawField(
      doc,
      'Desglose por estado',
      `RECEIVED: ${result.summary.byStatus.RECEIVED} | UNDER_REVIEW: ${result.summary.byStatus.UNDER_REVIEW} | RESOLVED: ${result.summary.byStatus.RESOLVED} | CLOSED: ${result.summary.byStatus.CLOSED}`,
    );

    drawSectionHeading(doc, '2. Detalle de casos');
    if (result.items.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(MUTED_TEXT)
        .text('No se encontraron casos con los filtros seleccionados.');
    } else {
      result.items.forEach((item, index) => {
        if (doc.y > 650) {
          doc.addPage();
        }
        doc
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .fillColor(DARK_TEXT)
          .text(`${index + 1}. Folio: ${item.folio} — ${item.subject}`);
        drawField(
          doc,
          'Remitente',
          `${item.submitter.name} (ID Usuario: ${item.submitter.userId} | Empleado: ${item.submitter.employeeNumber})`,
        );
        drawField(
          doc,
          'Clasificación',
          `Tipo: ${item.type} | Categoría: ${item.category.name} (${item.category.code})`,
        );
        drawField(
          doc,
          'Gravedad y Estado',
          `Reportada: ${item.reportedSeverity} | Oficial: ${item.severity} | Estado: ${item.status.name} (${item.status.code})`,
        );
        drawField(doc, 'Fecha de creación', item.createdAt);
        doc.moveDown(0.5);
      });
    }

    drawFooter(doc);
  });
