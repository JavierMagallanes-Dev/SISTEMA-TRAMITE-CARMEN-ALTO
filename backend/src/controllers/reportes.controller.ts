// src/controllers/reportes.controller.ts
// RF22: Reportes exportables en Excel y PDF con filtros.
// ADMIN          → todos los expedientes, todas las áreas
// MESA_DE_PARTES → todos los expedientes (con área destino y estado)
// JEFE_AREA      → solo expedientes de su área

import { Request, Response, NextFunction } from 'express';
import { prisma }  from '../config/prisma';
import PDFDocument from 'pdfkit';
import ExcelJS     from 'exceljs';
import sharp       from 'sharp';
import path        from 'path';

const AZUL_PRIMARIO   = '#216ece';
const AZUL_SECUNDARIO = '#4abdef';
const AZUL_OSCURO     = '#1a4f8a';
const AZUL_CLARO      = '#e8f4fd';
const GRIS            = '#6b7280';
const NEGRO           = '#111827';

const LOGO_PATH = path.join(__dirname, '../assets/logoCA.webp');

const getLogoPng = (): Promise<Buffer> =>
  sharp(LOGO_PATH)
    .resize(55, 55, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

// ── Helper: construir filtros según rol ──────────────────────
const buildWhere = (query: Record<string, string>, req: Request) => {
  const where: Record<string, any> = {};
  const { rol, areaId } = req.usuario!;

  // JEFE_AREA: solo su área
  if (rol === 'JEFE_AREA' && areaId) {
    where.areaActualId = areaId;
  }
  // ADMIN: puede filtrar por área específica
  else if (rol === 'ADMIN' && query.areaId) {
    where.areaActualId = Number(query.areaId);
  }
  // MESA_DE_PARTES: ve todos — sin filtro de área

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
      ciudadano:      { select: { dni: true, nombres: true, apellido_pat: true, apellido_mat: true } },
      tipoTramite:    { select: { nombre: true, costo_soles: true } },
      areaActual:     { select: { nombre: true, sigla: true } },
      registradoPor:  { select: { nombre_completo: true } },
      movimientos: {
        where:   { tipo_accion: 'DERIVACION' },
        select:  { areaDestino: { select: { nombre: true, sigla: true } }, fecha_hora: true },
        orderBy: { fecha_hora: 'desc' },
        take:    1,
      },
      pagos: { where: { estado: 'VERIFICADO' }, select: { monto_cobrado: true, boleta: true }, take: 1 },
    },
    orderBy: [{ fecha_registro: 'desc' }],
  });
};

