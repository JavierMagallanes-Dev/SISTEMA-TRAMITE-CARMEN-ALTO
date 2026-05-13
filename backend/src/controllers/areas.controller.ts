// src/controllers/areas.controller.ts
// Módulo de Áreas — Técnico y Jefe de Área.
// NUEVO: firma con imagen PNG + código de aprobación por email.

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { prisma }     from '../config/prisma';
import { AppError }   from '../middlewares/error.middleware';
import { notificarCambioEstado } from '../services/email.service';
import { storageService }        from '../services/storage.service';
import { Resend }                from 'resend';
import { env }                   from '../config/env';
import { crearNotificacion } from './notificaciones.controller';

const resend = new Resend(env.RESEND_API_KEY);

// Códigos de firma temporales: { usuarioId: { codigo, expira, expedienteId } }
const codigosFirma = new Map<number, { codigo: string; expira: Date; expedienteId: number }>();

const selectNotificacion = {
  codigo:      true,
  ciudadano:   { select: { email: true, nombres: true } },
  tipoTramite: { select: { nombre: true } },
  areaActual:  { select: { nombre: true } },
} as const;
// ── Helper: comentario automático según tipo de trámite ──────
const getComentarioAutomatico = (
  accion: 'TOMAR' | 'VISTO_BUENO' | 'FIRMA_TECNICO' | 'FIRMA_JEFE' | 'DERIVAR' | 'OBSERVAR',
  tipoTramiteId: number
): string => {
  const comentarios: Record<number, Record<string, string>> = {
    // Autorización Temporal para Puesto en Feria
    4: {
      TOMAR:         'Expediente tomado para evaluación técnica. Se verificará disponibilidad de espacio en padrón de ferias.',
      VISTO_BUENO:   'Espacio disponible confirmado. Inspección de campo realizada — no obstruye el tránsito. Listo para autorización.',
      FIRMA_TECNICO: 'Evaluación técnica completada. Puesto en feria cumple con los requisitos municipales establecidos.',
      FIRMA_JEFE:    'Autorización temporal de puesto en feria aprobada y firmada. Resolución disponible para recojo.',
      DERIVAR:       'Expediente derivado a Gerencia de Servicios Municipales para evaluación de disponibilidad y fiscalización.',
      OBSERVAR:      'Expediente observado. Se requiere subsanar documentación antes de continuar con la evaluación.',
    },
    // Celebración de Matrimonio Civil
    5: {
      TOMAR:         'Expediente tomado. Se inicia revisión de requisitos y apertura del pliego matrimonial.',
      VISTO_BUENO:   'Documentos verificados. Edicto matrimonial publicado — en espera del período legal de oposición (8-10 días hábiles).',
      FIRMA_TECNICO: 'Período de oposición cumplido sin observaciones. Fecha de ceremonia programada en salón de actos municipal.',
      FIRMA_JEFE:    'Acta matrimonial firmada oficialmente. Celebración de matrimonio civil realizada con éxito.',
      DERIVAR:       'Expediente derivado a Oficina de Registro del Estado Civil para apertura de pliego matrimonial.',
      OBSERVAR:      'Expediente observado. Documentos incompletos o con observaciones — se notifica a los contrayentes.',
    },
    // Licencia de Edificación
    3: {
      TOMAR:         'Expediente tomado. Se inicia verificación de planos y habilitación del arquitecto responsable.',
      VISTO_BUENO:   'Planos técnicos aprobados. Inspección técnica realizada en el predio — conforme con lo declarado.',
      FIRMA_TECNICO: 'Revisión técnica de planos completada. Copia literal SUNARP verificada. Conforme para emisión de licencia.',
      FIRMA_JEFE:    'Licencia de edificación emitida y firmada. Autoriza construcción conforme a planos aprobados.',
      DERIVAR:       'Expediente derivado a Gerencia de Desarrollo Urbano e Infraestructura para revisión técnica de planos.',
      OBSERVAR:      'Expediente observado. Se requiere corrección en planos o documentación técnica faltante.',
    },
  };

  // Comentario genérico si el trámite no tiene personalización
  const genericos: Record<string, string> = {
    TOMAR:         'Expediente tomado para evaluación técnica.',
    VISTO_BUENO:   'Evaluación técnica completada. Listo para firma del Jefe de Área.',
    FIRMA_TECNICO: 'Expediente firmado por técnico. Conforme para revisión del Jefe de Área.',
    FIRMA_JEFE:    'Expediente firmado oficialmente. Trámite resuelto.',
    DERIVAR:       'Expediente derivado al área técnica correspondiente.',
    OBSERVAR:      'Expediente observado. Se requiere subsanar documentación.',
  };

  return comentarios[tipoTramiteId]?.[accion] ?? genericos[accion];
};
// ── GET /api/areas/bandeja ───────────────────────────────────
export const bandejaPorArea = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { areaId, rol } = req.usuario!;
    if (!areaId) throw new AppError(403, 'Tu usuario no tiene un área asignada.');

    const estadosPorRol: Record<string, string[]> = {
      TECNICO:        ['DERIVADO', 'EN_PROCESO', 'OBSERVADO'],
      JEFE_AREA:      ['EN_PROCESO', 'LISTO_DESCARGA', 'PDF_FIRMADO'],
      ADMIN:          ['DERIVADO', 'EN_PROCESO', 'LISTO_DESCARGA', 'PDF_FIRMADO', 'OBSERVADO'],
      MESA_DE_PARTES: ['DERIVADO', 'EN_PROCESO', 'LISTO_DESCARGA', 'PDF_FIRMADO', 'OBSERVADO', 'RESUELTO'],
    };

    const estados = estadosPorRol[rol] ?? [];

    const expedientes = await prisma.expediente.findMany({
      where:   { areaActualId: areaId, estado: { in: estados as any[] } },
      select: {
        id: true, codigo: true, estado: true,
        fecha_registro: true, fecha_limite: true,
        ciudadano:     { select: { dni: true, nombres: true, apellido_pat: true, apellido_mat: true, email: true, telefono: true } },
        tipoTramite:   { select: { nombre: true, plazo_dias: true } },
        registradoPor: { select: { nombre_completo: true } },
      },
      orderBy: { fecha_limite: 'desc' },
    });

    res.json(expedientes);
  } catch (err) { next(err); }
};

