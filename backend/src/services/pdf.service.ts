// src/services/pdf.service.ts
// Cargo de recepción con colores institucionales #216ece y #4abdef
// Logo cargado desde Supabase Storage via sharp → PNG buffer
// Una sola página garantizada.

import PDFDocument from 'pdfkit';
import sharp       from 'sharp';

interface DatosCargoRecepcion {
  codigo:         string;
  ciudadano:      { nombres: string; apellido_pat: string; apellido_mat: string; dni: string };
  tipoTramite:    { nombre: string; plazo_dias: number; costo_soles: number };
  fecha_registro: Date;
  fecha_limite:   Date;
  area:           string;
}

// Colores institucionales
const AZUL_PRIMARIO   = '#216ece';
const AZUL_SECUNDARIO = '#4abdef';
const AZUL_OSCURO     = '#1a4f8a';
const AZUL_CLARO      = '#e8f4fd';
const GRIS            = '#6b7280';
const NEGRO           = '#111827';

const LOGO_URL = 'https://hibajtrydjemcmljpwky.supabase.co/storage/v1/object/public/documentos/assets/logoCA.png';

const getLogoPng = async (): Promise<Buffer> => {
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) throw new Error('No se pudo descargar el logo');
    const arrayBuffer = await response.arrayBuffer();
    return await sharp(Buffer.from(arrayBuffer))
      .resize(60, 60, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
  } catch {
    return Buffer.alloc(0);
  }
};