const fmtFechaHora = (d: Date) =>
  new Date(d).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const estadoColoresPdf: Record<string, string> = {
  RESUELTO: '#dcfce7', OBSERVADO: '#fef9c3', RECHAZADO: '#fee2e2',
  EN_PROCESO: '#ffedd5', LISTO_DESCARGA: '#cffafe', DERIVADO: '#e0e7ff',
  PENDIENTE_PAGO: '#fef3c7', RECIBIDO: '#dbeafe', PDF_FIRMADO: '#ccfbf1',
  EN_REVISION_MDP: '#ede9fe', ARCHIVADO: '#f3f4f6',
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
    const { rol } = req.usuario!;
    const where       = buildWhere(req.query as Record<string, string>, req);
    const expedientes = await getExpedientes(where);

    const workbook   = new ExcelJS.Workbook();
    workbook.creator = 'Municipalidad Distrital de Carmen Alto';
    workbook.created = new Date();

    const addEncabezado = (sheet: ExcelJS.Worksheet, titulo: string, total: number) => {
      sheet.mergeCells('A1:L1');
      sheet.getCell('A1').value     = 'MUNICIPALIDAD DISTRITAL DE CARMEN ALTO';
      sheet.getCell('A1').font      = { bold: true, size: 14, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
      sheet.getCell('A1').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF216ece' } };
      sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height        = 32;

      sheet.mergeCells('A2:L2');
      sheet.getCell('A2').value     = titulo;
      sheet.getCell('A2').font      = { size: 11, color: { argb: 'FF216ece' }, name: 'Calibri' };
      sheet.getCell('A2').fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe8f4fd' } };
      sheet.getCell('A2').alignment = { horizontal: 'center' };
      sheet.getRow(2).height        = 22;

      sheet.mergeCells('A3:L3');
      sheet.getCell('A3').value     = `Generado: ${new Date().toLocaleString('es-PE')} | Total: ${total} expedientes`;
      sheet.getCell('A3').font      = { size: 9, color: { argb: 'FF6b7280' }, name: 'Calibri' };
      sheet.getCell('A3').alignment = { horizontal: 'center' };
      sheet.addRow([]);
    };

    // Columnas según rol
    const esMDP = rol === 'MESA_DE_PARTES';

    const addHeaders = (sheet: ExcelJS.Worksheet) => {
      const headers = esMDP
        ? ['N°', 'Código', 'Ciudadano', 'DNI', 'Tipo Trámite', 'Estado', 'Área Actual', 'Área Derivada', 'Registrado por', 'F. Registro', 'F. Límite', 'Monto (S/)']
        : ['N°', 'Código', 'Ciudadano', 'DNI', 'Tipo Trámite', 'Estado', 'Área', 'F. Registro y Hora', 'F. Límite', 'F. Resolución', 'Monto (S/)', ''];
      const widths = esMDP
        ? [5, 20, 28, 12, 26, 18, 22, 22, 22, 16, 14, 12]
        : [5, 20, 28, 12, 26, 18, 22, 22, 14, 16, 12, 5];

      sheet.columns = headers.map((h, i) => ({ header: h, key: h, width: widths[i] }));
      const headerRow = sheet.getRow(5);
      headerRow.values = headers;
      headerRow.eachCell((cell) => {
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF216ece' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border    = { bottom: { style: 'thin', color: { argb: 'FF4abdef' } } };
      });
      headerRow.height = 22;
    };

    const addFila = (sheet: ExcelJS.Worksheet, exp: typeof expedientes[0], idx: number) => {
      const pago       = exp.pagos[0];
      const color      = estadoColoresXls[exp.estado] ?? 'FFFFFFFF';
      const fila       = idx % 2 === 0 ? 'FFFFFFFF' : 'FFf0f7ff';
      const areaDerivada = exp.movimientos[0]?.areaDestino?.nombre ?? '—';

      const valores = esMDP
        ? [
            idx + 1, exp.codigo,
            `${exp.ciudadano.apellido_pat} ${exp.ciudadano.apellido_mat}, ${exp.ciudadano.nombres}`,
            exp.ciudadano.dni, exp.tipoTramite.nombre,
            exp.estado.replace(/_/g, ' '),
            exp.areaActual?.nombre ?? '—',
            areaDerivada,
            exp.registradoPor?.nombre_completo ?? '—',
            fmtFecha(exp.fecha_registro),
            fmtFecha(exp.fecha_limite),
            pago ? Number(pago.monto_cobrado) : 0,
          ]
        : [
            idx + 1, exp.codigo,
            `${exp.ciudadano.apellido_pat} ${exp.ciudadano.apellido_mat}, ${exp.ciudadano.nombres}`,
            exp.ciudadano.dni, exp.tipoTramite.nombre,
            exp.estado.replace(/_/g, ' '),
            exp.areaActual?.nombre ?? '—',
            fmtFechaHora(exp.fecha_registro),
            fmtFecha(exp.fecha_limite),
            exp.fecha_resolucion ? fmtFecha(exp.fecha_resolucion) : '—',
            pago ? Number(pago.monto_cobrado) : 0, '',
          ];

      const row = sheet.addRow(valores);
      row.eachCell((cell, colNum) => {
        cell.font      = { name: 'Calibri', size: 9 };
        cell.alignment = { vertical: 'middle' };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: colNum === 6 ? color : fila } };
        cell.border    = { bottom: { style: 'hair', color: { argb: 'FFd1e9f7' } } };
      });
      const montoCol = esMDP ? 12 : 11;
      row.getCell(montoCol).numFmt = '"S/ "#,##0.00';
    };

    const addTotal = (sheet: ExcelJS.Worksheet, exps: typeof expedientes, label = 'TOTAL') => {
      const montoCol = esMDP ? 12 : 11;
      const totalRow = sheet.addRow([]);
      totalRow.getCell(2).value    = label;
      totalRow.getCell(2).font     = { bold: true, name: 'Calibri', color: { argb: 'FF216ece' } };
      totalRow.getCell(montoCol).value  = exps.reduce((s, e) => s + (e.pagos[0] ? Number(e.pagos[0].monto_cobrado) : 0), 0);
      totalRow.getCell(montoCol).numFmt = '"S/ "#,##0.00';
      totalRow.getCell(montoCol).font   = { bold: true, name: 'Calibri', color: { argb: 'FF216ece' } };
      totalRow.getCell(montoCol).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe8f4fd' } };
    };

    if (esMDP) {
      // Mesa de Partes: una sola hoja con todos los expedientes
      const sheet = workbook.addWorksheet('Reporte Mesa de Partes', { pageSetup: { paperSize: 9, orientation: 'landscape' } });
      addEncabezado(sheet, 'Sistema de Trámite Documentario — Reporte Mesa de Partes', expedientes.length);
      addHeaders(sheet);
      expedientes.forEach((exp, idx) => addFila(sheet, exp, idx));
      addTotal(sheet, expedientes);
    } else {
      // ADMIN: hoja general + por área
      const grupos = new Map<string, typeof expedientes>();
      expedientes.forEach((exp) => {
        const area = exp.areaActual?.nombre ?? 'Sin área asignada';
        if (!grupos.has(area)) grupos.set(area, []);
        grupos.get(area)!.push(exp);
      });

      if (rol === 'ADMIN') {
        const sheetGeneral = workbook.addWorksheet('Todos los expedientes', { pageSetup: { paperSize: 9, orientation: 'landscape' } });
        addEncabezado(sheetGeneral, 'Sistema de Trámite Documentario — Reporte General', expedientes.length);
        addHeaders(sheetGeneral);
        expedientes.forEach((exp, idx) => addFila(sheetGeneral, exp, idx));
        addTotal(sheetGeneral, expedientes, 'TOTAL GENERAL');
      }

      grupos.forEach((exps, areaNombre) => {
        const sheet = workbook.addWorksheet(areaNombre.substring(0, 31), { pageSetup: { paperSize: 9, orientation: 'landscape' } });
        addEncabezado(sheet, `Expedientes — ${areaNombre}`, exps.length);
        addHeaders(sheet);
        exps.forEach((exp, idx) => addFila(sheet, exp, idx));
        addTotal(sheet, exps, `TOTAL ${areaNombre.toUpperCase()}`);
      });
    }

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
    const { rol } = req.usuario!;
    const where       = buildWhere(req.query as Record<string, string>, req);
    const expedientes = await getExpedientes(where);
    const logoPng     = await getLogoPng();
    const esMDP       = rol === 'MESA_DE_PARTES';

    const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-expedientes-${Date.now()}.pdf"`);
    doc.pipe(res);

    // Columnas para MDP (incluye área derivada)
    const colsMDP = [
      { label: 'Código',        x: 40,  w: 85  },
      { label: 'Ciudadano',     x: 128, w: 120 },
      { label: 'DNI',           x: 251, w: 55  },
      { label: 'Trámite',       x: 309, w: 110 },
      { label: 'Estado',        x: 422, w: 80  },
      { label: 'Área Actual',   x: 505, w: 90  },
      { label: 'Área Derivada', x: 598, w: 90  },
      { label: 'F. Registro',   x: 691, w: 90  },
      { label: 'Monto',         x: 784, w: 58  },
    ];

    // Columnas para Admin/Jefe
    const colsStd = [
      { label: 'Código',         x: 40,  w: 90  },
      { label: 'Ciudadano',      x: 133, w: 135 },
      { label: 'DNI',            x: 271, w: 58  },
      { label: 'Trámite',        x: 332, w: 115 },
      { label: 'Estado',         x: 450, w: 88  },
      { label: 'Fecha Registro', x: 541, w: 115 },
      { label: 'F. Límite',      x: 659, w: 72  },
      { label: 'Monto',          x: 734, w: 68  },
    ];

    const cols = esMDP ? colsMDP : colsStd;
    const totalAncho = esMDP ? 802 : 762;
    const xInicio    = esMDP ? 20 : 40;

    const dibujarEncabezado = (subtitulo: string) => {
      doc.rect(0, 0, 842, 70).fill(AZUL_PRIMARIO);
      doc.rect(0, 60, 842, 10).fill(AZUL_OSCURO);
      doc.rect(0, 70, 842, 3).fill(AZUL_SECUNDARIO);
      doc.image(logoPng, 15, 7, { width: 50, height: 50 });
      doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
         .text('MUNICIPALIDAD DISTRITAL DE CARMEN ALTO', 75, 10, { width: 752 });
      doc.fontSize(8).font('Helvetica')
         .text(subtitulo, 75, 28, { width: 752 });
      doc.fillColor(AZUL_SECUNDARIO).fontSize(7.5).font('Helvetica')
         .text(`Generado: ${new Date().toLocaleString('es-PE')} | Total: ${expedientes.length} expedientes`, 75, 44, { width: 752 });
    };

    const dibujarCabeceras = (y: number) => {
      doc.rect(xInicio, y, totalAncho, 16).fill(AZUL_PRIMARIO);
      doc.rect(xInicio, y + 14, totalAncho, 2).fill(AZUL_SECUNDARIO);
      cols.forEach((col) => {
        doc.fillColor('white').fontSize(6).font('Helvetica-Bold')
           .text(col.label, col.x + 2, y + 4, { width: col.w - 4 });
      });
      return y + 16;
    };

    const dibujarSubtituloArea = (area: string, total: number, y: number) => {
      doc.rect(xInicio, y, totalAncho, 14).fill(AZUL_CLARO);
      doc.rect(xInicio, y, 4, 14).fill(AZUL_SECUNDARIO);
      doc.fillColor(AZUL_OSCURO).fontSize(7.5).font('Helvetica-Bold')
         .text(`  ÁREA: ${area.toUpperCase()}  (${total} expediente${total !== 1 ? 's' : ''})`, xInicio + 8, y + 3, { width: totalAncho - 12 });
      return y + 14;
    };

    const dibujarPie = () => {
      doc.rect(0, 560, 842, 3).fill(AZUL_SECUNDARIO);
      doc.rect(0, 563, 842, 22).fill(AZUL_OSCURO);
      doc.fillColor('white').fontSize(7).font('Helvetica')
         .text('Municipalidad Distrital de Carmen Alto — Sistema de Trámite Documentario', xInicio, 570, { align: 'center', width: totalAncho });
    };

    const dibujarFila = (exp: typeof expedientes[0], idx: number, y: number) => {
      const bgColor  = idx % 2 === 0 ? '#ffffff' : '#f0f7ff';
      const estColor = estadoColoresPdf[exp.estado] ?? bgColor;
      const pago     = exp.pagos[0];
      const estCol   = esMDP ? cols[4] : cols[4];

      doc.rect(xInicio, y, totalAncho, 13).fill(bgColor).stroke('#d1e9f7');
      doc.rect(estCol.x, y, estCol.w, 13).fill(estColor);

      if (esMDP) {
        const areaDerivada = exp.movimientos[0]?.areaDestino?.nombre ?? '—';
        const datos = [
          { x: cols[0].x, w: cols[0].w, text: exp.codigo,                        bold: true,  color: AZUL_PRIMARIO },
          { x: cols[1].x, w: cols[1].w, text: `${exp.ciudadano.apellido_pat}, ${exp.ciudadano.nombres}`, bold: false, color: NEGRO },
          { x: cols[2].x, w: cols[2].w, text: exp.ciudadano.dni,                  bold: false, color: GRIS         },
          { x: cols[3].x, w: cols[3].w, text: exp.tipoTramite.nombre,             bold: false, color: NEGRO        },
          { x: cols[4].x, w: cols[4].w, text: exp.estado.replace(/_/g, ' '),      bold: true,  color: '#1a4f8a'    },
          { x: cols[5].x, w: cols[5].w, text: exp.areaActual?.nombre ?? '—',      bold: false, color: NEGRO        },
          { x: cols[6].x, w: cols[6].w, text: areaDerivada,                       bold: false, color: AZUL_OSCURO  },
          { x: cols[7].x, w: cols[7].w, text: fmtFecha(exp.fecha_registro),       bold: false, color: GRIS         },
          { x: cols[8].x, w: cols[8].w, text: pago ? `S/ ${Number(pago.monto_cobrado).toFixed(2)}` : '—', bold: true, color: '#1a4f8a' },
        ];
        datos.forEach((d) => {
          doc.fillColor(d.color).fontSize(6)
             .font(d.bold ? 'Helvetica-Bold' : 'Helvetica')
             .text(d.text, d.x + 2, y + 3, { width: d.w - 4, ellipsis: true });
        });
      } else {
        const datos = [
          { x: cols[0].x, w: cols[0].w, text: exp.codigo,                        bold: true,  color: AZUL_PRIMARIO },
          { x: cols[1].x, w: cols[1].w, text: `${exp.ciudadano.apellido_pat}, ${exp.ciudadano.nombres}`, bold: false, color: NEGRO },
          { x: cols[2].x, w: cols[2].w, text: exp.ciudadano.dni,                  bold: false, color: GRIS         },
          { x: cols[3].x, w: cols[3].w, text: exp.tipoTramite.nombre,             bold: false, color: NEGRO        },
          { x: cols[4].x, w: cols[4].w, text: exp.estado.replace(/_/g, ' '),      bold: true,  color: '#1a4f8a'    },
          { x: cols[5].x, w: cols[5].w, text: fmtFechaHora(exp.fecha_registro),   bold: false, color: GRIS         },
          { x: cols[6].x, w: cols[6].w, text: fmtFecha(exp.fecha_limite),         bold: false, color: GRIS         },
          { x: cols[7].x, w: cols[7].w, text: pago ? `S/ ${Number(pago.monto_cobrado).toFixed(2)}` : '—', bold: true, color: '#1a4f8a' },
        ];
        datos.forEach((d) => {
          doc.fillColor(d.color).fontSize(6.5)
             .font(d.bold ? 'Helvetica-Bold' : 'Helvetica')
             .text(d.text, d.x + 2, y + 3, { width: d.w - 4, ellipsis: true });
        });
      }
    };

    // ── Generar PDF según rol ────────────────────────────────
    if (esMDP) {
      // Mesa de Partes: lista plana con todos los expedientes
      dibujarEncabezado('Sistema de Trámite Documentario — Reporte Mesa de Partes');
      let y = 80;
      y = dibujarCabeceras(y);

      expedientes.forEach((exp, idx) => {
        if (y > 528) {
          dibujarPie();
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
          y = 40;
          y = dibujarCabeceras(y);
        }
        dibujarFila(exp, idx, y);
        y += 13;
      });

      // Total
      const montoTotal = expedientes.reduce((s, e) => s + (e.pagos[0] ? Number(e.pagos[0].monto_cobrado) : 0), 0);
      if (y > 540) { dibujarPie(); doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 }); y = 40; }
      y += 5;
      doc.rect(xInicio, y, totalAncho, 14).fill(AZUL_PRIMARIO);
      doc.fillColor('white').fontSize(7.5).font('Helvetica-Bold')
         .text(`TOTAL: ${expedientes.length} expedientes | Recaudado: S/ ${montoTotal.toFixed(2)}`, xInicio + 5, y + 3, { width: totalAncho - 10, align: 'right' });

    } else {
      // Admin / Jefe: agrupado por área
      const grupos = new Map<string, typeof expedientes>();
      expedientes.forEach((exp) => {
        const area = exp.areaActual?.nombre ?? 'Sin área asignada';
        if (!grupos.has(area)) grupos.set(area, []);
        grupos.get(area)!.push(exp);
      });

      dibujarEncabezado('Sistema de Trámite Documentario — Reporte de Expedientes por Área');
      let y = 80;
      y = dibujarCabeceras(y);
      let primerGrupo = true;

      grupos.forEach((exps, areaNombre) => {
        if (y > 510) { dibujarPie(); doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 }); y = 40; y = dibujarCabeceras(y); }
        else if (!primerGrupo) y += 5;
        primerGrupo = false;
        y = dibujarSubtituloArea(areaNombre, exps.length, y);

        exps.forEach((exp, idx) => {
          if (y > 528) { dibujarPie(); doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 }); y = 40; y = dibujarCabeceras(y); y = dibujarSubtituloArea(`${areaNombre} (cont.)`, exps.length, y); }
          dibujarFila(exp, idx, y);
          y += 13;
        });

        const montoArea = exps.reduce((s, e) => s + (e.pagos[0] ? Number(e.pagos[0].monto_cobrado) : 0), 0);
        doc.rect(xInicio, y, totalAncho, 11).fill('#dbeafe');
        doc.rect(xInicio, y, totalAncho, 2).fill(AZUL_SECUNDARIO);
        doc.fillColor(AZUL_OSCURO).fontSize(6.5).font('Helvetica-Bold')
           .text(`Subtotal ${areaNombre}: S/ ${montoArea.toFixed(2)}`, xInicio + 5, y + 2, { width: totalAncho - 10, align: 'right' });
        y += 11;
      });

      const montoTotal = expedientes.reduce((s, e) => s + (e.pagos[0] ? Number(e.pagos[0].monto_cobrado) : 0), 0);
      if (y > 540) { dibujarPie(); doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 }); y = 40; }
      y += 5;
      doc.rect(xInicio, y, totalAncho, 14).fill(AZUL_PRIMARIO);
      doc.fillColor('white').fontSize(7.5).font('Helvetica-Bold')
         .text(`TOTAL GENERAL: ${expedientes.length} expedientes | Recaudado: S/ ${montoTotal.toFixed(2)}`, xInicio + 5, y + 3, { width: totalAncho - 10, align: 'right' });
    }

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

    const areas = await prisma.area.findMany({
      where:   rol === 'JEFE_AREA' && areaId ? { id: areaId } : undefined,
      select:  { id: true, nombre: true, sigla: true },
      orderBy: { nombre: 'asc' },
    });

    const tipos = await prisma.tipoTramite.findMany({
      where:   { activo: true },
      select:  { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });

    const estados = [
      'PENDIENTE_PAGO','RECIBIDO','EN_REVISION_MDP','DERIVADO',
      'EN_PROCESO','LISTO_DESCARGA','PDF_FIRMADO','RESUELTO',
      'OBSERVADO','RECHAZADO','ARCHIVADO',
    ];

    res.json({ areas, tipos, estados, rol });
  } catch (err) { next(err); }
};