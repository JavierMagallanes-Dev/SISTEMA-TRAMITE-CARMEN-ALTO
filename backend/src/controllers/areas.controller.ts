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

const resend = new Resend(env.RESEND_API_KEY);

// Códigos de firma temporales: { usuarioId: { codigo, expira, expedienteId } }
const codigosFirma = new Map<number, { codigo: string; expira: Date; expedienteId: number }>();

const selectNotificacion = {
  codigo:      true,
  ciudadano:   { select: { email: true, nombres: true } },
  tipoTramite: { select: { nombre: true } },
  areaActual:  { select: { nombre: true } },
} as const;

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
      orderBy: { fecha_limite: 'asc' },
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
// Fusiona todos los PDFs del expediente en uno solo.
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

    const docsPdf = expediente.documentos.filter(d => d.tipo_mime === 'application/pdf');
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

    // Fusionar PDFs
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

// ── POST /api/areas/firmar/:id ───────────────────────────────
// Valida el código, inserta la firma PNG en el PDF y lo sube.
export const firmarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const { codigo, pagina, posicion_x, posicion_y, ancho, alto } = req.body as {
      codigo:      string;
      pagina:      number;
      posicion_x:  number;
      posicion_y:  number;
      ancho:       number;
      alto:        number;
    };

    if (!codigo?.trim()) throw new AppError(400, 'El código de aprobación es obligatorio.');

    // Validar código
    const entry = codigosFirma.get(usuarioId);
    if (!entry)                      throw new AppError(400, 'No hay un código activo. Solicita uno nuevo.');
    if (entry.expedienteId !== id)   throw new AppError(400, 'El código no corresponde a este expediente.');
    if (new Date() > entry.expira)   { codigosFirma.delete(usuarioId); throw new AppError(400, 'El código ha expirado. Solicita uno nuevo.'); }
    if (entry.codigo !== codigo.trim()) throw new AppError(400, 'Código incorrecto.');

    codigosFirma.delete(usuarioId);

    // Obtener expediente y usuario
    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: {
        estado: true, codigo: true,
        ciudadano:   { select: { email: true, nombres: true } },
        tipoTramite: { select: { nombre: true } },
        areaActual:  { select: { nombre: true } },
        documentos:  { select: { url: true, tipo_mime: true }, orderBy: { uploaded_at: 'asc' } },
      },
    });

    if (!expediente)                            throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'LISTO_DESCARGA') throw new AppError(400, 'El expediente debe estar en LISTO_DESCARGA.');

    const usuario = await prisma.usuario.findUnique({
      where:  { id: usuarioId },
      select: { nombre_completo: true, url_firma_png: true },
    });

    if (!usuario?.url_firma_png) throw new AppError(400, 'No tienes firma configurada. Ve a tu perfil y sube tu firma.');

    // Descargar todos los PDFs y fusionarlos
    const docsPdf = expediente.documentos.filter(d => d.tipo_mime === 'application/pdf');
    if (docsPdf.length === 0) throw new AppError(400, 'El expediente no tiene documentos PDF para firmar.');

    const pdfFinal = await PDFDocument.create();

    for (const doc of docsPdf) {
      try {
        const response    = await fetch(doc.url);
        const arrayBuffer = await response.arrayBuffer();
        const pdfDoc      = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const paginas     = await pdfFinal.copyPages(pdfDoc, pdfDoc.getPageIndices());
        paginas.forEach(p => pdfFinal.addPage(p));
      } catch { continue; }
    }

    if (pdfFinal.getPageCount() === 0) throw new AppError(500, 'No se pudo generar el PDF para firmar.');

    // Descargar imagen de firma PNG
    const firmaResponse    = await fetch(usuario.url_firma_png);
    const firmaArrayBuffer = await firmaResponse.arrayBuffer();
    const firmaBytes       = new Uint8Array(firmaArrayBuffer);

    // Incrustar firma PNG en el PDF
    let firmaImg;
// Detectar tipo por los primeros bytes del archivo
const header = firmaBytes.slice(0, 4);
const isPng  = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;

