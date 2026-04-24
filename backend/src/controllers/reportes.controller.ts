// src/controllers/reportes.controller.ts

import { Request, Response, NextFunction } from 'express';
import { prisma }      from '../config/prisma';
import PDFDocument     from 'pdfkit';
import ExcelJS         from 'exceljs';

// ── Helper: construir filtros ────────────────────────────────
const buildWhere = (query: Record<string, string>) => {
  const where: Record<string, any> = {};

  if (query.estado)        where.estado        = query.estado;
  if (query.areaId)        where.areaActualId  = Number(query.areaId);
  if (query.tipoTramiteId) where.tipoTramiteId = Number(query.tipoTramiteId);

  if (query.fechaDesde || query.fechaHasta) {
    where.fecha_registro = {};
    if (query.fechaDesde) where.fecha_registro.gte = new Date(`${query.fechaDesde}T00:00:00.000Z`);
    if (query.fechaHasta) where.fecha_registro.lte = new Date(`${query.fechaHasta}T23:59:59.999Z`);
  }

  return where;
};

// ── Helper: obtener expedientes ──────────────────────────────
const getExpedientes = async (where: Record<string, any>) => {
  return prisma.expediente.findMany({
    where,
    select: {
      codigo:         true,
      estado:         true,
      fecha_registro: true,
      fecha_limite:   true,
      fecha_resolucion: true,
      ciudadano:   { select: { dni: true, nombres: true, apellido_pat: true, apellido_mat: true } },
      tipoTramite: { select: { nombre: true, costo_soles: true } },
      areaActual:  { select: { nombre: true, sigla: true } },
      pagos: { where: { estado: 'VERIFICADO' }, select: { monto_cobrado: true, boleta: true }, take: 1 },
    },
    orderBy: { fecha_registro: 'desc' },
  });
};