// ── GET /api/areas/expediente/:id ────────────────────────────
export const detalleExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);

    const expediente = await prisma.expediente.findUnique({
      where: { id },
      select: {
        id: true, codigo: true, estado: true,
        fecha_registro: true, fecha_limite: true,
        fecha_resolucion: true, url_pdf_firmado: true,
        codigo_verificacion_firma: true, fecha_firma: true,
        ciudadano:    { select: { id: true, dni: true, nombres: true, apellido_pat: true, apellido_mat: true, email: true, telefono: true } },
        tipoTramite:  { select: { id: true, nombre: true, plazo_dias: true, costo_soles: true } },
        areaActual:   { select: { id: true, nombre: true, sigla: true } },
        registradoPor: { select: { nombre_completo: true, email: true } },
        firmadoPor:    { select: { nombre_completo: true, email: true } },
        pagos: { where: { estado: 'VERIFICADO' }, select: { boleta: true, monto_cobrado: true, fecha_pago: true }, take: 1 },
      },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    const documentos = await prisma.documento.findMany({
      where:   { expedienteId: id },
      select:  { id: true, nombre: true, url: true, tipo_mime: true, uploaded_at: true },
      orderBy: { uploaded_at: 'asc' },
    });

    const movimientos = await prisma.movimiento.findMany({
      where:   { expedienteId: id },
      select: {
        id: true, tipo_accion: true, estado_resultado: true,
        comentario: true, fecha_hora: true,
        usuario:     { select: { nombre_completo: true, rol: { select: { nombre: true } } } },
        areaOrigen:  { select: { nombre: true, sigla: true } },
        areaDestino: { select: { nombre: true, sigla: true } },
      },
      orderBy: { fecha_hora: 'asc' },
    });

    res.json({ ...expediente, documentos, movimientos });
  } catch (err) { next(err); }
};

// ── GET /api/areas/expediente/:id/pdf-unificado ──────────────
// Si existe PDF_UNIFICADO lo devuelve directamente.
// Si no existe, fusiona los documentos originales.
export const descargarPdfUnificadoArea = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    if (!id) throw new AppError(400, 'ID de expediente inválido.');

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: {
        codigo:      true,
        ciudadano:   { select: { nombres: true, apellido_pat: true } },
        tipoTramite: { select: { nombre: true } },
        documentos:  { select: { id: true, nombre: true, url: true, tipo_mime: true }, orderBy: { uploaded_at: 'asc' } },
      },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    // ── Si existe PDF_UNIFICADO devolverlo directamente ──────
    const docUnificado = expediente.documentos.find(d =>
      d.nombre.startsWith('PDF_UNIFICADO:') && d.tipo_mime === 'application/pdf'
    );

    if (docUnificado) {
      const response    = await fetch(docUnificado.url);
      if (!response.ok) throw new AppError(500, 'No se pudo descargar el PDF unificado.');
      const arrayBuffer = await response.arrayBuffer();
      const pdfBytes    = Buffer.from(arrayBuffer);
      res.writeHead(200, {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="expediente-unificado-${expediente.codigo}.pdf"`,
        'Content-Length':      pdfBytes.length,
        'Cache-Control':       'no-cache',
      });
      res.end(pdfBytes);
      return;
    }

    // ── Si no existe PDF_UNIFICADO fusionar documentos originales ──
    const docsPdf = expediente.documentos.filter(d =>
      d.tipo_mime === 'application/pdf' &&
      !d.nombre.startsWith('PDF_UNIFICADO:') &&
      !d.nombre.startsWith('FIRMADO_TECNICO:')
    );

    if (docsPdf.length === 0) throw new AppError(404, 'El expediente no tiene documentos PDF adjuntos.');

    const pdfFinal = await PDFDocument.create();

    // Portada
    const portada = pdfFinal.addPage([595, 842]);
    const { width, height } = portada.getSize();
    portada.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
    portada.drawText('MUNICIPALIDAD DISTRITAL DE CARMEN ALTO', { x: 40, y: height - 30, size: 13, color: { red: 1, green: 1, blue: 1, type: 'RGB' as any } });
    portada.drawText('Sistema de Trámite Documentario', { x: 40, y: height - 50, size: 10, color: { red: 0.75, green: 0.85, blue: 0.95, type: 'RGB' as any } });
    portada.drawText('EXPEDIENTE UNIFICADO', { x: 40, y: height - 120, size: 16, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
    portada.drawText(`Codigo: ${expediente.codigo}`, { x: 40, y: height - 150, size: 12, color: { red: 0.1, green: 0.37, blue: 0.65, type: 'RGB' as any } });
    portada.drawText(`Ciudadano: ${expediente.ciudadano.nombres} ${expediente.ciudadano.apellido_pat}`, { x: 40, y: height - 175, size: 11, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } });
    portada.drawText(`Tramite: ${expediente.tipoTramite.nombre}`, { x: 40, y: height - 195, size: 11, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } });
    portada.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 40, y: height - 215, size: 10, color: { red: 0.5, green: 0.5, blue: 0.5, type: 'RGB' as any } });
    portada.drawText('DOCUMENTOS INCLUIDOS:', { x: 40, y: height - 260, size: 11, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
    portada.drawRectangle({ x: 40, y: height - 268, width: width - 80, height: 1, color: { red: 0.85, green: 0.85, blue: 0.85, type: 'RGB' as any } });
    docsPdf.forEach((doc, i) => {
      const nombre = doc.nombre.startsWith('REQ-') ? doc.nombre.replace(/^REQ-\d+:\s*/, '') : doc.nombre;
      portada.drawText(`${i + 1}. ${nombre}`, { x: 40, y: height - 290 - (i * 22), size: 10, color: { red: 0.2, green: 0.2, blue: 0.2, type: 'RGB' as any } });
    });

    // Fusionar PDFs originales
    for (const doc of docsPdf) {
      try {
        const response = await fetch(doc.url);
        if (!response.ok) continue;
        const arrayBuffer = await response.arrayBuffer();
        const pdfDoc      = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const paginas     = await pdfFinal.copyPages(pdfDoc, pdfDoc.getPageIndices());
        const separador   = pdfFinal.addPage([595, 842]);
        const nombre      = doc.nombre.startsWith('REQ-') ? doc.nombre.replace(/^REQ-\d+:\s*/, '') : doc.nombre;
        separador.drawRectangle({ x: 0, y: 380, width: 595, height: 82, color: { red: 0.93, green: 0.95, blue: 0.98, type: 'RGB' as any } });
        separador.drawText(nombre, { x: 40, y: 430, size: 14, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
        separador.drawText(`Documento ${docsPdf.indexOf(doc) + 1} de ${docsPdf.length}`, { x: 40, y: 408, size: 10, color: { red: 0.5, green: 0.5, blue: 0.5, type: 'RGB' as any } });
        paginas.forEach(p => pdfFinal.addPage(p));
      } catch { continue; }
    }

    const pdfBytes = await pdfFinal.save();
    res.writeHead(200, {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="expediente-unificado-${expediente.codigo}.pdf"`,
      'Content-Length':      pdfBytes.length,
      'Cache-Control':       'no-cache',
    });
    res.end(Buffer.from(pdfBytes));
  } catch (err) { next(err); }
};

