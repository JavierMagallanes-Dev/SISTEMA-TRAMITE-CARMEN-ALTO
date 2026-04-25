// src/controllers/reportes.controller.ts
// RF22: Reportes exportables en Excel y PDF con filtros.
// ADMIN ve todas las áreas. JEFE_AREA solo ve su área.

import { Request, Response, NextFunction } from 'express';
import { prisma }  from '../config/prisma';
import PDFDocument from 'pdfkit';
import ExcelJS     from 'exceljs';

// ── Helper: construir filtros ────────────────────────────────
const buildWhere = (query: Record<string, string>, req: Request) => {
  const where: Record<string, any> = {};
  const { rol, areaId } = req.usuario!;

  // JEFE_AREA solo puede ver su propia área — ignorar filtro de areaId del query
  if (rol === 'JEFE_AREA' && areaId) {
    where.areaActualId = areaId;
  } else if (rol === 'ADMIN' && query.areaId) {
    where.areaActualId = Number(query.areaId);
  }

  if (query.estado)        where.estado        = query.estado;
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
      codigo:           true,
      estado:           true,
      fecha_registro:   true,
      fecha_limite:     true,
      fecha_resolucion: true,
      ciudadano:   { select: { dni: true, nombres: true, apellido_pat: true, apellido_mat: true } },
      tipoTramite: { select: { nombre: true, costo_soles: true } },
      areaActual:  { select: { nombre: true, sigla: true } },
      pagos: { where: { estado: 'VERIFICADO' }, select: { monto_cobrado: true, boleta: true }, take: 1 },
    },
    orderBy: [
      { areaActual: { nombre: 'asc' } },
      { fecha_registro: 'desc' },
    ],
  });
};

const fmtFechaHora = (d: Date) =>
  new Date(d).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const estadoColoresPdf: Record<string, string> = {
  RESUELTO: '#dcfce7', OBSERVADO: '#fef9c3', RECHAZADO: '#fee2e2',
  EN_PROCESO: '#ffedd5', LISTO_DESCARGA: '#cffafe', DERIVADO: '#e0e7ff',
  PENDIENTE_PAGO: '#fef3c7', RECIBIDO: '#dbeafe',
};

const estadoColoresXls: Record<string, string> = {
  PENDIENTE_PAGO: 'FFfef3c7', RECIBIDO: 'FFdbeafe', EN_REVISION_MDP: 'FFede9fe',
  DERIVADO: 'FFe0e7ff', EN_PROCESO: 'FFffedd5', LISTO_DESCARGA: 'FFcffafe',
  PDF_FIRMADO: 'FFccfbf1', RESUELTO: 'FFdcfce7', OBSERVADO: 'FFfef9c3',
  RECHAZADO: 'FFfee2e2', ARCHIVADO: 'FFf3f4f6',
};