// ── GET /api/reportes/excel ──────────────────────────────────
export const exportarExcel = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const where        = buildWhere(req.query as Record<string, string>);
    const expedientes  = await getExpedientes(where);

    const workbook  = new ExcelJS.Workbook();
    workbook.creator = 'Municipalidad Distrital de Carmen Alto';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Expedientes', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // ── Encabezado institucional ─────────────────────────────
    sheet.mergeCells('A1:J1');
    sheet.getCell('A1').value     = 'MUNICIPALIDAD DISTRITAL DE CARMEN ALTO';
    sheet.getCell('A1').font      = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e40af' } };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height        = 30;

    sheet.mergeCells('A2:J2');
    sheet.getCell('A2').value     = 'Sistema de Trámite Documentario — Reporte de Expedientes';
    sheet.getCell('A2').font      = { size: 11, color: { argb: 'FF1e40af' } };
    sheet.getCell('A2').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFeff6ff' } };
    sheet.getCell('A2').alignment = { horizontal: 'center' };
    sheet.getRow(2).height        = 20;

    sheet.mergeCells('A3:J3');
    sheet.getCell('A3').value     = `Generado el ${new Date().toLocaleString('es-PE')} — Total: ${expedientes.length} expedientes`;
    sheet.getCell('A3').font      = { size: 9, color: { argb: 'FF6b7280' } };
    sheet.getCell('A3').alignment = { horizontal: 'center' };

    sheet.addRow([]); // Fila vacía

    // ── Cabeceras de columnas ────────────────────────────────
    const headers = [
      { header: 'N°',           key: 'num',          width: 5  },
      { header: 'Código',       key: 'codigo',       width: 20 },
      { header: 'Ciudadano',    key: 'ciudadano',    width: 28 },
      { header: 'DNI',          key: 'dni',          width: 12 },
      { header: 'Tipo Trámite', key: 'tipo',         width: 28 },
      { header: 'Estado',       key: 'estado',       width: 18 },
      { header: 'Área',         key: 'area',         width: 20 },
      { header: 'F. Registro',  key: 'f_registro',   width: 14 },
      { header: 'F. Límite',    key: 'f_limite',     width: 14 },
      { header: 'Monto (S/)',   key: 'monto',        width: 12 },
    ];

    sheet.columns = headers;

    const headerRow = sheet.getRow(5);
    headerRow.values = headers.map(h => h.header);
    headerRow.eachCell((cell) => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e40af' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border    = { bottom: { style: 'thin', color: { argb: 'FFbfdbfe' } } };
    });
    headerRow.height = 22;

    // ── Colores por estado ───────────────────────────────────
    const estadoColores: Record<string, string> = {
      PENDIENTE_PAGO:  'FFfef3c7',
      RECIBIDO:        'FFdbeafe',
      EN_REVISION_MDP: 'FFede9fe',
      DERIVADO:        'FFe0e7ff',
      EN_PROCESO:      'FFffedd5',
      LISTO_DESCARGA:  'FFcffafe',
      PDF_FIRMADO:     'FFccfbf1',
      RESUELTO:        'FFdcfce7',
      OBSERVADO:       'FFfef9c3',
      RECHAZADO:       'FFfee2e2',
      ARCHIVADO:       'FFf3f4f6',
    };

    // ── Filas de datos ───────────────────────────────────────
    expedientes.forEach((exp, idx) => {
      const pago  = exp.pagos[0];
      const color = estadoColores[exp.estado] ?? 'FFFFFFFF';
      const fila  = idx % 2 === 0 ? 'FFFFFFFF' : 'FFf8fafc';

      const row = sheet.addRow({
        num:        idx + 1,
        codigo:     exp.codigo,
        ciudadano:  `${exp.ciudadano.apellido_pat} ${exp.ciudadano.apellido_mat}, ${exp.ciudadano.nombres}`,
        dni:        exp.ciudadano.dni,
        tipo:       exp.tipoTramite.nombre,
        estado:     exp.estado.replace(/_/g, ' '),
        area:       exp.areaActual?.nombre ?? '—',
        f_registro: exp.fecha_registro.toLocaleDateString('es-PE'),
        f_limite:   exp.fecha_limite.toLocaleDateString('es-PE'),
        monto:      pago ? Number(pago.monto_cobrado) : 0,
      });

      row.eachCell((cell, colNum) => {
        cell.alignment = { vertical: 'middle', wrapText: false };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: colNum === 6 ? color : fila } };
        cell.border    = { bottom: { style: 'hair', color: { argb: 'FFe5e7eb' } } };
      });

      // Monto con formato moneda
      const montoCell = row.getCell(10);
      montoCell.numFmt = '"S/ "#,##0.00';
    });

    // ── Fila de totales ──────────────────────────────────────
    const totalRow = sheet.addRow({
      num:    '',
      codigo: 'TOTAL',
      monto:  expedientes.reduce((s, e) => s + (e.pagos[0] ? Number(e.pagos[0].monto_cobrado) : 0), 0),
    });
    totalRow.getCell(2).font      = { bold: true };
    totalRow.getCell(10).numFmt   = '"S/ "#,##0.00';
    totalRow.getCell(10).font     = { bold: true };
    totalRow.getCell(10).fill     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdcfce7' } };

    // ── Autofit ──────────────────────────────────────────────
    sheet.columns.forEach((col) => { if (col.width) col.width = Math.max(col.width as number, 10); });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-expedientes-${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

// ── GET /api/reportes/pdf ────────────────────────────────────
export const exportarPdf = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const where       = buildWhere(req.query as Record<string, string>);
    const expedientes = await getExpedientes(where);

    const doc   = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
    const azul  = '#1e40af';
    const gris  = '#6b7280';
    const negro = '#111827';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-expedientes-${Date.now()}.pdf"`);
    doc.pipe(res);

    // ── Encabezado ───────────────────────────────────────────
    doc.rect(0, 0, 842, 70).fill(azul);
    doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
       .text('MUNICIPALIDAD DISTRITAL DE CARMEN ALTO', 40, 15, { align: 'center', width: 762 });
    doc.fontSize(10).font('Helvetica')
       .text('Sistema de Trámite Documentario — Reporte de Expedientes', 40, 35, { align: 'center', width: 762 });
    doc.fontSize(8)
       .text(`Generado: ${new Date().toLocaleString('es-PE')} | Total: ${expedientes.length} expedientes`, 40, 52, { align: 'center', width: 762 });

    // ── Cabeceras de tabla ───────────────────────────────────
    const cols = [
      { label: 'Código',       x: 40,  w: 110 },
      { label: 'Ciudadano',    x: 155, w: 160 },
      { label: 'DNI',          x: 320, w: 65  },
      { label: 'Trámite',      x: 390, w: 130 },
      { label: 'Estado',       x: 525, w: 90  },
      { label: 'Área',         x: 620, w: 95  },
      { label: 'Monto',        x: 720, w: 62  },
    ];

    let y = 85;
    doc.rect(40, y, 762, 16).fill(azul);
    cols.forEach((col) => {
      doc.fillColor('white').fontSize(7).font('Helvetica-Bold')
         .text(col.label, col.x + 3, y + 4, { width: col.w - 6 });
    });
    y += 16;

    // ── Filas ────────────────────────────────────────────────
    const estadoColores: Record<string, string> = {
      RESUELTO:       '#dcfce7', OBSERVADO: '#fef9c3',
      RECHAZADO:      '#fee2e2', EN_PROCESO: '#ffedd5',
      LISTO_DESCARGA: '#cffafe', DERIVADO: '#e0e7ff',
    };

    expedientes.forEach((exp, idx) => {
      if (y > 530) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
        y = 40;
        // Repetir cabeceras
        doc.rect(40, y, 762, 16).fill(azul);
        cols.forEach((col) => {
          doc.fillColor('white').fontSize(7).font('Helvetica-Bold')
             .text(col.label, col.x + 3, y + 4, { width: col.w - 6 });
        });
        y += 16;
      }

      const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const estColor = estadoColores[exp.estado] ?? bgColor;
      const pago    = exp.pagos[0];

      // Fila
      doc.rect(40, y, 762, 14).fill(bgColor).stroke('#e5e7eb');

      const ciudadano = `${exp.ciudadano.apellido_pat}, ${exp.ciudadano.nombres}`;
      const monto     = pago ? `S/ ${Number(pago.monto_cobrado).toFixed(2)}` : '—';
      const estado    = exp.estado.replace(/_/g, ' ');

      // Estado con color de fondo
      doc.rect(cols[4].x, y, cols[4].w, 14).fill(estColor);

      const datos = [
        { x: cols[0].x, w: cols[0].w, text: exp.codigo, bold: true, color: azul },
        { x: cols[1].x, w: cols[1].w, text: ciudadano,  bold: false, color: negro },
        { x: cols[2].x, w: cols[2].w, text: exp.ciudadano.dni, bold: false, color: gris },
        { x: cols[3].x, w: cols[3].w, text: exp.tipoTramite.nombre, bold: false, color: negro },
        { x: cols[4].x, w: cols[4].w, text: estado, bold: true, color: '#92400e' },
        { x: cols[5].x, w: cols[5].w, text: exp.areaActual?.sigla ?? '—', bold: false, color: negro },
        { x: cols[6].x, w: cols[6].w, text: monto, bold: true, color: '#15803d' },
      ];

      datos.forEach((d) => {
        doc.fillColor(d.color).fontSize(7)
           .font(d.bold ? 'Helvetica-Bold' : 'Helvetica')
           .text(d.text, d.x + 3, y + 3, { width: d.w - 6, ellipsis: true });
      });

      y += 14;
    });

    // ── Pie de página ────────────────────────────────────────
    doc.rect(0, 565, 842, 25).fill(azul);
    doc.fillColor('white').fontSize(7).font('Helvetica')
       .text('Municipalidad Distrital de Carmen Alto — Sistema de Trámite Documentario', 40, 573, { align: 'center', width: 762 });

    doc.end();
  } catch (err) { next(err); }
};

// ── GET /api/reportes/datos ──────────────────────────────────
// Datos para los filtros del frontend
export const getDatosReporte = async (
  _req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const areas  = await prisma.area.findMany({ select: { id: true, nombre: true, sigla: true }, orderBy: { nombre: 'asc' } });
    const tipos  = await prisma.tipoTramite.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
    const estados = [
      'PENDIENTE_PAGO','RECIBIDO','EN_REVISION_MDP','DERIVADO',
      'EN_PROCESO','LISTO_DESCARGA','PDF_FIRMADO','RESUELTO',
      'OBSERVADO','RECHAZADO','ARCHIVADO',
    ];
    res.json({ areas, tipos, estados });
  } catch (err) { next(err); }
};