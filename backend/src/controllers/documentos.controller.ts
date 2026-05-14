// src/controllers/documentos.controller.ts
// Maneja la subida de documentos adjuntos a expedientes
// y la subida del PDF firmado por el Jefe con FirmaPeru.

import { Request, Response, NextFunction } from 'express';
import { prisma }          from '../config/prisma';
import { AppError }        from '../middlewares/error.middleware';
import { storageService }  from '../services/storage.service';
import { notificarCambioEstado } from '../services/email.service';
import { v4 as uuidv4 }   from 'uuid';

// ----------------------------------------------------------------
// POST /api/documentos/subir/:expedienteId
// ----------------------------------------------------------------
export const subirDocumento = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { expedienteId } = req.params;
    const archivo = req.file;

    if (!archivo)
      throw new AppError(400, 'No se recibió ningún archivo.');

    if (archivo.mimetype !== 'application/pdf')
      throw new AppError(400, 'Solo se aceptan archivos PDF.');

    if (archivo.size > 10 * 1024 * 1024)
      throw new AppError(400, 'El archivo no puede superar los 10MB.');

    const expediente = await prisma.expediente.findUnique({
      where: { id: Number(expedienteId) },
    });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    const url = await storageService.subirArchivo(
      archivo.buffer,
      archivo.mimetype,
      'expedientes'
    );

    const documento = await prisma.documento.create({
      data: {
        expedienteId: Number(expedienteId),
        nombre:       archivo.originalname,
        url,
        tipo_mime:    archivo.mimetype,
      },
    });

    res.status(201).json({ message: 'Documento subido correctamente.', documento });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/documentos/expediente/:expedienteId
// ----------------------------------------------------------------
export const listarDocumentos = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { expedienteId } = req.params;

    const documentos = await prisma.documento.findMany({
      where:   { expedienteId: Number(expedienteId) },
      orderBy: { uploaded_at: 'asc' },
    });

    res.json(documentos);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// POST /api/documentos/subir-firmado/:expedienteId
// El Jefe sube el PDF ya firmado con FirmaPeru.
// Actualiza el expediente con la URL, código de verificación
// y envía email al ciudadano avisando que puede descargar.
// ----------------------------------------------------------------
export const subirPdfFirmado = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { expedienteId } = req.params;
    const archivo          = req.file;
    const jefeId           = req.usuario!.id;

    if (!archivo)
      throw new AppError(400, 'No se recibió ningún archivo.');

    if (archivo.mimetype !== 'application/pdf')
      throw new AppError(400, 'Solo se aceptan archivos PDF.');

    // Cargar datos del expediente + ciudadano para el email
    const expediente = await prisma.expediente.findUnique({
      where: { id: Number(expedienteId) },
      select: {
        estado:      true,
        codigo:      true,
        ciudadano:   { select: { email: true, nombres: true } },
        tipoTramite: { select: { nombre: true } },
        areaActual:  { select: { nombre: true } },
      },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    if (expediente.estado !== 'LISTO_DESCARGA') {
      throw new AppError(
        400,
        `El expediente debe estar en LISTO_DESCARGA. Estado actual: ${expediente.estado}`
      );
    }

    // Subir PDF firmado a Supabase Storage
    const url                      = await storageService.subirArchivo(
      archivo.buffer,
      archivo.mimetype,
      'firmados'
    );
    const codigo_verificacion_firma = uuidv4();

    // Transacción: PDF_FIRMADO → RESUELTO
    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id: Number(expedienteId) },
        data: {
          estado:                   'PDF_FIRMADO',
          url_pdf_firmado:          url,
          codigo_verificacion_firma,
          fecha_firma:              new Date(),
          firmadoPorId:             jefeId,
          fecha_resolucion:         new Date(),
        },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     Number(expedienteId),
          usuarioId:        jefeId,
          tipo_accion:      'SUBIDA_PDF_FIRMADO',
          estado_resultado: 'PDF_FIRMADO',
          comentario:       `PDF firmado con FirmaPeru subido. Código: ${codigo_verificacion_firma}`,
        },
      });

      await tx.expediente.update({
        where: { id: Number(expedienteId) },
        data:  { estado: 'RESUELTO' },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     Number(expedienteId),
          usuarioId:        jefeId,
          tipo_accion:      'SUBIDA_PDF_FIRMADO',
          estado_resultado: 'RESUELTO',
          comentario:       'Expediente resuelto. PDF firmado disponible para el ciudadano.',
        },
      });
    });

    // ── Notificar al ciudadano que su documento está listo ──
    console.log('📧 Enviando email RESUELTO a:', expediente.ciudadano.email);

    notificarCambioEstado({
      email: expediente.ciudadano.email ?? '',
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'RESUELTO',
      comentario:  '¡Su documento oficial ha sido firmado digitalmente y está listo para descargar! Ingrese al portal con su código y haga clic en "Descargar resolución".',
      area:        expediente.areaActual?.nombre,
      urlDescarga: url,
    }).then(() => {
      console.log('✅ Email RESUELTO enviado a:', expediente.ciudadano.email);
    }).catch((e) => {
      console.error('❌ Error al enviar email RESUELTO:', e?.message ?? e);
    });

    res.json({
      message:                  'PDF firmado subido. Expediente RESUELTO.',
      url_pdf_firmado:          url,
      codigo_verificacion_firma,
    });
  } catch (err) {
    next(err);
  }
};
// ── PUT /api/documentos/:id/reemplazar ──────────────────────
// MDP o Técnico reemplaza un documento específico por uno corregido
export const reemplazarDocumento = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const docId  = Number(req.params['id']);
    const archivo = req.file;

    if (!archivo)
      throw new AppError(400, 'No se recibió ningún archivo.');
    if (archivo.mimetype !== 'application/pdf')
      throw new AppError(400, 'Solo se aceptan archivos PDF.');
    if (archivo.size > 10 * 1024 * 1024)
      throw new AppError(400, 'El archivo no puede superar los 10MB.');

    const documento = await prisma.documento.findUnique({
      where:  { id: docId },
      select: { id: true, nombre: true, expedienteId: true },
    });
    if (!documento) throw new AppError(404, 'Documento no encontrado.');

    // Subir nuevo archivo a Supabase
    const url = await storageService.subirArchivo(
      archivo.buffer,
      archivo.mimetype,
      'expedientes'
    );

    // Reemplazar URL en BD manteniendo el mismo nombre
    const docActualizado = await prisma.documento.update({
      where: { id: docId },
      data:  { url, uploaded_at: new Date() },
    });

    // Invalidar PDF_UNIFICADO anterior para que se regenere
    await prisma.documento.deleteMany({
      where: {
        expedienteId: documento.expedienteId,
        nombre: { startsWith: 'PDF_UNIFICADO:' },
      },
    });

    res.json({
      message:   'Documento reemplazado correctamente.',
      documento: docActualizado,
    });
  } catch (err) { next(err); }
};