// ── POST /api/areas/solicitar-codigo-firma/:id ───────────────
// Genera un código de 6 dígitos y lo envía por email al Jefe.
export const solicitarCodigoFirma = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true, codigo: true, tipoTramite: { select: { nombre: true } } },
    });

    if (!expediente)                            throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'LISTO_DESCARGA') throw new AppError(400, 'El expediente debe estar en LISTO_DESCARGA para firmar.');

    const usuario = await prisma.usuario.findUnique({
      where:  { id: usuarioId },
      select: { email: true, nombre_completo: true, url_firma_png: true },
    });

    if (!usuario)             throw new AppError(404, 'Usuario no encontrado.');
    if (!usuario.url_firma_png) throw new AppError(400, 'Debes subir tu imagen de firma antes de firmar expedientes. Ve a tu perfil.');

    // Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    codigosFirma.set(usuarioId, { codigo, expira, expedienteId: id });

    // Enviar por email
    await resend.emails.send({
      from:    'Municipalidad Carmen Alto <noreply@municipalidadcarmenalto.site>',
      to:      usuario.email,
      subject: `Código de aprobación de firma — ${expediente.codigo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <div style="background: #042C53; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0; font-size: 18px;">Municipalidad Distrital de Carmen Alto</h2>
            <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px;">Sistema de Trámite Documentario</p>
          </div>
          <div style="background: #f8f9fb; padding: 28px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #1e293b; font-size: 15px;">Hola, <strong>${usuario.nombre_completo}</strong></p>
            <p style="color: #64748b; font-size: 14px;">Ingresa el siguiente código para confirmar la firma digital del expediente <strong>${expediente.codigo}</strong>:</p>
            <div style="background: #042C53; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
              <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Código de aprobación</p>
              <p style="color: white; font-size: 36px; font-weight: 800; letter-spacing: 8px; margin: 0; font-family: monospace;">${codigo}</p>
            </div>
            <p style="color: #dc2626; font-size: 13px; text-align: center;">⚠ Este código expira en 10 minutos.</p>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">Si no solicitaste este código, ignora este mensaje.</p>
          </div>
        </div>
      `,
    });

    res.json({ message: `Código enviado a ${usuario.email}. Expira en 10 minutos.` });
  } catch (err) { next(err); }
};

