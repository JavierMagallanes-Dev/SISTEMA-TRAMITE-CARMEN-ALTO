// src/controllers/mesaPartes.controller.ts
// RF19: Notificación al registrar expediente.
// RF20: Notificación al derivar, observar y reactivar (subsanación).
// NUEVO: PDF unificado con todos los documentos del expediente.

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { generarCodigoExpediente } from '../utils/codigo';
import { consultarReniec } from '../utils/reniec';
import { notificarRegistro, notificarCambioEstado } from '../services/email.service';

const selectNotificacion = {
  codigo:      true,
  ciudadano:   { select: { email: true, nombres: true } },
  tipoTramite: { select: { nombre: true } },
  areaActual:  { select: { nombre: true } },
} as const;

// ── GET /api/mesa-partes/consultar-dni/:dni ──────────────────
export const consultarDni = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const dni = String(req.params['dni']);
    if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) throw new AppError(400, 'DNI inválido.');

    const ciudadanoLocal = await prisma.ciudadano.findFirst({
  where: { numero_documento: dni, tipo_documento: 'DNI' },
});
    if (ciudadanoLocal) { res.json({ fuente: 'local', ciudadano: ciudadanoLocal }); return; }

    const datosReniec = await consultarReniec(dni);
    if (datosReniec) { res.json({ fuente: 'reniec', datos: datosReniec }); return; }

    res.json({ fuente: null, ciudadano: null });
  } catch (err) { next(err); }
};

// ── GET /api/mesa-partes/tipos-tramite ───────────────────────
export const listarTiposTramite = async (
  _req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const tipos = await prisma.tipoTramite.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });
    res.json(tipos);
  } catch (err) { next(err); }
};

// ── GET /api/mesa-partes/areas ───────────────────────────────
export const listarAreasTecnicas = async (
  _req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const areas = await prisma.area.findMany({ where: { sigla: { not: 'MDP' } }, orderBy: { nombre: 'asc' } });
    res.json(areas);
  } catch (err) { next(err); }
};

// ── POST /api/mesa-partes/registrar ─────────────────────────
export const registrarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { dni, nombres, apellido_pat, apellido_mat, email, telefono, tipoTramiteId } = req.body as Record<string, string>;
    const registradoPorId = req.usuario!.id;

    if (!dni || !nombres || !apellido_pat || !email || !tipoTramiteId) throw new AppError(400, 'Faltan campos requeridos.');
    if (dni.length !== 8 || !/^\d+$/.test(dni)) throw new AppError(400, 'DNI inválido.');

    const tipoTramite = await prisma.tipoTramite.findUnique({ where: { id: Number(tipoTramiteId) } });
    if (!tipoTramite || !tipoTramite.activo) throw new AppError(400, 'Tipo de trámite no válido.');

    const ciudadano = await prisma.ciudadano.upsert({
  where:  { email: email.toLowerCase().trim() },
  update: {
    tipo_documento:   'DNI',
    numero_documento: dni,
    dni,
    nombres:      nombres.trim(),
    apellido_pat: apellido_pat.trim(),
    apellido_mat: (apellido_mat ?? '').trim(),
    ...(telefono && { telefono: telefono.trim() }),
  },
  create: {
    tipo_documento:   'DNI',
    numero_documento: dni,
    dni,
    nombres:      nombres.trim(),
    apellido_pat: apellido_pat.trim(),
    apellido_mat: (apellido_mat ?? '').trim(),
    email:        email.toLowerCase().trim(),
    telefono:     telefono ? telefono.trim() : null,
  },
});

    const codigo       = await generarCodigoExpediente();
    const fecha_limite = new Date();
    fecha_limite.setDate(fecha_limite.getDate() + tipoTramite.plazo_dias);

    const expediente = await prisma.$transaction(async (tx) => {
      const exp = await tx.expediente.create({
        data: { codigo, ciudadanoId: ciudadano.id, tipoTramiteId: Number(tipoTramiteId), estado: 'PENDIENTE_PAGO', fecha_limite, registradoPorId },
        include: { ciudadano: true, tipoTramite: true },
      });
      await tx.movimiento.create({
        data: { expedienteId: exp.id, usuarioId: registradoPorId, tipo_accion: 'REGISTRO', estado_resultado: 'PENDIENTE_PAGO', comentario: `Expediente registrado. Trámite: ${tipoTramite.nombre}` },
      });
      return exp;
    });

    notificarRegistro({
      email:          ciudadano.email,
      nombres:        ciudadano.nombres,
      codigo:         expediente.codigo,
      tipoTramite:    tipoTramite.nombre,
      fecha_registro: expediente.fecha_registro,
      fecha_limite:   expediente.fecha_limite,
      costo_soles:    Number(tipoTramite.costo_soles),
    }).catch((e) => console.warn('⚠️ Email RF19:', e));

    res.status(201).json({ message: 'Expediente registrado correctamente.', expediente });
  } catch (err) { next(err); }
};