// ── GET /api/reportes/excel ──────────────────────────────────
export const exportarExcel = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { rol, areaId } = req.usuario!;
    const where       = buildWhere(req.query as Record<string, string>, req);
    const expedientes = await getExpedientes(where);

    const workbook   = new ExcelJS.Workbook();
    workbook.creator = 'Municipalidad Distrital de Carmen Alto';
    workbook.created = new Date();

    // Agrupar por área
    const grupos = new Map<string, typeof expedientes>();
    expedientes.forEach((exp) => {
      const area = exp.areaActual?.nombre ?? 'Sin área asignada';
      if (!grupos.has(area)) grupos.set(area, []);
      grupos.get(area)!.push(exp);
    });

    const addEncabezado = (sheet: ExcelJS.Worksheet, titulo: string, total: number) => {
      sheet.mergeCells('A1:K1');
      sheet.getCell('A1').value     = 'MUNICIPALIDAD DISTRITAL DE CARMEN ALTO';
      sheet.getCell('A1').font      = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      sheet.getCell('A1').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e40af' } };
      sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height        = 30;
      sheet.mergeCells('A2:K2');
      sheet.getCell('A2').value     = titulo;
      sheet.getCell('A2').font      = { size: 11, color: { argb: 'FF1e40af' } };
      sheet.getCell('A2').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFeff6ff' } };
      sheet.getCell('A2').alignment = { horizontal: 'center' };
      sheet.mergeCells('A3:K3');
      sheet.getCell('A3').value     = `Generado: ${new Date().toLocaleString('es-PE')} | Total: ${total} expedientes`;
      sheet.getCell('A3').font      = { size: 9, color: { argb: 'FF6b7280' } };
      sheet.getCell('A3').alignment = { horizontal: 'center' };
      sheet.addRow([]);
    };

    const addHeaders = (sheet: ExcelJS.Worksheet) => {
      const headers = ['N°', 'Código', 'Ciudadano', 'DNI', 'Tipo Trámite', 'Estado', 'Área', 'Fecha y Hora Registro', 'Fecha Límite', 'Fecha Resolución', 'Monto (S/)'];
      const widths  = [5, 20, 28, 12, 28, 18, 20, 20, 14, 16, 12];
      sheet.columns = headers.map((h, i) => ({ header: h, key: h, width: widths[i] }));
      const headerRow = sheet.getRow(5);
      headerRow.values = headers;
      headerRow.eachCell((cell) => {
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e40af' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border    = { bottom: { style: 'thin', color: { argb: 'FFbfdbfe' } } };
      });
      headerRow.height = 22;
    };

    const addFila = (sheet: ExcelJS.Worksheet, exp: typeof expedientes[0], idx: number) => {
      const pago  = exp.pagos[0];
      const color = estadoColoresXls[exp.estado] ?? 'FFFFFFFF';
      const fila  = idx % 2 === 0 ? 'FFFFFFFF' : 'FFf8fafc';
      const row   = sheet.addRow([
        idx + 1,
        exp.codigo,
        `${exp.ciudadano.apellido_pat} ${exp.ciudadano.apellido_mat}, ${exp.ciudadano.nombres}`,
        exp.ciudadano.dni,
        exp.tipoTramite.nombre,
        exp.estado.replace(/_/g, ' '),
        exp.areaActual?.nombre ?? '—',
        fmtFechaHora(exp.fecha_registro),
        fmtFecha(exp.fecha_limite),
        exp.fecha_resolucion ? fmtFecha(exp.fecha_resolucion) : '—',
        pago ? Number(pago.monto_cobrado) : 0,
      ]);
      row.eachCell((cell, colNum) => {
        cell.alignment = { vertical: 'middle' };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: colNum === 6 ? color : fila } };
        cell.border    = { bottom: { style: 'hair', color: { argb: 'FFe5e7eb' } } };
      });
      row.getCell(11).numFmt = '"S/ "#,##0.00';
    };

    const addTotal = (sheet: ExcelJS.Worksheet, exps: typeof expedientes, label = 'TOTAL') => {
      const total = sheet.addRow(['', label, '', '', '', '', '', '', '', '',
        exps.reduce((s, e) => s + (e.pagos[0] ? Number(e.pagos[0].monto_cobrado) : 0), 0),
      ]);
      total.getCell(2).font    = { bold: true };
      total.getCell(11).numFmt = '"S/ "#,##0.00';
      total.getCell(11).font   = { bold: true };
      total.getCell(11).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdcfce7' } };
    };

    // Hoja general solo para ADMIN
    if (rol === 'ADMIN') {
      const sheetGeneral = workbook.addWorksheet('Todos los expedientes', { pageSetup: { paperSize: 9, orientation: 'landscape' } });
      addEncabezado(sheetGeneral, 'Sistema de Trámite Documentario — Reporte General', expedientes.length);
      addHeaders(sheetGeneral);
      expedientes.forEach((exp, idx) => addFila(sheetGeneral, exp, idx));
      addTotal(sheetGeneral, expedientes, 'TOTAL GENERAL');
    }

    // Hojas por área
    grupos.forEach((exps, areaNombre) => {
      const sheet = workbook.addWorksheet(areaNombre.substring(0, 31), { pageSetup: { paperSize: 9, orientation: 'landscape' } });
      addEncabezado(sheet, `Expedientes — ${areaNombre}`, exps.length);
      addHeaders(sheet);
      exps.forEach((exp, idx) => addFila(sheet, exp, idx));
      addTotal(sheet, exps, `TOTAL ${areaNombre.toUpperCase()}`);
    });

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
    const where       = buildWhere(req.query as Record<string, string>, req);
    const expedientes = await getExpedientes(where);

    const grupos = new Map<string, typeof expedientes>();
    expedientes.forEach((exp) => {
      const area = exp.areaActual?.nombre ?? 'Sin área asignada';
      if (!grupos.has(area)) grupos.set(area, []);
      grupos.get(area)!.push(exp);
    });

    const doc   = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
    const azul  = '#1e40af';
    const gris  = '#6b7280';
    const negro = '#111827';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-expedientes-${Date.now()}.pdf"`);
    doc.pipe(res);

    const cols = [
      { label: 'Código',         x: 40,  w: 95  },
      { label: 'Ciudadano',      x: 138, w: 135 },
      { label: 'DNI',            x: 276, w: 60  },
      { label: 'Trámite',        x: 339, w: 115 },
      { label: 'Estado',         x: 457, w: 85  },
      { label: 'Fecha Registro', x: 545, w: 115 },
      { label: 'F. Límite',      x: 663, w: 72  },
      { label: 'Monto',          x: 738, w: 64  },
    ];

    const dibujarEncabezado = () => {
      doc.rect(0, 0, 842, 65).fill(azul);
      doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
         .text('MUNICIPALIDAD DISTRITAL DE CARMEN ALTO', 40, 12, { align: 'center', width: 762 });
      doc.fontSize(9).font('Helvetica')
         .text('Sistema de Trámite Documentario — Reporte de Expedientes por Área', 40, 30, { align: 'center', width: 762 });
      doc.fontSize(7)
         .text(`Generado: ${new Date().toLocaleString('es-PE')} | Total: ${expedientes.length} expedientes`, 40, 48, { align: 'center', width: 762 });
    };

    const dibujarCabeceras = (y: number) => {
      doc.rect(40, y, 762, 15).fill(azul);
      cols.forEach((col) => {
        doc.fillColor('white').fontSize(6.5).font('Helvetica-Bold')
           .text(col.label, col.x + 2, y + 4, { width: col.w - 4 });
      });
      return y + 15;
    };

    const dibujarSubtituloArea = (area: string, total: number, y: number) => {
      doc.rect(40, y, 762, 14).fill('#e8f0fe');
      doc.fillColor(azul).fontSize(8).font('Helvetica-Bold')
         .text(`ÁREA: ${area.toUpperCase()}  (${total} expediente${total !== 1 ? 's' : ''})`, 45, y + 3, { width: 750 });
      return y + 14;
    };

    const dibujarPie = () => {
      doc.rect(0, 565, 842, 25).fill(azul);
      doc.fillColor('white').fontSize(7).font('Helvetica')
         .text('Municipalidad Distrital de Carmen Alto — Sistema de Trámite Documentario', 40, 573, { align: 'center', width: 762 });
    };

    dibujarEncabezado();
    let y = 75;
    y = dibujarCabeceras(y);

    let primerGrupo = true;
    grupos.forEach((exps, areaNombre) => {
      if (y > 510) {
        dibujarPie();
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
        y = 40;
        y = dibujarCabeceras(y);
      } else if (!primerGrupo) {
        y += 6;
      }
      primerGrupo = false;
      y = dibujarSubtituloArea(areaNombre, exps.length, y);

      exps.forEach((exp, idx) => {
        if (y > 530) {
          dibujarPie();
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
          y = 40;
          y = dibujarCabeceras(y);
          y = dibujarSubtituloArea(`${areaNombre} (cont.)`, exps.length, y);
        }

        const bgColor  = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const estColor = estadoColoresPdf[exp.estado] ?? bgColor;
        const pago     = exp.pagos[0];

        doc.rect(40, y, 762, 13).fill(bgColor).stroke('#e5e7eb');
        doc.rect(cols[4].x, y, cols[4].w, 13).fill(estColor);

        const datos = [
          { x: cols[0].x, w: cols[0].w, text: exp.codigo,                     bold: true,  color: azul      },
          { x: cols[1].x, w: cols[1].w, text: `${exp.ciudadano.apellido_pat}, ${exp.ciudadano.nombres}`, bold: false, color: negro },
          { x: cols[2].x, w: cols[2].w, text: exp.ciudadano.dni,              bold: false, color: gris      },
          { x: cols[3].x, w: cols[3].w, text: exp.tipoTramite.nombre,         bold: false, color: negro     },
          { x: cols[4].x, w: cols[4].w, text: exp.estado.replace(/_/g, ' '),  bold: true,  color: '#92400e' },
          { x: cols[5].x, w: cols[5].w, text: fmtFechaHora(exp.fecha_registro), bold: false, color: gris    },
          { x: cols[6].x, w: cols[6].w, text: fmtFecha(exp.fecha_limite),     bold: false, color: gris      },
          { x: cols[7].x, w: cols[7].w, text: pago ? `S/ ${Number(pago.monto_cobrado).toFixed(2)}` : '—', bold: true, color: '#15803d' },
        ];

        datos.forEach((d) => {
          doc.fillColor(d.color).fontSize(6.5)
             .font(d.bold ? 'Helvetica-Bold' : 'Helvetica')
             .text(d.text, d.x + 2, y + 3, { width: d.w - 4, ellipsis: true });
        });
        y += 13;
      });

      // Subtotal área
      const montoArea = exps.reduce((s, e) => s + (e.pagos[0] ? Number(e.pagos[0].monto_cobrado) : 0), 0);
      doc.rect(40, y, 762, 12).fill('#f0f9ff');
      doc.fillColor(azul).fontSize(7).font('Helvetica-Bold')
         .text(`Subtotal ${areaNombre}: S/ ${montoArea.toFixed(2)}`, 45, y + 2, { width: 750, align: 'right' });
      y += 12;
    });

    // Total general
    const montoTotal = expedientes.reduce((s, e) => s + (e.pagos[0] ? Number(e.pagos[0].monto_cobrado) : 0), 0);
    if (y > 540) {
      dibujarPie();
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
      y = 40;
    }
    y += 6;
    doc.rect(40, y, 762, 14).fill('#dcfce7');
    doc.fillColor('#15803d').fontSize(8).font('Helvetica-Bold')
       .text(`TOTAL GENERAL: ${expedientes.length} expedientes | Recaudado: S/ ${montoTotal.toFixed(2)}`, 45, y + 3, { width: 750, align: 'right' });

    dibujarPie();
    doc.end();
  } catch (err) { next(err); }
};

// ── GET /api/reportes/datos ──────────────────────────────────
export const getDatosReporte = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { rol, areaId } = req.usuario!;

    // JEFE_AREA solo ve su área en los filtros
    const areasQuery = rol === 'JEFE_AREA' && areaId
      ? { where: { id: areaId } }
      : {};

    const areas = await prisma.area.findMany({
  where: rol === 'JEFE_AREA' && areaId ? { id: areaId } : undefined,
  select:  { id: true, nombre: true, sigla: true },
  orderBy: { nombre: 'asc' },
});
    const tipos   = await prisma.tipoTramite.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
    const estados = [
      'PENDIENTE_PAGO','RECIBIDO','EN_REVISION_MDP','DERIVADO',
      'EN_PROCESO','LISTO_DESCARGA','PDF_FIRMADO','RESUELTO',
      'OBSERVADO','RECHAZADO','ARCHIVADO',
    ];
    res.json({ areas, tipos, estados, rol });
  } catch (err) { next(err); }
};