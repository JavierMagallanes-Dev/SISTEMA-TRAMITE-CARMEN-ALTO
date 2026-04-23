// src/controllers/areas.controller.ts
// Módulo de Áreas — Técnico y Jefe de Área.
//
// Flujo:
//   DERIVADO → (Técnico toma) → EN_PROCESO
//   EN_PROCESO → (Técnico evalúa) → LISTO_DESCARGA | OBSERVADO | RECHAZADO
//   LISTO_DESCARGA → (Jefe descarga PDF y firma con FirmaPeru) → PDF_FIRMADO
//   PDF_FIRMADO → RESUELTO

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma }     from '../config/prisma';
import { AppError }   from '../middlewares/error.middleware';

// ----------------------------------------------------------------
// GET /api/areas/bandeja
// Expedientes en la bandeja del área del usuario autenticado.
// El Técnico y Jefe solo ven los expedientes de su área.
// ----------------------------------------------------------------
export const bandejaPorArea = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { areaId, rol } = req.usuario!;

    if (!areaId) {
      throw new AppError(403, 'Tu usuario no tiene un área asignada.');
    }

    // Los estados visibles según el rol
    const estadosPorRol = {
      TECNICO:    ['DERIVADO', 'EN_PROCESO', 'OBSERVADO'],
      JEFE_AREA:  ['EN_PROCESO', 'LISTO_DESCARGA', 'PDF_FIRMADO'],
      ADMIN:      ['DERIVADO', 'EN_PROCESO', 'LISTO_DESCARGA', 'PDF_FIRMADO', 'OBSERVADO'],
    };

    const estados = estadosPorRol[rol as keyof typeof estadosPorRol] ?? [];

    const expedientes = await prisma.expediente.findMany({
      where: {
        areaActualId: areaId,
        estado:       { in: estados as any[] },
      },
      select: {
        id:             true,
        codigo:         true,
        estado:         true,
        fecha_registro: true,
        fecha_limite:   true,
        ciudadano: {
          select: {
            dni:          true,
            nombres:      true,
            apellido_pat: true,
            apellido_mat: true,
            email:        true,
            telefono:     true,
          },
        },
        tipoTramite: {
          select: { nombre: true, plazo_dias: true },
        },
        registradoPor: {
          select: { nombre_completo: true },
        },
      },
      orderBy: { fecha_limite: 'asc' }, // primero los más urgentes
    });

    res.json(expedientes);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/areas/expediente/:id
// Detalle completo de un expediente con historial de movimientos.
// ----------------------------------------------------------------
export const detalleExpediente = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);

    const expediente = await prisma.expediente.findUnique({
      where: { id },
      include: {
        ciudadano:    true,
        tipoTramite:  true,
        areaActual:   true,
        registradoPor: { select: { nombre_completo: true, email: true } },
        firmadoPor:    { select: { nombre_completo: true, email: true } },
        pagos: {
          where:   { estado: 'VERIFICADO' },
          select:  { boleta: true, monto_cobrado: true, fecha_pago: true },
          take:    1,
        },
        documentos: {
          select: { id: true, nombre: true, url: true, tipo_mime: true, uploaded_at: true },
        },
        movimientos: {
          include: {
            usuario:     { select: { nombre_completo: true, rol: { select: { nombre: true } } } },
            areaOrigen:  { select: { nombre: true, sigla: true } },
            areaDestino: { select: { nombre: true, sigla: true } },
          },
          orderBy: { fecha_hora: 'asc' },
        },
      },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    res.json(expediente);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// PATCH /api/areas/tomar/:id
// El Técnico toma el expediente de la bandeja.
// DERIVADO → EN_PROCESO
// ----------------------------------------------------------------
export const tomarExpediente = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const areaId    = req.usuario!.areaId;

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    if (expediente.estado !== 'DERIVADO') {
      throw new AppError(400, `Solo se pueden tomar expedientes en estado DERIVADO. Estado actual: ${expediente.estado}.`);
    }

    if (expediente.areaActualId !== areaId) {
      throw new AppError(403, 'Este expediente no pertenece a tu área.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id },
        data:  { estado: 'EN_PROCESO' },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     id,
          usuarioId,
          tipo_accion:      'TOMA_EXPEDIENTE',
          estado_resultado: 'EN_PROCESO',
          areaOrigenId:     areaId,
          comentario:       'Expediente tomado para evaluación técnica.',
        },
      });
    });

    res.json({ message: 'Expediente tomado correctamente. Estado: EN_PROCESO.' });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// PATCH /api/areas/observar/:id