// ── GET /api/mesa-partes/bandeja ─────────────────────────────
export const bandejaMDP = async (
  _req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const expedientes = await prisma.expediente.findMany({
      where:   { estado: { in: ['RECIBIDO', 'EN_REVISION_MDP', 'OBSERVADO'] } },
      select: {
        id: true, codigo: true, estado: true, fecha_registro: true, fecha_limite: true,
        ciudadano:   { select: { dni: true, nombres: true, apellido_pat: true, apellido_mat: true, email: true } },
        tipoTramite: { select: { nombre: true, costo_soles: true } },
        pagos: { where: { estado: 'VERIFICADO' }, select: { boleta: true, monto_cobrado: true, fecha_pago: true }, take: 1 },
      },
      orderBy: { fecha_registro: 'asc' },
    });
    res.json(expedientes);
  } catch (err) { next(err); }
};

// ── GET /api/mesa-partes/expediente/:id/pdf-unificado ────────
// Fusiona todos los PDFs del expediente en uno solo para descarga.
export const descargarPdfUnificado = async (
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

    // Crear PDF unificado
    const pdfFinal = await PDFDocument.create();

    // Agregar portada de índice
    const portada = pdfFinal.addPage([595, 842]); // A4
    const { width, height } = portada.getSize();

    portada.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
    portada.drawText('MUNICIPALIDAD DISTRITAL DE CARMEN ALTO', { x: 40, y: height - 30, size: 13, color: { red: 1, green: 1, blue: 1, type: 'RGB' as any } });
    portada.drawText('Sistema de Trámite Documentario', { x: 40, y: height - 50, size: 10, color: { red: 0.75, green: 0.85, blue: 0.95, type: 'RGB' as any } });

    portada.drawText('EXPEDIENTE UNIFICADO', { x: 40, y: height - 120, size: 16, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
    portada.drawText(`Código: ${expediente.codigo}`, { x: 40, y: height - 150, size: 12, color: { red: 0.1, green: 0.37, blue: 0.65, type: 'RGB' as any } });
    portada.drawText(`Ciudadano: ${expediente.ciudadano.nombres} ${expediente.ciudadano.apellido_pat}`, { x: 40, y: height - 175, size: 11, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } });
    portada.drawText(`Trámite: ${expediente.tipoTramite.nombre}`, { x: 40, y: height - 195, size: 11, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } });
    portada.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 40, y: height - 215, size: 10, color: { red: 0.5, green: 0.5, blue: 0.5, type: 'RGB' as any } });

    // Índice de documentos
    portada.drawText('DOCUMENTOS INCLUIDOS:', { x: 40, y: height - 260, size: 11, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
    portada.drawRectangle({ x: 40, y: height - 268, width: width - 80, height: 1, color: { red: 0.85, green: 0.85, blue: 0.85, type: 'RGB' as any } });

    docsPdf.forEach((doc, i) => {
      const nombre = doc.nombre.startsWith('REQ-') ? doc.nombre.replace(/^REQ-\d+:\s*/, '') : doc.nombre;
      portada.drawText(`${i + 1}. ${nombre}`, { x: 40, y: height - 290 - (i * 22), size: 10, color: { red: 0.2, green: 0.2, blue: 0.2, type: 'RGB' as any } });
    });

    // Fusionar cada PDF
    let errores = 0;
    for (const doc of docsPdf) {
      try {
        const response = await fetch(doc.url);
        if (!response.ok) { errores++; continue; }
        const arrayBuffer = await response.arrayBuffer();
        const pdfDoc      = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const paginas     = await pdfFinal.copyPages(pdfDoc, pdfDoc.getPageIndices());

        // Página separadora con nombre del documento
        const separador = pdfFinal.addPage([595, 842]);
        separador.drawRectangle({ x: 0, y: 380, width: 595, height: 82, color: { red: 0.93, green: 0.95, blue: 0.98, type: 'RGB' as any } });
        const nombre = doc.nombre.startsWith('REQ-') ? doc.nombre.replace(/^REQ-\d+:\s*/, '') : doc.nombre;
        separador.drawText(nombre, { x: 40, y: 430, size: 14, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
        separador.drawText(`Documento ${docsPdf.indexOf(doc) + 1} de ${docsPdf.length}`, { x: 40, y: 408, size: 10, color: { red: 0.5, green: 0.5, blue: 0.5, type: 'RGB' as any } });

        paginas.forEach(p => pdfFinal.addPage(p));
      } catch {
        errores++;
      }
    }

    if (pdfFinal.getPageCount() <= 1 && errores === docsPdf.length) {
      throw new AppError(500, 'No se pudieron descargar los documentos para unificar.');
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

// ── PATCH /api/mesa-partes/observar/:id ──────────────────────
export const observarExpedienteMDP = async (
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
    if (!['RECIBIDO', 'EN_REVISION_MDP', 'EN_PROCESO'].includes(expediente.estado)) {
      throw new AppError(400, `No se puede observar un expediente en estado ${expediente.estado}.`);
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
    }).catch((e) => console.warn('⚠️ Email OBSERVADO MDP:', e));

    res.json({ message: 'Expediente marcado como OBSERVADO. Ciudadano notificado.' });
  } catch (err) { next(err); }
};

// ── PATCH /api/mesa-partes/reactivar/:id ─────────────────────
export const reactivarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { estado: true, ...selectNotificacion },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'OBSERVADO') {
      throw new AppError(400, `Solo se pueden reactivar expedientes en OBSERVADO. Estado: ${expediente.estado}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'RECIBIDO' } });
      await tx.movimiento.create({
        data: {
          expedienteId:     id,
          usuarioId,
          tipo_accion:      'SUBSANACION',
          estado_resultado: 'RECIBIDO',
          comentario:       'Expediente reactivado por Mesa de Partes. Documentos subsanados por el ciudadano.',
        },
      });
    });

    notificarCambioEstado({
      email:       expediente.ciudadano.email,
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'SUBSANADO',
      comentario:  'Tus documentos han sido revisados y subsanados correctamente. Tu trámite está en espera de derivación al área técnica.',
      area:        expediente.areaActual?.nombre,
    }).catch((e) => console.warn('⚠️ Email SUBSANACION:', e));

    res.json({ message: 'Expediente reactivado. Estado: RECIBIDO.' });
  } catch (err) { next(err); }
};

// ── POST /api/mesa-partes/derivar ────────────────────────────
export const derivarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { expedienteId, areaDestinoId, instrucciones } = req.body as Record<string, string>;
    const usuarioId = req.usuario!.id;

    if (!expedienteId || !areaDestinoId) throw new AppError(400, 'Faltan campos: expedienteId, areaDestinoId.');

    const expediente = await prisma.expediente.findUnique({
      where:   { id: Number(expedienteId) },
      include: { ciudadano: true, tipoTramite: true },
    });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (!['EN_REVISION_MDP', 'RECIBIDO'].includes(expediente.estado)) {
      throw new AppError(400, `No se puede derivar en estado ${expediente.estado}.`);
    }

    const area = await prisma.area.findUnique({ where: { id: Number(areaDestinoId) } });
    if (!area) throw new AppError(400, 'Área destino no encontrada.');

    const token      = randomBytes(32).toString('hex');
    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + 24);

    await prisma.$transaction(async (tx) => {
      await tx.derivacionPendiente.create({
        data: { expedienteId: Number(expedienteId), areaDestinoId: Number(areaDestinoId), token, instrucciones: instrucciones?.trim() ?? null, estado: 'PENDIENTE', expires_at },
      });
      await tx.expediente.update({ where: { id: Number(expedienteId) }, data: { estado: 'EN_REVISION_MDP', areaActualId: Number(areaDestinoId) } });
      await tx.movimiento.create({
        data: { expedienteId: Number(expedienteId), usuarioId, tipo_accion: 'DERIVACION', estado_resultado: 'EN_REVISION_MDP', areaDestinoId: Number(areaDestinoId), comentario: instrucciones ? `Derivado a ${area.nombre}. Instrucciones: ${instrucciones.trim()}` : `Derivado a ${area.nombre}.` },
      });
    });

    res.json({ message: `Expediente derivado a ${area.nombre}.`, token, expires_at });
  } catch (err) { next(err); }
};

// ── POST /api/mesa-partes/confirmar-derivacion ───────────────
export const confirmarDerivacion = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body as { token: string };
    if (!token) throw new AppError(400, 'Token requerido.');

    const derivacion = await prisma.derivacionPendiente.findUnique({ where: { token } });
    if (!derivacion) throw new AppError(404, 'Token inválido.');
    if (derivacion.estado === 'CONFIRMADO') throw new AppError(400, 'Ya fue confirmada.');
    if (derivacion.estado === 'EXPIRADO' || derivacion.expires_at < new Date()) throw new AppError(400, 'Token expirado.');

    await prisma.$transaction(async (tx) => {
      await tx.derivacionPendiente.update({ where: { token }, data: { estado: 'CONFIRMADO' } });
      await tx.expediente.update({ where: { id: derivacion.expedienteId }, data: { estado: 'DERIVADO' } });
      await tx.movimiento.create({
        data: { expedienteId: derivacion.expedienteId, usuarioId: req.usuario!.id, tipo_accion: 'DERIVACION', estado_resultado: 'DERIVADO', areaDestinoId: derivacion.areaDestinoId, comentario: 'Derivación confirmada por token.' },
      });
    });

    const datos = await prisma.expediente.findUnique({
      where: { id: derivacion.expedienteId },
      select: selectNotificacion,
    });

    if (datos) {
      notificarCambioEstado({
        email:       datos.ciudadano.email,
        nombres:     datos.ciudadano.nombres,
        codigo:      datos.codigo,
        tipoTramite: datos.tipoTramite.nombre,
        estado:      'DERIVADO',
        comentario:  null,
        area:        datos.areaActual?.nombre,
      }).catch((e) => console.warn('⚠️ Email DERIVADO:', e));
    }

    res.json({ message: 'Derivación confirmada. El expediente avanzó a DERIVADO.' });
  } catch (err) { next(err); }
};