export const firmarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const { codigo, pagina, posicion_x, posicion_y, ancho, alto } = req.body as {
      codigo:     string;
      pagina:     number;
      posicion_x: number;
      posicion_y: number;
      ancho:      number;
      alto:       number;
    };

    if (!codigo?.trim()) throw new AppError(400, 'El código de aprobación es obligatorio.');

    // Validar código
    const entry = codigosFirma.get(usuarioId);
    if (!entry)                         throw new AppError(400, 'No hay un código activo. Solicita uno nuevo.');
    if (entry.expedienteId !== id)      throw new AppError(400, 'El código no corresponde a este expediente.');
    if (new Date() > entry.expira)      { codigosFirma.delete(usuarioId); throw new AppError(400, 'El código ha expirado. Solicita uno nuevo.'); }
    if (entry.codigo !== codigo.trim()) throw new AppError(400, 'Código incorrecto.');
    codigosFirma.delete(usuarioId);

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: {
        estado: true, codigo: true, tipoTramiteId: true,
        ciudadano:   { select: { email: true, nombres: true, apellido_pat: true } },
        tipoTramite: { select: { nombre: true } },
        areaActual:  { select: { nombre: true } },
        documentos:  { select: { url: true, tipo_mime: true, nombre: true }, orderBy: { uploaded_at: 'asc' } },
      },
    });

    if (!expediente)                            throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'LISTO_DESCARGA') throw new AppError(400, 'El expediente debe estar en LISTO_DESCARGA.');

    const usuario = await prisma.usuario.findUnique({
      where:  { id: usuarioId },
      select: { nombre_completo: true, url_firma_png: true, area: { select: { nombre: true } } },
    });

    if (!usuario?.url_firma_png) throw new AppError(400, 'No tienes firma configurada. Ve a tu perfil y sube tu firma.');

    // ── Buscar el PDF firmado por el Técnico ──────────────────
    const docFirmadoTecnico = expediente.documentos.find(d =>
      d.nombre.startsWith('FIRMADO_TECNICO:') && d.tipo_mime === 'application/pdf'
    );

    const pdfFinal = await PDFDocument.create();

    if (docFirmadoTecnico) {
      const response    = await fetch(docFirmadoTecnico.url);
      const arrayBuffer = await response.arrayBuffer();
      const pdfDoc      = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const paginas     = await pdfFinal.copyPages(pdfDoc, pdfDoc.getPageIndices());
      paginas.forEach(p => pdfFinal.addPage(p));
    } else {
      const docsPdf = expediente.documentos.filter(d =>
        d.tipo_mime === 'application/pdf' &&
        !d.nombre.startsWith('FIRMADO_TECNICO:') &&
        !d.nombre.startsWith('PDF_UNIFICADO:')
      );
      if (docsPdf.length === 0) throw new AppError(400, 'El expediente no tiene documentos PDF para firmar.');
      for (const doc of docsPdf) {
        try {
          const response    = await fetch(doc.url);
          const arrayBuffer = await response.arrayBuffer();
          const pdfDoc      = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          const paginas     = await pdfFinal.copyPages(pdfDoc, pdfDoc.getPageIndices());
          paginas.forEach(p => pdfFinal.addPage(p));
        } catch { continue; }
      }
    }

    if (pdfFinal.getPageCount() === 0) throw new AppError(500, 'No se pudo generar el PDF para firmar.');

    // ── Insertar firma PNG del Jefe ───────────────────────────
    const firmaResponse    = await fetch(usuario.url_firma_png);
    const firmaArrayBuffer = await firmaResponse.arrayBuffer();
    const firmaBytes       = new Uint8Array(firmaArrayBuffer);

    let firmaImg;
    const header = firmaBytes.slice(0, 4);
    const isPng  = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
    if (isPng) {
      firmaImg = await pdfFinal.embedPng(firmaBytes);
    } else {
      const sharp     = require('sharp');
      const pngBuffer = await sharp(Buffer.from(firmaBytes)).png().toBuffer();
      firmaImg        = await pdfFinal.embedPng(new Uint8Array(pngBuffer));
    }

    const paginaIdx = Math.max(0, Math.min((pagina ?? 1) - 1, pdfFinal.getPageCount() - 1));
    const paginaPdf = pdfFinal.getPage(paginaIdx);

    paginaPdf.drawImage(firmaImg, {
      x:      posicion_x ?? 400,
      y:      posicion_y ?? 50,
      width:  ancho      ?? 150,
      height: alto       ?? 60,
    });
    paginaPdf.drawText(`Firmado por: ${usuario.nombre_completo}`, {
      x: posicion_x ?? 400, y: (posicion_y ?? 50) - 14,
      size: 8, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any },
    });
    paginaPdf.drawText(`Fecha: ${new Date().toLocaleString('es-PE')}`, {
      x: posicion_x ?? 400, y: (posicion_y ?? 50) - 25,
      size: 8, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any },
    });

    // ── WATERMARK: sello diagonal en cada página ──────────────
    const totalPaginas = pdfFinal.getPageCount();
    for (let i = 0; i < totalPaginas; i++) {
      const pag = pdfFinal.getPage(i);
      const { width: pw, height: ph } = pag.getSize();

      // Texto diagonal centrado — rotado 45 grados
      pag.drawText('DOCUMENTO OFICIAL', {
        x:        pw / 2 - 160,
        y:        ph / 2 - 20,
        size:     42,
        color:    { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any },
        opacity:  0.06,
        rotate:   { type: 'degrees' as any, angle: 45 },
      });
      pag.drawText('MUNICIPALIDAD CARMEN ALTO', {
        x:        pw / 2 - 200,
        y:        ph / 2 - 65,
        size:     28,
        color:    { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any },
        opacity:  0.06,
        rotate:   { type: 'degrees' as any, angle: 45 },
      });
    }

    // ── PÁGINA DE CERTIFICACIÓN ───────────────────────────────
    const fechaFirma    = new Date();
    const codigo_verificacion = randomUUID();
    const certPage      = pdfFinal.addPage([595, 842]);
    const { width: cw, height: ch } = certPage.getSize();

    // Fondo superior azul
    certPage.drawRectangle({
      x: 0, y: ch - 120, width: cw, height: 120,
      color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any },
    });
    certPage.drawRectangle({
      x: 0, y: ch - 124, width: cw, height: 4,
      color: { red: 0.29, green: 0.74, blue: 0.937, type: 'RGB' as any },
    });

    // Título
    certPage.drawText('CERTIFICADO DE FIRMA DIGITAL', {
      x: 40, y: ch - 55, size: 20,
      color: { red: 1, green: 1, blue: 1, type: 'RGB' as any },
    });
    certPage.drawText('Municipalidad Distrital de Carmen Alto — Sistema de Trámite Documentario', {
      x: 40, y: ch - 78, size: 9,
      color: { red: 0.75, green: 0.85, blue: 0.95, type: 'RGB' as any },
    });
    certPage.drawText('Documento firmado digitalmente con validez legal conforme a la normativa peruana', {
      x: 40, y: ch - 95, size: 8,
      color: { red: 0.6, green: 0.75, blue: 0.9, type: 'RGB' as any },
    });

    // Watermark en página de certificación también
    certPage.drawText('DOCUMENTO OFICIAL', {
      x: cw / 2 - 160, y: ch / 2 - 20, size: 42,
      color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any },
      opacity: 0.04,
      rotate: { type: 'degrees' as any, angle: 45 },
    });

    // ── Sección: Datos del expediente ────────────────────────
    let cy = ch - 165;

    // Caja código expediente
    certPage.drawRectangle({
      x: 40, y: cy - 10, width: 515, height: 50,
      color: { red: 0.91, green: 0.95, blue: 0.99, type: 'RGB' as any },
      borderColor: { red: 0.13, green: 0.43, blue: 0.81, type: 'RGB' as any },
      borderWidth: 1,
    });
    certPage.drawText('EXPEDIENTE', {
      x: 55, y: cy + 24, size: 7,
      color: { red: 0.13, green: 0.43, blue: 0.81, type: 'RGB' as any },
    });
    certPage.drawText(expediente.codigo, {
      x: 55, y: cy + 8, size: 16,
      color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any },
    });
    certPage.drawText('TIPO DE TRÁMITE', {
      x: 240, y: cy + 24, size: 7,
      color: { red: 0.13, green: 0.43, blue: 0.81, type: 'RGB' as any },
    });
    certPage.drawText(expediente.tipoTramite.nombre, {
      x: 240, y: cy + 8, size: 10,
      color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any },
    });

    cy -= 70;

    // ── Separador ────────────────────────────────────────────
    certPage.drawRectangle({
      x: 40, y: cy + 18, width: 515, height: 22,
      color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any },
    });
    certPage.drawText('DATOS DEL FIRMANTE', {
      x: 50, y: cy + 23, size: 9,
      color: { red: 1, green: 1, blue: 1, type: 'RGB' as any },
    });

    cy -= 10;

    // Datos del firmante
    const campoLabel = (label: string, valor: string, x: number, y: number, ancho = 230) => {
      certPage.drawText(label, {
        x, y: y + 12, size: 7,
        color: { red: 0.43, green: 0.43, blue: 0.43, type: 'RGB' as any },
      });
      certPage.drawText(valor, {
        x, y, size: 10,
        color: { red: 0.07, green: 0.09, blue: 0.15, type: 'RGB' as any },
      });
    };

    campoLabel('Nombre completo del firmante', usuario.nombre_completo, 55, cy - 20);
    campoLabel('Cargo', 'Jefe de Área', 55, cy - 55);
    campoLabel('Área', usuario.area?.nombre ?? expediente.areaActual?.nombre ?? 'Área Municipal', 300, cy - 55);
    campoLabel('Fecha y hora de firma', fechaFirma.toLocaleString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }), 55, cy - 90);

    // Imagen de firma del jefe
    certPage.drawRectangle({
      x: 370, y: cy - 100, width: 180, height: 70,
      color: { red: 0.98, green: 0.99, blue: 1, type: 'RGB' as any },
      borderColor: { red: 0.8, green: 0.87, blue: 0.95, type: 'RGB' as any },
      borderWidth: 1,
    });
    certPage.drawImage(firmaImg, {
      x: 375, y: cy - 95, width: 170, height: 60,
    });
    certPage.drawText('Firma digital del Jefe de Área', {
      x: 370, y: cy - 108, size: 7,
      color: { red: 0.43, green: 0.43, blue: 0.43, type: 'RGB' as any },
    });

    cy -= 130;

    // ── Código de verificación ────────────────────────────────
    certPage.drawRectangle({
      x: 40, y: cy + 18, width: 515, height: 22,
      color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any },
    });
    certPage.drawText('CÓDIGO DE VERIFICACIÓN DE AUTENTICIDAD', {
      x: 50, y: cy + 23, size: 9,
      color: { red: 1, green: 1, blue: 1, type: 'RGB' as any },
    });

    cy -= 15;

    certPage.drawRectangle({
      x: 40, y: cy - 30, width: 515, height: 55,
      color: { red: 0.95, green: 0.98, blue: 1, type: 'RGB' as any },
      borderColor: { red: 0.29, green: 0.74, blue: 0.937, type: 'RGB' as any },
      borderWidth: 1,
    });
    certPage.drawText('UUID de verificación:', {
      x: 55, y: cy + 10, size: 7,
      color: { red: 0.43, green: 0.43, blue: 0.43, type: 'RGB' as any },
    });
    certPage.drawText(codigo_verificacion, {
      x: 55, y: cy - 8, size: 9,
      color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any },
    });
    certPage.drawText('Verifique la autenticidad en: municipalidadcarmenalto.site/consulta', {
      x: 55, y: cy - 24, size: 8,
      color: { red: 0.13, green: 0.43, blue: 0.81, type: 'RGB' as any },
    });

    cy -= 65;

    // ── Texto legal ───────────────────────────────────────────
    certPage.drawRectangle({
      x: 40, y: cy - 55, width: 515, height: 80,
      color: { red: 0.99, green: 0.99, blue: 0.97, type: 'RGB' as any },
      borderColor: { red: 0.95, green: 0.82, blue: 0.36, type: 'RGB' as any },
      borderWidth: 1,
    });
    certPage.drawText('BASE LEGAL', {
      x: 55, y: cy + 12, size: 8,
      color: { red: 0.57, green: 0.41, blue: 0.02, type: 'RGB' as any },
    });
    certPage.drawText(
      'El presente documento ha sido firmado digitalmente conforme a la Ley N° 27269 — Ley de Firmas y',
      { x: 55, y: cy - 5, size: 7.5, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } }
    );
    certPage.drawText(
      'Certificados Digitales del Perú y sus modificatorias. La firma digital consignada en este documento',
      { x: 55, y: cy - 18, size: 7.5, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } }
    );
    certPage.drawText(
      'tiene la misma validez y eficacia jurídica que una firma manuscrita, conforme al artículo 141-A del',
      { x: 55, y: cy - 31, size: 7.5, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } }
    );
    certPage.drawText(
      'Código Civil Peruano. Municipalidad Distrital de Carmen Alto — Huamanga, Ayacucho.',
      { x: 55, y: cy - 44, size: 7.5, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } }
    );

    // ── Pie de página de certificación ────────────────────────
    certPage.drawRectangle({
      x: 0, y: 0, width: cw, height: 40,
      color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any },
    });
    certPage.drawRectangle({
      x: 0, y: 36, width: cw, height: 4,
      color: { red: 0.29, green: 0.74, blue: 0.937, type: 'RGB' as any },
    });
    certPage.drawText(`Documento generado el ${fechaFirma.toLocaleString('es-PE')}`, {
      x: 40, y: 22, size: 7,
      color: { red: 0.75, green: 0.85, blue: 0.95, type: 'RGB' as any },
    });
    certPage.drawText('Sistema de Trámite Documentario — Municipalidad Distrital de Carmen Alto', {
      x: 40, y: 9, size: 7,
      color: { red: 0.5, green: 0.65, blue: 0.8, type: 'RGB' as any },
    });

    // ── Subir PDF final a Supabase ────────────────────────────
    const pdfBytes        = await pdfFinal.save();
    const pdfBuffer       = Buffer.from(pdfBytes);
    const url_pdf_firmado = await storageService.subirArchivo(pdfBuffer, 'application/pdf', 'firmados');

    // ── Actualizar expediente ─────────────────────────────────
    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id },
        data: {
          estado:                    'PDF_FIRMADO',
          url_pdf_firmado,
          codigo_verificacion_firma: codigo_verificacion,
          fecha_firma:               fechaFirma,
          firmadoPorId:              usuarioId,
          fecha_resolucion:          fechaFirma,
        },
      });
      await tx.movimiento.create({
        data: {
          expedienteId:     id, usuarioId,
          tipo_accion:      'SUBIDA_PDF_FIRMADO',
          estado_resultado: 'PDF_FIRMADO',
          comentario:       `PDF firmado por Jefe de Área. Código de verificación: ${codigo_verificacion}`,
        },
      });
      await tx.expediente.update({ where: { id }, data: { estado: 'RESUELTO' } });
      await tx.movimiento.create({
        data: {
          expedienteId:     id, usuarioId,
          tipo_accion:      'SUBIDA_PDF_FIRMADO',
          estado_resultado: 'RESUELTO',
          comentario:       getComentarioAutomatico('FIRMA_JEFE', expediente.tipoTramiteId),
        },
      });
    });

    notificarCambioEstado({
      email:       expediente.ciudadano.email ?? '',
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'RESUELTO',
      comentario:  'Su documento oficial ha sido firmado digitalmente y está listo para descargar.',
      area:        expediente.areaActual?.nombre,
      urlDescarga: url_pdf_firmado,
    }).catch((e) => console.error('❌ Email RESUELTO:', e));

    const usuariosMDPNotif = await prisma.usuario.findMany({
      where: { activo: true, rol: { nombre: { in: ['MESA_DE_PARTES', 'ADMIN'] } } },
      select: { id: true },
    });
    usuariosMDPNotif.forEach(u => crearNotificacion(
      u.id,
      'Expediente resuelto',
      `El expediente ${expediente.codigo} — ${expediente.tipoTramite.nombre} fue firmado y resuelto por el Jefe de Área.`,
      id,
    ));

    res.json({
      message:                   'Expediente firmado y resuelto correctamente.',
      codigo_verificacion_firma: codigo_verificacion,
      url_pdf_firmado,
    });
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/tomar/:id ───────────────────────────────
export const tomarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const areaId    = req.usuario!.areaId;

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true, areaActualId: true, tipoTramiteId: true, ...selectNotificacion },
    });

    if (!expediente)                        throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'DERIVADO')   throw new AppError(400, 'Solo se pueden tomar expedientes en DERIVADO.');
    if (expediente.areaActualId !== areaId) throw new AppError(403, 'Este expediente no pertenece a tu área.');

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'EN_PROCESO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'TOMA_EXPEDIENTE', estado_resultado: 'EN_PROCESO', areaOrigenId: areaId, comentario: getComentarioAutomatico('TOMAR', expediente.tipoTramiteId) },
      });
    });

    notificarCambioEstado({
      email: expediente.ciudadano.email ?? '',
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'EN_PROCESO',
      comentario:  null,
      area:        expediente.areaActual?.nombre,
    }).catch((e) => console.warn('⚠️ Email EN_PROCESO:', e));

    res.json({ message: 'Expediente tomado. Estado: EN_PROCESO.' });
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/observar/:id ────────────────────────────
export const observarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id             = Number(req.params['id']);
    const usuarioId      = req.usuario!.id;
    const { comentario } = req.body as { comentario: string };

    if (!comentario?.trim()) throw new AppError(400, 'El comentario de observación es obligatorio.');

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true, ...selectNotificacion },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (!['EN_PROCESO', 'EN_REVISION_MDP'].includes(expediente.estado))
      throw new AppError(400, `No se puede observar en estado ${expediente.estado}.`);

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'OBSERVADO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'OBSERVACION', estado_resultado: 'OBSERVADO', comentario: comentario.trim() },
      });
    });

    notificarCambioEstado({
      email: expediente.ciudadano.email ?? '',
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'OBSERVADO',
      comentario:  comentario.trim(),
      area:        expediente.areaActual?.nombre,
    }).catch((e) => console.warn('⚠️ Email OBSERVADO:', e));

    res.json({ message: 'Expediente marcado como OBSERVADO.' });
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/rechazar/:id ────────────────────────────
export const rechazarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id             = Number(req.params['id']);
    const usuarioId      = req.usuario!.id;
    const { comentario } = req.body as { comentario: string };

    if (!comentario?.trim()) throw new AppError(400, 'El motivo de rechazo es obligatorio.');

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true, ...selectNotificacion },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (!['EN_PROCESO', 'LISTO_DESCARGA', 'OBSERVADO'].includes(expediente.estado))
      throw new AppError(400, `No se puede rechazar en estado ${expediente.estado}.`);

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'RECHAZADO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'RECHAZO', estado_resultado: 'RECHAZADO', comentario: comentario.trim() },
      });
    });

    notificarCambioEstado({
      email: expediente.ciudadano.email ?? '',
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'RECHAZADO',
      comentario:  comentario.trim(),
      area:        expediente.areaActual?.nombre,
    }).catch((e) => console.warn('⚠️ Email RECHAZADO:', e));

    res.json({ message: 'Expediente RECHAZADO correctamente.' });
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/visto-bueno/:id ─────────────────────────
export const darVistoBueno = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const areaId    = req.usuario!.areaId;

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true, areaActualId: true, tipoTramiteId: true, ...selectNotificacion },
    });

    if (!expediente)                        throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'EN_PROCESO') throw new AppError(400, 'El expediente debe estar EN_PROCESO.');
    if (expediente.areaActualId !== areaId) throw new AppError(403, 'Este expediente no pertenece a tu área.');

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'LISTO_DESCARGA' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'VISTO_BUENO', estado_resultado: 'LISTO_DESCARGA', comentario: getComentarioAutomatico('VISTO_BUENO', expediente.tipoTramiteId)},
      });
    });

    notificarCambioEstado({
      email: expediente.ciudadano.email ?? '',
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'LISTO_DESCARGA',
      comentario:  null,
      area:        expediente.areaActual?.nombre,
    }).catch((e) => console.warn('⚠️ Email LISTO_DESCARGA:', e));

    res.json({ message: 'Visto bueno otorgado. Estado: LISTO_DESCARGA.' });
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/archivar/:id ────────────────────────────
export const archivarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true },
    });

    if (!expediente)                      throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'RESUELTO') throw new AppError(400, 'Solo se pueden archivar expedientes RESUELTOS.');

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'ARCHIVADO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'ARCHIVADO', estado_resultado: 'ARCHIVADO', comentario: 'Expediente archivado en historial permanente.' },
      });
    });

    res.json({ message: 'Expediente ARCHIVADO correctamente.' });
  } catch (err) { next(err); }
};

