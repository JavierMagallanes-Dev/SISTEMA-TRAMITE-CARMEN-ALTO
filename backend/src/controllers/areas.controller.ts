// src/controllers/areas.controller.ts
// Módulo de Áreas — Técnico y Jefe de Área.
// Optimizado: cada función carga los datos del ciudadano en el
// findUnique inicial para evitar queries extra con connection_limit=1.

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma }     from '../config/prisma';
import { AppError }   from '../middlewares/error.middleware';
import { notificarCambioEstado } from '../services/email.service';

// Selector reutilizable para datos de notificación
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
// Queries secuenciales para evitar timeout con connection_limit=1
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

// ── PATCH /api/areas/tomar/:id ───────────────────────────────
// DERIVADO → EN_PROCESO
export const tomarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const areaId    = req.usuario!.areaId;

    // Carga datos de notificación en el mismo query de validación
    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true, areaActualId: true, ...selectNotificacion },
    });

    if (!expediente)                          throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'DERIVADO')     throw new AppError(400, `Solo se pueden tomar expedientes en DERIVADO.`);
    if (expediente.areaActualId !== areaId)   throw new AppError(403, 'Este expediente no pertenece a tu área.');

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'EN_PROCESO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'TOMA_EXPEDIENTE', estado_resultado: 'EN_PROCESO', areaOrigenId: areaId, comentario: 'Expediente tomado para evaluación técnica.' },
      });
    });

    // Email con datos ya cargados — sin query extra
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
// EN_PROCESO → OBSERVADO
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
    if (!['EN_PROCESO', 'EN_REVISION_MDP'].includes(expediente.estado)) {
      throw new AppError(400, `No se puede observar en estado ${expediente.estado}.`);
    }

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
// EN_PROCESO → RECHAZADO
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
    if (!['EN_PROCESO', 'LISTO_DESCARGA', 'OBSERVADO'].includes(expediente.estado)) {
      throw new AppError(400, `No se puede rechazar en estado ${expediente.estado}.`);
    }

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
// EN_PROCESO → LISTO_DESCARGA
export const darVistoBueno = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const areaId    = req.usuario!.areaId;

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true, areaActualId: true },
    });

    if (!expediente)                           throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'EN_PROCESO')    throw new AppError(400, 'El expediente debe estar EN_PROCESO.');
    if (expediente.areaActualId !== areaId)    throw new AppError(403, 'Este expediente no pertenece a tu área.');

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'LISTO_DESCARGA' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'VISTO_BUENO', estado_resultado: 'LISTO_DESCARGA', comentario: 'Visto bueno otorgado. PDF disponible para descarga y firma.' },
      });
    });

    res.json({ message: 'Visto bueno otorgado. Estado: LISTO_DESCARGA.' });
  } catch (err) { next(err); }
};

// ── POST /api/areas/subir-pdf-firmado/:id ────────────────────
// LISTO_DESCARGA → PDF_FIRMADO → RESUELTO
export const subirPdfFirmado = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id               = Number(req.params['id']);
    const usuarioId        = req.usuario!.id;
    const { url_pdf_firmado } = req.body as { url_pdf_firmado: string };

    if (!url_pdf_firmado?.trim()) throw new AppError(400, 'La URL del PDF firmado es obligatoria.');

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true, ...selectNotificacion },
    });

    if (!expediente)                               throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'LISTO_DESCARGA')    throw new AppError(400, 'El expediente debe estar en LISTO_DESCARGA.');

    const codigo_verificacion_firma = randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id },
        data:  { estado: 'PDF_FIRMADO', url_pdf_firmado: url_pdf_firmado.trim(), codigo_verificacion_firma, fecha_firma: new Date(), firmadoPorId: usuarioId, fecha_resolucion: new Date() },
      });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'SUBIDA_PDF_FIRMADO', estado_resultado: 'PDF_FIRMADO', comentario: `PDF firmado subido. Código: ${codigo_verificacion_firma}` },
      });
      await tx.expediente.update({ where: { id }, data: { estado: 'RESUELTO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'SUBIDA_PDF_FIRMADO', estado_resultado: 'RESUELTO', comentario: 'Expediente resuelto. PDF disponible para el ciudadano.' },
      });
    });

    notificarCambioEstado({
      email:       expediente.ciudadano.email,
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'RESUELTO',
      comentario:  'Su documento oficial está listo para descarga en el portal ciudadano.',
      area:        expediente.areaActual?.nombre,
    }).catch((e) => console.warn('⚠️ Email RESUELTO:', e));

    res.json({ message: 'PDF firmado subido. Expediente RESUELTO.', codigo_verificacion_firma });
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/archivar/:id ────────────────────────────
// RESUELTO → ARCHIVADO
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

    if (!expediente)                         throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'RESUELTO')    throw new AppError(400, 'Solo se pueden archivar expedientes RESUELTOS.');

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'ARCHIVADO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'ARCHIVADO', estado_resultado: 'ARCHIVADO', comentario: 'Expediente archivado en historial permanente.' },
      });
    });

    res.json({ message: 'Expediente ARCHIVADO correctamente.' });
  } catch (err) { next(err); }
};