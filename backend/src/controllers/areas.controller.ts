// src/controllers/areas.controller.ts
// Módulo de Áreas — Técnico y Jefe de Área.
// RF20: Notificaciones automáticas al cambiar estado.

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma }     from '../config/prisma';
import { AppError }   from '../middlewares/error.middleware';
import { notificarCambioEstado } from '../services/email.service';

const getDatosNotificacion = async (expedienteId: number) => {
  return prisma.expediente.findUnique({
    where: { id: expedienteId },
    select: {
      codigo:      true,
      ciudadano:   { select: { email: true, nombres: true } },
      tipoTramite: { select: { nombre: true } },
      areaActual:  { select: { nombre: true } },
    },
  });
};

// ── GET /api/areas/bandeja ───────────────────────────────────
export const bandejaPorArea = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { areaId, rol } = req.usuario!;
    if (!areaId) throw new AppError(403, 'Tu usuario no tiene un área asignada.');

    const estadosPorRol = {
      TECNICO:        ['DERIVADO', 'EN_PROCESO', 'OBSERVADO'],
      JEFE_AREA:      ['EN_PROCESO', 'LISTO_DESCARGA', 'PDF_FIRMADO'],
      ADMIN:          ['DERIVADO', 'EN_PROCESO', 'LISTO_DESCARGA', 'PDF_FIRMADO', 'OBSERVADO'],
      MESA_DE_PARTES: ['DERIVADO', 'EN_PROCESO', 'LISTO_DESCARGA', 'PDF_FIRMADO', 'OBSERVADO', 'RESUELTO'],
    };

    const estados = estadosPorRol[rol as keyof typeof estadosPorRol] ?? [];

    const expedientes = await prisma.expediente.findMany({
      where: { areaActualId: areaId, estado: { in: estados as any[] } },
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
      include: {
        ciudadano: true, tipoTramite: true, areaActual: true,
        registradoPor: { select: { nombre_completo: true, email: true } },
        firmadoPor:    { select: { nombre_completo: true, email: true } },
        pagos: { where: { estado: 'VERIFICADO' }, select: { boleta: true, monto_cobrado: true, fecha_pago: true }, take: 1 },
        documentos: { select: { id: true, nombre: true, url: true, tipo_mime: true, uploaded_at: true } },
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
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/tomar/:id ───────────────────────────────
export const tomarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const areaId    = req.usuario!.areaId;

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'DERIVADO') throw new AppError(400, `Solo se pueden tomar expedientes en estado DERIVADO.`);
    if (expediente.areaActualId !== areaId) throw new AppError(403, 'Este expediente no pertenece a tu área.');

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'EN_PROCESO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'TOMA_EXPEDIENTE', estado_resultado: 'EN_PROCESO', areaOrigenId: areaId, comentario: 'Expediente tomado para evaluación técnica.' },
      });
    });

    try {
      const datos = await getDatosNotificacion(id);
      if (datos) await notificarCambioEstado({ email: datos.ciudadano.email, nombres: datos.ciudadano.nombres, codigo: datos.codigo, tipoTramite: datos.tipoTramite.nombre, estado: 'EN_PROCESO', comentario: null, area: datos.areaActual?.nombre });
    } catch (e) { console.warn('⚠️ Email EN_PROCESO no enviado:', e); }

    res.json({ message: 'Expediente tomado. Estado: EN_PROCESO.' });
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/observar/:id ────────────────────────────
export const observarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const { comentario } = req.body as { comentario: string };

    if (!comentario?.trim()) throw new AppError(400, 'El comentario de observación es obligatorio.');

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (!['EN_PROCESO', 'EN_REVISION_MDP'].includes(expediente.estado)) throw new AppError(400, `No se puede observar en estado ${expediente.estado}.`);

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'OBSERVADO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'OBSERVACION', estado_resultado: 'OBSERVADO', comentario: comentario.trim() },
      });
    });

    try {
      const datos = await getDatosNotificacion(id);
      if (datos) await notificarCambioEstado({ email: datos.ciudadano.email, nombres: datos.ciudadano.nombres, codigo: datos.codigo, tipoTramite: datos.tipoTramite.nombre, estado: 'OBSERVADO', comentario: comentario.trim(), area: datos.areaActual?.nombre });
    } catch (e) { console.warn('⚠️ Email OBSERVADO no enviado:', e); }

    res.json({ message: 'Expediente marcado como OBSERVADO.' });
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/rechazar/:id ────────────────────────────
export const rechazarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const { comentario } = req.body as { comentario: string };

    if (!comentario?.trim()) throw new AppError(400, 'El motivo de rechazo es obligatorio.');

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (!['EN_PROCESO', 'LISTO_DESCARGA', 'OBSERVADO'].includes(expediente.estado)) throw new AppError(400, `No se puede rechazar en estado ${expediente.estado}.`);

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'RECHAZADO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'RECHAZO', estado_resultado: 'RECHAZADO', comentario: comentario.trim() },
      });
    });

    try {
      const datos = await getDatosNotificacion(id);
      if (datos) await notificarCambioEstado({ email: datos.ciudadano.email, nombres: datos.ciudadano.nombres, codigo: datos.codigo, tipoTramite: datos.tipoTramite.nombre, estado: 'RECHAZADO', comentario: comentario.trim(), area: datos.areaActual?.nombre });
    } catch (e) { console.warn('⚠️ Email RECHAZADO no enviado:', e); }

    res.json({ message: 'Expediente RECHAZADO correctamente.' });
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/visto-bueno/:id ─────────────────────────
export const darVistoBueno = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const areaId    = req.usuario!.areaId;

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'EN_PROCESO') throw new AppError(400, `El expediente debe estar EN_PROCESO.`);
    if (expediente.areaActualId !== areaId) throw new AppError(403, 'Este expediente no pertenece a tu área.');

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
export const subirPdfFirmado = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
    const { url_pdf_firmado } = req.body as { url_pdf_firmado: string };

    if (!url_pdf_firmado?.trim()) throw new AppError(400, 'La URL del PDF firmado es obligatoria.');

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'LISTO_DESCARGA') throw new AppError(400, `El expediente debe estar en LISTO_DESCARGA.`);

    const codigo_verificacion_firma = randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id },
        data: { estado: 'PDF_FIRMADO', url_pdf_firmado: url_pdf_firmado.trim(), codigo_verificacion_firma, fecha_firma: new Date(), firmadoPorId: usuarioId, fecha_resolucion: new Date() },
      });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'SUBIDA_PDF_FIRMADO', estado_resultado: 'PDF_FIRMADO', comentario: `PDF firmado subido. Código: ${codigo_verificacion_firma}` },
      });
      await tx.expediente.update({ where: { id }, data: { estado: 'RESUELTO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'SUBIDA_PDF_FIRMADO', estado_resultado: 'RESUELTO', comentario: 'Expediente resuelto. PDF disponible para el ciudadano.' },
      });
    });

    // Notificar al ciudadano que su trámite está RESUELTO
    try {
      const datos = await getDatosNotificacion(id);
      if (datos) await notificarCambioEstado({ email: datos.ciudadano.email, nombres: datos.ciudadano.nombres, codigo: datos.codigo, tipoTramite: datos.tipoTramite.nombre, estado: 'RESUELTO', comentario: 'Su documento oficial está listo para descarga en el portal ciudadano.', area: datos.areaActual?.nombre });
    } catch (e) { console.warn('⚠️ Email RESUELTO no enviado:', e); }

    res.json({ message: 'PDF firmado subido. Expediente RESUELTO.', codigo_verificacion_firma });
  } catch (err) { next(err); }
};

// ── PATCH /api/areas/archivar/:id ────────────────────────────
export const archivarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    const usuarioId = req.usuario!.id;

    const expediente = await prisma.expediente.findUnique({ where: { id } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'RESUELTO') throw new AppError(400, `Solo se pueden archivar expedientes RESUELTOS.`);

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'ARCHIVADO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'ARCHIVADO', estado_resultado: 'ARCHIVADO', comentario: 'Expediente archivado en historial permanente.' },
      });
    });

    res.json({ message: 'Expediente ARCHIVADO correctamente.' });
  } catch (err) { next(err); }
};