// ── GET /api/areas/historial ─────────────────────────────────
export const historialExpedientes = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { areaId, rol } = req.usuario!;
    const where: any = { estado: { in: ['RESUELTO', 'ARCHIVADO'] } };
    if (rol === 'JEFE_AREA' && areaId) where.areaActualId = areaId;

    const expedientes = await prisma.expediente.findMany({
      where,
      select: {
        id: true, codigo: true, estado: true,
        fecha_registro: true, fecha_limite: true, fecha_resolucion: true,
        url_pdf_firmado: true, codigo_verificacion_firma: true,
        ciudadano:   { select: { dni: true, nombres: true, apellido_pat: true, apellido_mat: true, email: true } },
        tipoTramite: { select: { nombre: true, plazo_dias: true, costo_soles: true } },
        areaActual:  { select: { nombre: true, sigla: true } },
        pagos: { where: { estado: 'VERIFICADO' }, select: { boleta: true, monto_cobrado: true, fecha_pago: true }, take: 1 },
      },
      orderBy: { fecha_resolucion: 'desc' },
    });

    res.json(expedientes);
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/reactivar/:id ───────────────────────────
export const reactivarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true, areaActualId: true, ...selectNotificacion },
    });

    if (!expediente)                       throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'OBSERVADO') throw new AppError(400, 'Solo se reactivan expedientes OBSERVADOS.');

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'EN_PROCESO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'SUBSANACION', estado_resultado: 'EN_PROCESO', comentario: 'Documentos subsanados revisados. Expediente reactivado para evaluación.' },
      });
    });

    notificarCambioEstado({
      email: expediente.ciudadano.email ?? '',
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'SUBSANADO',
      comentario:  'Tus documentos fueron revisados y aceptados. Tu trámite continúa en evaluación técnica.',
      area:        expediente.areaActual?.nombre,
    }).catch((e) => console.warn('⚠️ Email SUBSANACION:', e));

    res.json({ message: 'Expediente reactivado. Estado: EN_PROCESO.' });
  } catch (err) { next(err); }

  };