if (isPng) {
  firmaImg = await pdfFinal.embedPng(firmaBytes);
} else {
  // Asumir JPEG/WebP — convertir con sharp a PNG primero
  const sharp = require('sharp');
  const pngBuffer = await sharp(Buffer.from(firmaBytes)).png().toBuffer();
  firmaImg = await pdfFinal.embedPng(new Uint8Array(pngBuffer));
}
    const paginaIdx = Math.max(0, Math.min((pagina ?? 1) - 1, pdfFinal.getPageCount() - 1));
    const paginaPdf = pdfFinal.getPage(paginaIdx);

    paginaPdf.drawImage(firmaImg, {
      x:      posicion_x  ?? 400,
      y:      posicion_y  ?? 50,
      width:  ancho       ?? 150,
      height: alto        ?? 60,
    });

    // Agregar texto de validación bajo la firma
    paginaPdf.drawText(`Firmado por: ${usuario.nombre_completo}`, {
      x:    posicion_x ?? 400,
      y:    (posicion_y ?? 50) - 14,
      size: 8,
      color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any },
    });
    paginaPdf.drawText(`Fecha: ${new Date().toLocaleString('es-PE')}`, {
      x:    posicion_x ?? 400,
      y:    (posicion_y ?? 50) - 25,
      size: 8,
      color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any },
    });

    // Guardar PDF firmado
    const pdfBytes  = await pdfFinal.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // Subir a Supabase Storage
    const url_pdf_firmado      = await storageService.subirArchivo(pdfBuffer, 'application/pdf', 'firmados');
    const codigo_verificacion  = randomUUID();

    // Actualizar expediente
    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id },
        data: {
          estado:                   'PDF_FIRMADO',
          url_pdf_firmado,
          codigo_verificacion_firma: codigo_verificacion,
          fecha_firma:               new Date(),
          firmadoPorId:              usuarioId,
          fecha_resolucion:          new Date(),
        },
      });
      await tx.movimiento.create({
        data: {
          expedienteId: id, usuarioId,
          tipo_accion:      'SUBIDA_PDF_FIRMADO',
          estado_resultado: 'PDF_FIRMADO',
          comentario: `PDF firmado con imagen digital. Página ${pagina}. Código: ${codigo_verificacion}`,
        },
      });
      await tx.expediente.update({ where: { id }, data: { estado: 'RESUELTO' } });
      await tx.movimiento.create({
        data: {
          expedienteId: id, usuarioId,
          tipo_accion:      'SUBIDA_PDF_FIRMADO',
          estado_resultado: 'RESUELTO',
          comentario: 'Expediente resuelto. Documento firmado disponible para el ciudadano.',
        },
      });
    });

    // Notificar ciudadano
    notificarCambioEstado({
      email:       expediente.ciudadano.email,
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'RESUELTO',
      comentario:  `Su documento oficial ha sido firmado y está listo para descargar.`,
      area:        expediente.areaActual?.nombre,
      urlDescarga: url_pdf_firmado,
    }).catch((e) => console.error('❌ Email RESUELTO:', e));

    res.json({
      message:                  'Expediente firmado y resuelto correctamente.',
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
      select: { estado: true, areaActualId: true, ...selectNotificacion },
    });

    if (!expediente)                        throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'DERIVADO')   throw new AppError(400, 'Solo se pueden tomar expedientes en DERIVADO.');
    if (expediente.areaActualId !== areaId) throw new AppError(403, 'Este expediente no pertenece a tu área.');

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'EN_PROCESO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'TOMA_EXPEDIENTE', estado_resultado: 'EN_PROCESO', areaOrigenId: areaId, comentario: 'Expediente tomado para evaluación técnica.' },
      });
    });

    notificarCambioEstado({
      email:       expediente.ciudadano.email,
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
      email:       expediente.ciudadano.email,
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
      email:       expediente.ciudadano.email,
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
      select: { estado: true, areaActualId: true, ...selectNotificacion },
    });

    if (!expediente)                        throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'EN_PROCESO') throw new AppError(400, 'El expediente debe estar EN_PROCESO.');
    if (expediente.areaActualId !== areaId) throw new AppError(403, 'Este expediente no pertenece a tu área.');

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'LISTO_DESCARGA' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'VISTO_BUENO', estado_resultado: 'LISTO_DESCARGA', comentario: 'Visto bueno otorgado. Listo para firma del Jefe de Área.' },
      });
    });

    notificarCambioEstado({
      email:       expediente.ciudadano.email,
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
      email:       expediente.ciudadano.email,
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