export const pdfService = {
  generarCargoRecepcion: async (datos: DatosCargoRecepcion): Promise<Buffer> => {
    return new Promise(async (resolve, reject) => {
      try {
        const logoPng = await getLogoPng();

        // autoFirstPage: false para controlar exactamente 1 página
        const doc    = new PDFDocument({
          size:          'A4',
          margin:        0,
          bufferPages:   true,
          autoFirstPage: false,
        });
        const chunks: Buffer[] = [];

        doc.on('data',  (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        doc.on('end',   () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        // Agregar exactamente una página
        doc.addPage({ size: 'A4', margin: 0 });

        // ── Encabezado ───────────────────────────────────────
        doc.rect(0, 0, 595, 110).fill(AZUL_PRIMARIO);
        doc.rect(0, 88, 595, 22).fill(AZUL_OSCURO);

        if (logoPng.length > 0) {
          doc.image(logoPng, 50, 14, { width: 55, height: 55 });
        }

        doc.fillColor('white')
           .fontSize(13).font('Helvetica-Bold')
           .text('MUNICIPALIDAD DISTRITAL DE CARMEN ALTO', 115, 20, { width: 430, lineBreak: false });
        doc.fontSize(8).font('Helvetica')
           .text('Carmen Alto, Huamanga, Ayacucho — Perú', 115, 38, { width: 430, lineBreak: false });
        doc.fontSize(8).font('Helvetica')
           .text('Sistema de Trámite Documentario', 115, 52, { width: 430, lineBreak: false });

        doc.fillColor(AZUL_SECUNDARIO).fontSize(10).font('Helvetica-Bold')
           .text('CARGO DE RECEPCIÓN DE EXPEDIENTE', 0, 95, { align: 'center', width: 595, lineBreak: false });

        // Línea decorativa
        doc.rect(0, 110, 595, 3).fill(AZUL_SECUNDARIO);

        // ── Número de expediente ─────────────────────────────
        doc.rect(50, 126, 495, 46).fillAndStroke(AZUL_CLARO, AZUL_PRIMARIO);

        doc.fillColor(AZUL_PRIMARIO).fontSize(8).font('Helvetica-Bold')
           .text('NÚMERO DE EXPEDIENTE', 65, 133, { lineBreak: false });
        doc.fillColor(AZUL_OSCURO).fontSize(18).font('Helvetica-Bold')
           .text(datos.codigo, 65, 146, { lineBreak: false });

        doc.rect(505, 130, 32, 32).fill(AZUL_PRIMARIO);
        doc.fillColor('white').fontSize(6).font('Helvetica')
           .text('CÓDIGO\nÚNICO', 508, 139, { width: 26, align: 'center' });

        // ── Helper: título de sección ────────────────────────
        const seccionTitulo = (titulo: string, y: number): number => {
          doc.rect(50, y, 495, 18).fill(AZUL_PRIMARIO);
          doc.fillColor('white').fontSize(8).font('Helvetica-Bold')
             .text(`  ${titulo}`, 55, y + 4, { width: 480, lineBreak: false });
          return y + 18;
        };

        // ── Helper: campo ─────────────────────────────────────
        const campo = (label: string, valor: string, x: number, y: number, ancho = 230) => {
          doc.fillColor(GRIS).fontSize(7).font('Helvetica')
             .text(label, x, y, { lineBreak: false });
          doc.fillColor(NEGRO).fontSize(9).font('Helvetica')
             .text(valor, x, y + 10, { width: ancho, lineBreak: false });
        };

        // ── Datos del ciudadano ──────────────────────────────
        let y = seccionTitulo('DATOS DEL CIUDADANO', 186);
        y += 6;
        campo(
          'Apellidos y Nombres',
          `${datos.ciudadano.apellido_pat} ${datos.ciudadano.apellido_mat}, ${datos.ciudadano.nombres}`,
          55, y, 480
        );
        y += 26;
        campo('Número de DNI', datos.ciudadano.dni, 55, y);

        // ── Datos del trámite ────────────────────────────────
        y += 28;
        y = seccionTitulo('DATOS DEL TRÁMITE', y);
        y += 6;
        campo('Tipo de Trámite', datos.tipoTramite.nombre, 55, y, 480);
        y += 26;
        campo('Área Responsable',  datos.area,                                               55,  y);
        campo('Costo del Trámite', `S/ ${Number(datos.tipoTramite.costo_soles).toFixed(2)}`, 305, y);
        y += 26;
        campo('Plazo de Atención', `${datos.tipoTramite.plazo_dias} días hábiles`, 55, y);

        // ── Fechas ───────────────────────────────────────────
        y += 28;
        y = seccionTitulo('FECHAS IMPORTANTES', y);
        y += 6;

        const fmt = (d: Date) => new Date(d).toLocaleString('es-PE', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });

        campo('Fecha y Hora de Ingreso',  fmt(datos.fecha_registro), 55,  y);
        campo('Fecha Límite de Atención', fmt(datos.fecha_limite),   305, y);

        // ── Aviso pago ───────────────────────────────────────
        y += 32;
        doc.rect(50, y, 495, 40).fillAndStroke('#fff8e1', '#f59e0b');
        doc.fillColor('#92400e').fontSize(7.5).font('Helvetica-Bold')
           .text('⚠  PRÓXIMO PASO — PAGO EN VENTANILLA DE CAJA', 62, y + 6, { lineBreak: false });
        doc.fillColor('#78350f').fontSize(7.5).font('Helvetica')
           .text(
             `Acérquese a Caja con este cargo y realice el pago de S/ ${Number(datos.tipoTramite.costo_soles).toFixed(2)} para activar su trámite.`,
             62, y + 18, { width: 468, lineBreak: false }
           );

        // ── Consulta en línea ────────────────────────────────
        y += 50;
        doc.rect(50, y, 495, 24).fillAndStroke(AZUL_CLARO, AZUL_SECUNDARIO);
        doc.fillColor(AZUL_PRIMARIO).fontSize(7.5).font('Helvetica-Bold')
           .text(
             `Consulte el avance de su trámite en línea con el código: ${datos.codigo}`,
             62, y + 7, { width: 468, align: 'center', lineBreak: false }
           );

        // ── Firma ────────────────────────────────────────────
        y += 36;
        doc.moveTo(185, y + 18).lineTo(410, y + 18)
           .strokeColor(NEGRO).lineWidth(0.5).stroke();
        doc.fillColor(NEGRO).fontSize(8.5).font('Helvetica-Bold')
           .text('Mesa de Partes', 0, y + 22, { align: 'center', width: 595, lineBreak: false });
        doc.fillColor(GRIS).fontSize(7.5).font('Helvetica')
           .text('Municipalidad Distrital de Carmen Alto', 0, y + 34, { align: 'center', width: 595, lineBreak: false });

        // ── Pie de página — posición absoluta ────────────────
        doc.rect(0, 800, 595, 42).fill(AZUL_OSCURO);
        doc.rect(0, 800, 595, 4).fill(AZUL_SECUNDARIO);
        doc.fillColor('white').fontSize(7).font('Helvetica')
           .text(
             `Documento generado el ${new Date().toLocaleString('es-PE')}`,
             50, 810, { align: 'center', width: 495, lineBreak: false }
           );
        doc.fillColor(AZUL_SECUNDARIO).fontSize(7).font('Helvetica')
           .text(
             'Sistema de Trámite Documentario — Municipalidad Distrital de Carmen Alto',
             50, 823, { align: 'center', width: 495, lineBreak: false }
           );

        doc.end();
      } catch (err) { reject(err); }
    });
  },
};