export const firmarExpedienteTecnico = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const { pagina, posicion_x, posicion_y, ancho, alto } = req.body as {
      pagina: number; posicion_x: number; posicion_y: number; ancho: number; alto: number;
    };

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: {
        estado: true, codigo: true, tipoTramiteId: true,
        ciudadano:   { select: { email: true, nombres: true } },
        tipoTramite: { select: { nombre: true } },
        areaActual:  { select: { nombre: true } },
        documentos:  { select: { url: true, tipo_mime: true, nombre: true }, orderBy: { uploaded_at: 'asc' } },
      },
    });

    if (!expediente)                        throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'EN_PROCESO') throw new AppError(400, 'El expediente debe estar EN_PROCESO para firmar.');

    const usuario = await prisma.usuario.findUnique({
      where:  { id: usuarioId },
      select: { nombre_completo: true, url_firma_png: true },
    });

    if (!usuario?.url_firma_png) throw new AppError(400, 'Debes subir tu imagen de firma antes de firmar. Ve a "Mi firma".');

    // ── Buscar el PDF unificado guardado por Mesa de Partes ──
    const docUnificado = expediente.documentos.find(d =>
      d.nombre.startsWith('PDF_UNIFICADO:') && d.tipo_mime === 'application/pdf'
    );

    const pdfFinal = await PDFDocument.create();

    if (docUnificado) {
      const response    = await fetch(docUnificado.url);
      const arrayBuffer = await response.arrayBuffer();
      const pdfDoc      = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const paginas     = await pdfFinal.copyPages(pdfDoc, pdfDoc.getPageIndices());
      paginas.forEach(p => pdfFinal.addPage(p));
    } else {
      const docsPdf = expediente.documentos.filter(d =>
        d.tipo_mime === 'application/pdf' &&
        !d.nombre.startsWith('PDF_UNIFICADO:') &&
        !d.nombre.startsWith('FIRMADO_TECNICO:')
      );
      if (docsPdf.length === 0) throw new AppError(400, 'El expediente no tiene documentos PDF para firmar.');
      for (const doc of docsPdf) {
        try {
          const response    = await fetch(doc.url);
          const arrayBuffer = await response.arrayBuffer();
          const pdfDoc      = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          const paginas     = await pdfFinal.copyPages(pdfDoc, pdfDoc.getPageIndices());
          paginas.forEach(p => pdfFinal.addPage(p));
        } catch { continue; }
      }
    }

    if (pdfFinal.getPageCount() === 0) throw new AppError(500, 'No se pudo cargar el PDF para firmar.');

    // ── Insertar firma PNG del Técnico ───────────────────────
    const firmaResponse    = await fetch(usuario.url_firma_png);
    const firmaArrayBuffer = await firmaResponse.arrayBuffer();
    const firmaBytes       = new Uint8Array(firmaArrayBuffer);

    let firmaImg;
    const header = firmaBytes.slice(0, 4);
    const isPng  = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
    if (isPng) {
      firmaImg = await pdfFinal.embedPng(firmaBytes);
    } else {
      const sharp     = require('sharp');
      const pngBuffer = await sharp(Buffer.from(firmaBytes)).png().toBuffer();
      firmaImg        = await pdfFinal.embedPng(new Uint8Array(pngBuffer));
    }

    const paginaIdx = Math.max(0, Math.min((pagina ?? 1) - 1, pdfFinal.getPageCount() - 1));
    const paginaPdf = pdfFinal.getPage(paginaIdx);

    paginaPdf.drawImage(firmaImg, {
      x: posicion_x ?? 400, y: posicion_y ?? 50,
      width: ancho ?? 150,  height: alto ?? 60,
    });
    paginaPdf.drawText(`Revisado por: ${usuario.nombre_completo}`, {
      x: posicion_x ?? 400, y: (posicion_y ?? 50) - 14,
      size: 8, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any },
    });
    paginaPdf.drawText(`Fecha: ${new Date().toLocaleString('es-PE')}`, {
      x: posicion_x ?? 400, y: (posicion_y ?? 50) - 25,
      size: 8, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any },
    });

    // ── Subir PDF firmado por técnico ────────────────────────
    const pdfBytes        = await pdfFinal.save();
    const pdfBuffer       = Buffer.from(pdfBytes);
    const url_pdf_tecnico = await storageService.subirArchivo(pdfBuffer, 'application/pdf', 'firmados');

    await prisma.$transaction(async (tx) => {
      await tx.documento.deleteMany({
        where: { expedienteId: id, nombre: { startsWith: 'FIRMADO_TECNICO:' } },
      });

      await tx.documento.create({
        data: {
          expedienteId: id,
          nombre:       `FIRMADO_TECNICO: ${expediente.codigo}`,
          url:          url_pdf_tecnico,
          tipo_mime:    'application/pdf',
        },
      });

      await tx.expediente.update({
        where: { id },
        data:  { estado: 'LISTO_DESCARGA' },
      });

      const jefesArea = await prisma.usuario.findMany({
        where: { activo: true, areaId: req.usuario!.areaId!, rol: { nombre: 'JEFE_AREA' } },
        select: { id: true },
      });
      jefesArea.forEach(u => crearNotificacion(
        u.id,
        'Expediente listo para tu firma',
        `El técnico firmó el expediente ${expediente.codigo} — ${expediente.tipoTramite.nombre}. Requiere tu firma oficial para resolverse.`,
        id,
      ));

      await tx.movimiento.create({
        data: {
          expedienteId:     id, usuarioId,
          tipo_accion:      'VISTO_BUENO',
          estado_resultado: 'LISTO_DESCARGA',
          comentario:       getComentarioAutomatico('FIRMA_TECNICO', expediente.tipoTramiteId),
        },
      });
    });

    notificarCambioEstado({
      email:       expediente.ciudadano.email ?? '',
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'LISTO_DESCARGA',
      comentario:  'Tu expediente fue revisado y firmado por el técnico. Pendiente de firma del Jefe de Área.',
      area:        expediente.areaActual?.nombre,
    }).catch((e) => console.warn('⚠️ Email FIRMA_TECNICO:', e));

    res.json({ message: 'Expediente firmado correctamente. Enviado al Jefe de Área.' });
  } catch (err) { next(err); }
};
// POST /api/areas/expediente/:id/reemplazar-pdf
export const reemplazarPdfUnificado = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id   = Number(req.params['id']);
    const file = req.file;
 
    if (!file) throw new AppError(400, 'No se recibió ningún archivo.');
    if (file.mimetype !== 'application/pdf') throw new AppError(400, 'Solo se aceptan archivos PDF.');
    if (file.size > 20 * 1024 * 1024) throw new AppError(400, 'El archivo no puede superar 20MB.');
 
    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true, codigo: true },
    });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
 
    // Subir nuevo PDF a Supabase
    const url = await storageService.subirArchivo(file.buffer, 'application/pdf', 'expedientes');
 
    // Eliminar PDF_UNIFICADO anterior si existe
    await prisma.documento.deleteMany({
      where: { expedienteId: id, nombre: { startsWith: 'PDF_UNIFICADO:' } },
    });
 
    // Guardar nuevo
    await prisma.documento.create({
      data: {
        expedienteId: id,
        nombre:       `PDF_UNIFICADO: ${expediente.codigo}`,
        url,
        tipo_mime:    'application/pdf',
      },
    });
 
    await prisma.movimiento.create({
      data: {
        expedienteId:     id,
        usuarioId:        req.usuario!.id,
        tipo_accion:      'REVISION_MDP',
        estado_resultado: expediente.estado as any,
        comentario:       'PDF del expediente reemplazado por versión modificada.',
      },
    });
 
    res.json({ message: 'PDF del expediente reemplazado correctamente.', url });
  } catch (err) { next(err); }
};