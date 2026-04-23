// src/controllers/documentos.controller.ts
// Maneja la subida de documentos adjuntos a expedientes
// y la subida del PDF firmado por el Jefe con FirmaPeru.

import { Request, Response, NextFunction } from 'express';
import { prisma }          from '../config/prisma';
import { AppError }        from '../middlewares/error.middleware';
import { storageService }  from '../services/storage.service';
import { v4 as uuidv4 }   from 'uuid';

// ----------------------------------------------------------------
// POST /api/documentos/subir/:expedienteId
// Sube un documento adjunto al expediente.
// Accesible por el ciudadano (via portal) y empleados municipales.
// El archivo viene como multipart/form-data en el campo "archivo".
// ----------------------------------------------------------------
export const subirDocumento = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { expedienteId } = req.params;
    const archivo = req.file;

    if (!archivo) {
      throw new AppError(400, 'No se recibió ningún archivo.');
    }

    if (archivo.mimetype !== 'application/pdf') {
      throw new AppError(400, 'Solo se aceptan archivos PDF.');
    }

    if (archivo.size > 10 * 1024 * 1024) {
      throw new AppError(400, 'El archivo no puede superar los 10MB.');
    }

    // Verificar que el expediente existe
    const expediente = await prisma.expediente.findUnique({
      where: { id: Number(expedienteId) },
    });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    // Subir a Supabase Storage
    const url = await storageService.subirArchivo(
      archivo.buffer,
      archivo.mimetype,
      'expedientes'
    );

    // Guardar referencia en BD
    const documento = await prisma.documento.create({
      data: {
        expedienteId: Number(expedienteId),
        nombre:       archivo.originalname,
        url,
        tipo_mime:    archivo.mimetype,
      },
    });

    res.status(201).json({
      message:   'Documento subido correctamente.',
      documento,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/documentos/expediente/:expedienteId
// Lista los documentos adjuntos de un expediente.
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
// Actualiza el expediente con la URL y código de verificación.
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

    if (!archivo) {
      throw new AppError(400, 'No se recibió ningún archivo.');
    }

    if (archivo.mimetype !== 'application/pdf') {
      throw new AppError(400, 'Solo se aceptan archivos PDF.');
    }

    const expediente = await prisma.expediente.findUnique({
      where: { id: Number(expedienteId) },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    if (expediente.estado !== 'LISTO_DESCARGA') {
      throw new AppError(
        400,
        `El expediente debe estar en LISTO_DESCARGA. Estado actual: ${expediente.estado}`
      );
    }

    // Subir PDF firmado a carpeta separada
    const url                     = await storageService.subirArchivo(
      archivo.buffer,
      archivo.mimetype,
      'firmados'
    );
    const codigo_verificacion_firma = uuidv4();

    // Actualizar expediente en transacción
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

      // Avanzar a RESUELTO
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

    res.json({
      message:                  'PDF firmado subido. Expediente RESUELTO.',
      url_pdf_firmado:          url,
      codigo_verificacion_firma,
    });
  } catch (err) {
    next(err);
  }
};