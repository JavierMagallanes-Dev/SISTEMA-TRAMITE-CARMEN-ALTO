// src/services/pdf.service.ts
// Cargo de recepción con colores institucionales #216ece y #4abdef
// Logo cargado desde src/assets/logoCA.webp via sharp → PNG buffer

import PDFDocument from 'pdfkit';
import sharp       from 'sharp';
import path        from 'path';

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
    // Si falla la carga del logo retorna un buffer vacío y el PDF se genera sin logo
    return Buffer.alloc(0);
  }
};

export const pdfService = {
  generarCargoRecepcion: async (datos: DatosCargoRecepcion): Promise<Buffer> => {
    return new Promise(async (resolve, reject) => {
      try {
        const logoPng = await getLogoPng();
        const doc     = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        const chunks: Buffer[] = [];

        doc.on('data',  (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        doc.on('end',   () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        // ── Encabezado con gradiente simulado ───────────────
        doc.rect(0, 0, 595, 120).fill(AZUL_PRIMARIO);
        doc.rect(0, 90, 595, 30).fill(AZUL_OSCURO);

        // Logo
        if (logoPng.length > 0) {
  doc.image(logoPng, 50, 15, { width: 60, height: 60 });
}

        // Texto encabezado
        doc.fillColor('white')
           .fontSize(15).font('Helvetica-Bold')
           .text('MUNICIPALIDAD DISTRITAL DE CARMEN ALTO', 120, 22, { width: 430 });
        doc.fontSize(9).font('Helvetica')
           .text('Dirección: Carmen Alto, Huamanga, Ayacucho — Perú', 120, 42, { width: 430 });
        doc.fontSize(9).font('Helvetica')
           .text('Sistema de Trámite Documentario', 120, 56, { width: 430 });

        // Título documento
        doc.fillColor(AZUL_SECUNDARIO).fontSize(11).font('Helvetica-Bold')
           .text('CARGO DE RECEPCIÓN DE EXPEDIENTE', 0, 98, { align: 'center', width: 595 });

        // Línea decorativa secundaria
        doc.rect(0, 120, 595, 3).fill(AZUL_SECUNDARIO);

        // ── Número de expediente ─────────────────────────────
        doc.rect(50, 140, 495, 50)
           .fillAndStroke(AZUL_CLARO, AZUL_PRIMARIO);

        doc.fillColor(AZUL_PRIMARIO).fontSize(9).font('Helvetica-Bold')
           .text('NÚMERO DE EXPEDIENTE', 65, 148);
        doc.fillColor(AZUL_OSCURO).fontSize(20).font('Helvetica-Bold')
           .text(datos.codigo, 65, 162);

        // Código QR simulado (cuadro decorativo)
        doc.rect(505, 145, 35, 35).fill(AZUL_PRIMARIO);
        doc.fillColor('white').fontSize(6).font('Helvetica')
           .text('CÓDIGO\nÚNICO', 509, 153, { width: 27, align: 'center' });

        // ── Sección: Datos del ciudadano ─────────────────────
        const seccionTitulo = (titulo: string, y: number) => {
          doc.rect(50, y, 495, 20).fill(AZUL_PRIMARIO);
          doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
             .text(`  ${titulo}`, 55, y + 5, { width: 480 });
          return y + 20;
        };

        const campo = (label: string, valor: string, x: number, y: number, ancho = 230) => {
          doc.fillColor(GRIS).fontSize(7.5).font('Helvetica')
             .text(label, x, y);
          doc.fillColor(NEGRO).fontSize(10).font('Helvetica')
             .text(valor, x, y + 11, { width: ancho });
        };

        let y = seccionTitulo('DATOS DEL CIUDADANO', 208);
        y += 8;
        campo('Apellidos y Nombres',
          `${datos.ciudadano.apellido_pat} ${datos.ciudadano.apellido_mat}, ${datos.ciudadano.nombres}`,
          55, y, 480);
        y += 30;
        campo('Número de DNI', datos.ciudadano.dni, 55, y);

        // ── Sección: Datos del trámite ───────────────────────
        y += 35;
        y = seccionTitulo('DATOS DEL TRÁMITE', y);
        y += 8;
        campo('Tipo de Trámite',   datos.tipoTramite.nombre,                               55,  y, 480);
        y += 30;
        campo('Área Responsable',  datos.area,                                              55,  y);
        campo('Costo del Trámite', `S/ ${Number(datos.tipoTramite.costo_soles).toFixed(2)}`, 300, y);
        y += 30;
        campo('Plazo de Atención', `${datos.tipoTramite.plazo_dias} días hábiles`,          55,  y);

        // ── Sección: Fechas ──────────────────────────────────
        y += 35;
        y = seccionTitulo('FECHAS IMPORTANTES', y);
        y += 8;

        const fmt = (d: Date) => new Date(d).toLocaleString('es-PE', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });

        campo('Fecha y Hora de Ingreso',    fmt(datos.fecha_registro), 55,  y);
        campo('Fecha Límite de Atención',   fmt(datos.fecha_limite),   300, y);

        // ── Aviso pago ───────────────────────────────────────
        y += 40;
        doc.rect(50, y, 495, 45).fillAndStroke('#fff8e1', '#f59e0b');
        doc.fillColor('#92400e').fontSize(8).font('Helvetica-Bold')
           .text('⚠  PRÓXIMO PASO — PAGO EN VENTANILLA DE CAJA', 62, y + 7);
        doc.fillColor('#78350f').fontSize(8).font('Helvetica')
           .text(
             `Acérquese a la ventanilla de Caja con este cargo y realice el pago de S/ ${Number(datos.tipoTramite.costo_soles).toFixed(2)} para activar su trámite. Sin el pago su expediente no será procesado.`,
             62, y + 19, { width: 470 }
           );

        // ── Consulta en línea ────────────────────────────────
        y += 55;
        doc.rect(50, y, 495, 28).fillAndStroke(AZUL_CLARO, AZUL_SECUNDARIO);
        doc.fillColor(AZUL_PRIMARIO).fontSize(8).font('Helvetica-Bold')
           .text(`Consulte el avance de su trámite en línea con el código: ${datos.codigo}`, 62, y + 9, { width: 470, align: 'center' });

        // ── Firma ────────────────────────────────────────────
        y += 45;
        doc.moveTo(175, y + 20).lineTo(420, y + 20).strokeColor(NEGRO).lineWidth(0.5).stroke();
        doc.fillColor(NEGRO).fontSize(9).font('Helvetica-Bold')
           .text('Mesa de Partes', 0, y + 25, { align: 'center', width: 595 });
        doc.fillColor(GRIS).fontSize(8).font('Helvetica')
           .text('Municipalidad Distrital de Carmen Alto', 0, y + 38, { align: 'center', width: 595 });

        // ── Pie de página ────────────────────────────────────
        doc.rect(0, 800, 595, 42).fill(AZUL_OSCURO);
        doc.rect(0, 800, 595, 4).fill(AZUL_SECUNDARIO);
        doc.fillColor('white').fontSize(7).font('Helvetica')
           .text(`Documento generado el ${new Date().toLocaleString('es-PE')}`, 50, 810, { align: 'center', width: 495 });
        doc.fillColor(AZUL_SECUNDARIO).fontSize(7).font('Helvetica')
           .text('Sistema de Trámite Documentario — Municipalidad Distrital de Carmen Alto', 50, 822, { align: 'center', width: 495 });

        doc.end();
      } catch (err) { reject(err); }
    });
  },
};