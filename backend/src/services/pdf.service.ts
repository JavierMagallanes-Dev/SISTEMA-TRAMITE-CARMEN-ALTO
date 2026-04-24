// src/services/pdf.service.ts
import PDFDocument from 'pdfkit';

interface DatosCargoRecepcion {
  codigo:         string;
  ciudadano:      { nombres: string; apellido_pat: string; apellido_mat: string; dni: string };
  tipoTramite:    { nombre: string; plazo_dias: number; costo_soles: number };
  fecha_registro: Date;
  fecha_limite:   Date;
  area:           string;
}

export const pdfService = {
  generarCargoRecepcion: (datos: DatosCargoRecepcion): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      const doc    = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data',  (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      const azul  = '#1e40af';
      const gris  = '#6b7280';
      const negro = '#111827';

      // Encabezado
      doc.rect(0, 0, 595, 110).fill(azul);
      doc.fillColor('white').fontSize(16).font('Helvetica-Bold')
         .text('MUNICIPALIDAD DISTRITAL DE CARMEN ALTO', 50, 25, { align: 'center' });
      doc.fontSize(11).font('Helvetica')
         .text('Sistema de Trámite Documentario', 50, 50, { align: 'center' });
      doc.fontSize(13).font('Helvetica-Bold')
         .text('CARGO DE RECEPCIÓN', 50, 72, { align: 'center' });

      // Número expediente
      doc.fillColor(azul).rect(50, 130, 495, 55).stroke();
      doc.fillColor(azul).fontSize(11).font('Helvetica').text('NÚMERO DE EXPEDIENTE', 60, 138);
      doc.fillColor(negro).fontSize(22).font('Helvetica-Bold').text(datos.codigo, 60, 155);

      // Datos ciudadano
      doc.fillColor(negro).fontSize(13).font('Helvetica-Bold').text('DATOS DEL CIUDADANO', 50, 210);
      doc.moveTo(50, 227).lineTo(545, 227).strokeColor(azul).lineWidth(1.5).stroke();

      const fila = (label: string, valor: string, y: number) => {
        doc.fillColor(gris).fontSize(9).font('Helvetica').text(label, 50, y);
        doc.fillColor(negro).fontSize(11).font('Helvetica').text(valor, 50, y + 13);
      };

      fila('Apellidos y Nombres',
        `${datos.ciudadano.apellido_pat} ${datos.ciudadano.apellido_mat}, ${datos.ciudadano.nombres}`,
        235);
      fila('Número de DNI', datos.ciudadano.dni, 270);

      // Datos trámite
      doc.fillColor(negro).fontSize(13).font('Helvetica-Bold').text('DATOS DEL TRÁMITE', 50, 315);
      doc.moveTo(50, 332).lineTo(545, 332).strokeColor(azul).lineWidth(1.5).stroke();
      fila('Tipo de Trámite',   datos.tipoTramite.nombre, 340);
      fila('Área Responsable',  datos.area, 375);
      fila('Costo del Trámite', `S/ ${Number(datos.tipoTramite.costo_soles).toFixed(2)}`, 410);
      fila('Plazo de Atención', `${datos.tipoTramite.plazo_dias} días hábiles`, 445);

      // Fechas
      doc.fillColor(negro).fontSize(13).font('Helvetica-Bold').text('FECHAS IMPORTANTES', 50, 495);
      doc.moveTo(50, 512).lineTo(545, 512).strokeColor(azul).lineWidth(1.5).stroke();

      const fmt = (d: Date) => new Date(d).toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      doc.fillColor(gris).fontSize(9).font('Helvetica')
         .text('Fecha y Hora de Ingreso', 50, 522)
         .text('Fecha Límite de Atención', 300, 522);
      doc.fillColor(negro).fontSize(11).font('Helvetica')
         .text(fmt(datos.fecha_registro), 50, 535)
         .text(fmt(datos.fecha_limite),   300, 535);

      // Aviso
      doc.rect(50, 565, 495, 40).fillColor('#fef3c7').fill();
      doc.rect(50, 565, 495, 40).strokeColor('#f59e0b').lineWidth(1).stroke();
      doc.fillColor('#92400e').fontSize(9).font('Helvetica-Bold').text('IMPORTANTE:', 62, 573);
      doc.fillColor('#92400e').fontSize(9).font('Helvetica')
         .text(`Su trámite debe ser atendido antes del ${new Date(datos.fecha_limite).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}. Conserve este cargo como constancia.`, 62, 585, { width: 470 });

      // Instrucciones pago
      doc.rect(50, 620, 495, 55).fillColor('#eff6ff').fill();
      doc.rect(50, 620, 495, 55).strokeColor(azul).lineWidth(1).stroke();
      doc.fillColor(azul).fontSize(10).font('Helvetica-Bold').text('PRÓXIMO PASO — PAGO EN VENTANILLA', 62, 630);
      doc.fillColor('#1e3a8a').fontSize(9).font('Helvetica')
         .text(`Acérquese a Caja con este cargo y realice el pago de S/ ${Number(datos.tipoTramite.costo_soles).toFixed(2)} para activar su trámite.`, 62, 644, { width: 470 });

      // Consulta
      doc.fillColor(gris).fontSize(9).font('Helvetica')
         .text(`Consulte el estado de su trámite con el código ${datos.codigo} en el portal ciudadano.`, 50, 692, { align: 'center', width: 495 });

      // Firma
      doc.moveTo(175, 755).lineTo(420, 755).strokeColor(negro).lineWidth(0.5).stroke();
      doc.fillColor(negro).fontSize(10).font('Helvetica-Bold').text('Mesa de Partes', 50, 763, { align: 'center', width: 495 });
      doc.fillColor(gris).fontSize(9).font('Helvetica').text('Municipalidad Distrital de Carmen Alto', 50, 777, { align: 'center', width: 495 });

      // Pie
      doc.rect(0, 805, 595, 32).fillColor(azul).fill();
      doc.fillColor('white').fontSize(8).font('Helvetica')
         .text(`Generado el ${new Date().toLocaleString('es-PE')} — Sistema de Trámite Documentario`, 50, 815, { align: 'center', width: 495 });

      doc.end();
    });
  },
};