// El Técnico marca el expediente como observado.
// EN_PROCESO → OBSERVADO
// Body: { comentario }
// ----------------------------------------------------------------
export const observarExpediente = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const { comentario } = req.body as { comentario: string };

    if (!comentario || comentario.trim() === '') {
      throw new AppError(400, 'El comentario de observación es obligatorio.');
    }

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    if (!['EN_PROCESO', 'EN_REVISION_MDP'].includes(expediente.estado)) {
      throw new AppError(400, `No se puede observar un expediente en estado ${expediente.estado}.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id },
        data:  { estado: 'OBSERVADO' },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     id,
          usuarioId,
          tipo_accion:      'OBSERVACION',
          estado_resultado: 'OBSERVADO',
          comentario:       comentario.trim(),
        },
      });
    });

    res.json({ message: 'Expediente marcado como OBSERVADO.' });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// PATCH /api/areas/rechazar/:id
// El Técnico o Jefe rechaza el expediente.
// EN_PROCESO | LISTO_DESCARGA → RECHAZADO
// Body: { comentario }
// ----------------------------------------------------------------
export const rechazarExpediente = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const { comentario } = req.body as { comentario: string };

    if (!comentario || comentario.trim() === '') {
      throw new AppError(400, 'El motivo de rechazo es obligatorio.');
    }

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    if (!['EN_PROCESO', 'LISTO_DESCARGA', 'OBSERVADO'].includes(expediente.estado)) {
      throw new AppError(400, `No se puede rechazar un expediente en estado ${expediente.estado}.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id },
        data:  { estado: 'RECHAZADO' },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     id,
          usuarioId,
          tipo_accion:      'RECHAZO',
          estado_resultado: 'RECHAZADO',
          comentario:       comentario.trim(),
        },
      });
    });

    res.json({ message: 'Expediente RECHAZADO correctamente.' });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// PATCH /api/areas/visto-bueno/:id
// El Jefe da visto bueno al expediente evaluado por el Técnico.
// EN_PROCESO → LISTO_DESCARGA
// ----------------------------------------------------------------
export const darVistoBueno = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const areaId    = req.usuario!.areaId;

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    if (expediente.estado !== 'EN_PROCESO') {
      throw new AppError(400, `Solo se puede dar visto bueno a expedientes EN_PROCESO. Estado actual: ${expediente.estado}.`);
    }

    if (expediente.areaActualId !== areaId) {
      throw new AppError(403, 'Este expediente no pertenece a tu área.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id },
        data:  { estado: 'LISTO_DESCARGA' },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     id,
          usuarioId,
          tipo_accion:      'VISTO_BUENO',
          estado_resultado: 'LISTO_DESCARGA',
          comentario:       'Visto bueno otorgado. PDF disponible para descarga y firma con FirmaPeru.',
        },
      });
    });

    res.json({ message: 'Visto bueno otorgado. El expediente está LISTO_DESCARGA.' });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// POST /api/areas/subir-pdf-firmado/:id
// El Jefe sube el PDF firmado digitalmente con FirmaPeru.
// LISTO_DESCARGA → PDF_FIRMADO → RESUELTO
// Body: { url_pdf_firmado }
// (la URL viene de Supabase Storage tras subir el archivo)
// ----------------------------------------------------------------
export const subirPdfFirmado = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const { url_pdf_firmado } = req.body as { url_pdf_firmado: string };

    if (!url_pdf_firmado || url_pdf_firmado.trim() === '') {
      throw new AppError(400, 'La URL del PDF firmado es obligatoria.');
    }

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    if (expediente.estado !== 'LISTO_DESCARGA') {
      throw new AppError(400, `El expediente debe estar en LISTO_DESCARGA para subir el PDF firmado. Estado actual: ${expediente.estado}.`);
    }

    // Generar código único de verificación (UUID v4)
    const codigo_verificacion_firma = randomUUID();

    await prisma.$transaction(async (tx) => {
      // 1. Actualizar expediente con datos del PDF firmado
      await tx.expediente.update({
        where: { id },
        data: {
          estado:                   'PDF_FIRMADO',
          url_pdf_firmado:          url_pdf_firmado.trim(),
          codigo_verificacion_firma,
          fecha_firma:              new Date(),
          firmadoPorId:             usuarioId,
          fecha_resolucion:         new Date(),
        },
      });

      // 2. Registrar en bitácora
      await tx.movimiento.create({
        data: {
          expedienteId:     id,
          usuarioId,
          tipo_accion:      'SUBIDA_PDF_FIRMADO',
          estado_resultado: 'PDF_FIRMADO',
          comentario:       `PDF firmado con FirmaPeru subido. Código de verificación: ${codigo_verificacion_firma}`,
        },
      });

      // 3. Avanzar a RESUELTO automáticamente
      await tx.expediente.update({
        where: { id },
        data:  { estado: 'RESUELTO' },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     id,
          usuarioId,
          tipo_accion:      'SUBIDA_PDF_FIRMADO',
          estado_resultado: 'RESUELTO',
          comentario:       'Expediente resuelto. PDF firmado disponible para el ciudadano.',
        },
      });
    });

    res.json({
      message:                  'PDF firmado subido correctamente. Expediente RESUELTO.',
      codigo_verificacion_firma,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// PATCH /api/areas/archivar/:id
// Jefe o Admin archivan un expediente RESUELTO.
// RESUELTO → ARCHIVADO
// ----------------------------------------------------------------
export const archivarExpediente = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    if (expediente.estado !== 'RESUELTO') {
      throw new AppError(400, `Solo se pueden archivar expedientes en RESUELTO. Estado actual: ${expediente.estado}.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id },
        data:  { estado: 'ARCHIVADO' },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     id,
          usuarioId,
          tipo_accion:      'ARCHIVADO',
          estado_resultado: 'ARCHIVADO',
          comentario:       'Expediente archivado en historial permanente.',
        },
      });
    });

    res.json({ message: 'Expediente ARCHIVADO correctamente.' });
  } catch (err) {
    next(err);
  }
};