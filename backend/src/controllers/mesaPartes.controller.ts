// src/controllers/mesaPartes.controller.ts
// Mesa de Partes — derivación con PIN de seguridad asignado por Admin.

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { generarCodigoExpediente } from '../utils/codigo';
import { consultarReniec } from '../utils/reniec';
import { notificarRegistro, notificarCambioEstado } from '../services/email.service';
import { storageService } from '../services/storage.service';
import { crearNotificacion } from './notificaciones.controller';

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

    let ciudadano = await prisma.ciudadano.findFirst({
  where: { numero_documento: dni, tipo_documento: 'DNI' },
});

if (!ciudadano) {
  ciudadano = await prisma.ciudadano.create({
    data: {
      tipo_documento: 'DNI', numero_documento: dni, dni,
      nombres: nombres.trim(), apellido_pat: apellido_pat.trim(),
      apellido_mat: (apellido_mat ?? '').trim(),
      email: email.toLowerCase().trim(),
      telefono: telefono ? telefono.trim() : null,
    },
  });
}
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
 const usuariosMDP = await prisma.usuario.findMany({
  where: { activo: true, rol: { nombre: 'MESA_DE_PARTES' } },
  select: { id: true },
});
usuariosMDP.forEach(u => crearNotificacion(
  u.id,
  'Nuevo trámite registrado',
  `${ciudadano.nombres} ${ciudadano.apellido_pat} registró: ${tipoTramite.nombre} (${expediente.codigo})`,
  expediente.id,
));
    
    notificarRegistro({
      nombres: ciudadano.nombres ?? '',
      email: ciudadano.email ?? '',
      codigo: expediente.codigo, tipoTramite: tipoTramite.nombre,
      fecha_registro: expediente.fecha_registro, fecha_limite: expediente.fecha_limite,
      costo_soles: Number(tipoTramite.costo_soles),
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
      orderBy: { fecha_registro: 'desc' },
    });
    res.json(expedientes);
  } catch (err) { next(err); }
};

// ── GET /api/mesa-partes/expediente/:id/pdf-unificado ────────
export const descargarPdfUnificado = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    if (!id) throw new AppError(400, 'ID de expediente inválido.');

    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: {
        codigo: true,
        ciudadano:   { select: { nombres: true, apellido_pat: true } },
        tipoTramite: { select: { nombre: true } },
        documentos:  { select: { id: true, nombre: true, url: true, tipo_mime: true }, orderBy: { uploaded_at: 'asc' } },
      },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    const docsPdf = expediente.documentos.filter(d => d.tipo_mime === 'application/pdf');
    if (docsPdf.length === 0) throw new AppError(404, 'El expediente no tiene documentos PDF adjuntos.');

    const pdfFinal = await PDFDocument.create();
    const portada  = pdfFinal.addPage([595, 842]);
    const { width, height } = portada.getSize();

    portada.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
    portada.drawText('MUNICIPALIDAD DISTRITAL DE CARMEN ALTO', { x: 40, y: height - 30, size: 13, color: { red: 1, green: 1, blue: 1, type: 'RGB' as any } });
    portada.drawText('Sistema de Tramite Documentario', { x: 40, y: height - 50, size: 10, color: { red: 0.75, green: 0.85, blue: 0.95, type: 'RGB' as any } });
    portada.drawText('EXPEDIENTE UNIFICADO', { x: 40, y: height - 120, size: 16, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
    portada.drawText(`Codigo: ${expediente.codigo}`, { x: 40, y: height - 150, size: 12, color: { red: 0.1, green: 0.37, blue: 0.65, type: 'RGB' as any } });
    portada.drawText(`Ciudadano: ${expediente.ciudadano.nombres} ${expediente.ciudadano.apellido_pat}`, { x: 40, y: height - 175, size: 11, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } });
    portada.drawText(`Tramite: ${expediente.tipoTramite.nombre}`, { x: 40, y: height - 195, size: 11, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } });
    portada.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 40, y: height - 215, size: 10, color: { red: 0.5, green: 0.5, blue: 0.5, type: 'RGB' as any } });
    portada.drawText('DOCUMENTOS INCLUIDOS:', { x: 40, y: height - 260, size: 11, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
    docsPdf.forEach((doc, i) => {
      const nombre = doc.nombre.startsWith('REQ-') ? doc.nombre.replace(/^REQ-\d+:\s*/, '') : doc.nombre;
      portada.drawText(`${i + 1}. ${nombre}`, { x: 40, y: height - 290 - (i * 22), size: 10, color: { red: 0.2, green: 0.2, blue: 0.2, type: 'RGB' as any } });
    });

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



export const derivarExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const usuarioId = req.usuario!.id;
    const { expedienteId, areaDestinoId, instrucciones, pin } = req.body as Record<string, string>;

    if (!expedienteId || !areaDestinoId) throw new AppError(400, 'Faltan campos: expedienteId, areaDestinoId.');
    if (!pin?.trim()) throw new AppError(400, 'El PIN de seguridad es obligatorio.');

    const usuario = await prisma.usuario.findUnique({
      where:  { id: usuarioId },
      select: { pin_derivacion: true, nombre_completo: true },
    });
    if (!usuario)               throw new AppError(404, 'Usuario no encontrado.');
    if (!usuario.pin_derivacion) throw new AppError(400, 'No tienes un PIN asignado. Contacta al Administrador.');
    if (usuario.pin_derivacion !== pin.trim()) throw new AppError(401, 'PIN incorrecto.');

    const expediente = await prisma.expediente.findUnique({
      where:   { id: Number(expedienteId) },
      include: { ciudadano: true, tipoTramite: true },
    });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (!['EN_REVISION_MDP', 'RECIBIDO'].includes(expediente.estado))
      throw new AppError(400, `No se puede derivar en estado ${expediente.estado}.`);

    const area = await prisma.area.findUnique({ where: { id: Number(areaDestinoId) } });
    if (!area) throw new AppError(400, 'Área destino no encontrada.');

    // ── Generar y guardar PDF unificado para el Técnico ──────
    // Obtener documentos del expediente (solo PDFs originales)
    const documentos = await prisma.documento.findMany({
      where:   { expedienteId: Number(expedienteId), tipo_mime: 'application/pdf' },
      orderBy: { uploaded_at: 'asc' },
    });

    if (documentos.length > 0) {
      try {
        const pdfFinal = await PDFDocument.create();

        // Portada
        const portada = pdfFinal.addPage([595, 842]);
        const { width, height } = portada.getSize();
        portada.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
        portada.drawText('MUNICIPALIDAD DISTRITAL DE CARMEN ALTO', { x: 40, y: height - 30, size: 13, color: { red: 1, green: 1, blue: 1, type: 'RGB' as any } });
        portada.drawText('Sistema de Tramite Documentario', { x: 40, y: height - 50, size: 10, color: { red: 0.75, green: 0.85, blue: 0.95, type: 'RGB' as any } });
        portada.drawText('EXPEDIENTE UNIFICADO', { x: 40, y: height - 120, size: 16, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
        portada.drawText(`Codigo: ${expediente.codigo}`, { x: 40, y: height - 150, size: 12, color: { red: 0.1, green: 0.37, blue: 0.65, type: 'RGB' as any } });
        portada.drawText(`Ciudadano: ${expediente.ciudadano.nombres} ${expediente.ciudadano.apellido_pat}`, { x: 40, y: height - 175, size: 11, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } });
        portada.drawText(`Tramite: ${expediente.tipoTramite.nombre}`, { x: 40, y: height - 195, size: 11, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } });
        portada.drawText(`Derivado a: ${area.nombre}`, { x: 40, y: height - 215, size: 11, color: { red: 0.3, green: 0.3, blue: 0.3, type: 'RGB' as any } });
        portada.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 40, y: height - 235, size: 10, color: { red: 0.5, green: 0.5, blue: 0.5, type: 'RGB' as any } });
        portada.drawText('DOCUMENTOS INCLUIDOS:', { x: 40, y: height - 275, size: 11, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });

        documentos.forEach((doc, i) => {
          const nombre = doc.nombre.startsWith('REQ-') ? doc.nombre.replace(/^REQ-\d+:\s*/, '') : doc.nombre;
          portada.drawText(`${i + 1}. ${nombre}`, { x: 40, y: height - 297 - (i * 22), size: 10, color: { red: 0.2, green: 0.2, blue: 0.2, type: 'RGB' as any } });
        });

        // Fusionar PDFs
        for (const doc of documentos) {
          try {
            const response    = await fetch(doc.url);
            if (!response.ok) continue;
            const arrayBuffer = await response.arrayBuffer();
            const pdfDoc      = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const paginas     = await pdfFinal.copyPages(pdfDoc, pdfDoc.getPageIndices());
            const separador   = pdfFinal.addPage([595, 842]);
            const nombre      = doc.nombre.startsWith('REQ-') ? doc.nombre.replace(/^REQ-\d+:\s*/, '') : doc.nombre;
            separador.drawRectangle({ x: 0, y: 380, width: 595, height: 82, color: { red: 0.93, green: 0.95, blue: 0.98, type: 'RGB' as any } });
            separador.drawText(nombre, { x: 40, y: 430, size: 14, color: { red: 0.016, green: 0.173, blue: 0.322, type: 'RGB' as any } });
            paginas.forEach(p => pdfFinal.addPage(p));
          } catch { continue; }
        }

        // Subir a Supabase y guardar como documento del expediente
        const pdfBytes  = await pdfFinal.save();
        const pdfBuffer = Buffer.from(pdfBytes);
        const { storageService } = await import('../services/storage.service');
        const urlUnificado = await storageService.subirArchivo(pdfBuffer, 'application/pdf', 'expedientes');

        // Eliminar PDF unificado anterior si existe
        await prisma.documento.deleteMany({
          where: { expedienteId: Number(expedienteId), nombre: `PDF_UNIFICADO: ${expediente.codigo}` },
        });

        // Guardar nuevo PDF unificado
        await prisma.documento.create({
          data: {
            expedienteId: Number(expedienteId),
            nombre:       `PDF_UNIFICADO: ${expediente.codigo}`,
            url:          urlUnificado,
            tipo_mime:    'application/pdf',
          },
        });

        console.log(`✅ PDF unificado guardado para expediente ${expediente.codigo}`);
      } catch (e) {
        console.warn('⚠️ No se pudo generar el PDF unificado al derivar:', e);
        // No lanzar error — la derivación continúa aunque falle el PDF
      }
    }
const tecnicosArea = await prisma.usuario.findMany({
  where: { activo: true, areaId: Number(areaDestinoId), rol: { nombre: { in: ['TECNICO', 'JEFE_AREA'] } } },
  select: { id: true },
});
tecnicosArea.forEach(u => crearNotificacion(
  u.id,
  'Expediente derivado a tu área',
  `El expediente ${expediente.codigo} — ${expediente.tipoTramite.nombre} fue derivado a ${area.nombre} para evaluación técnica.`,
  Number(expedienteId),
));
    // ── Derivación normal ────────────────────────────────────
    const token      = randomBytes(32).toString('hex');
    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + 24);

    await prisma.$transaction(async (tx) => {
      await tx.derivacionPendiente.create({
        data: { expedienteId: Number(expedienteId), areaDestinoId: Number(areaDestinoId), token, instrucciones: instrucciones?.trim() ?? null, estado: 'PENDIENTE', expires_at },
      });
      await tx.expediente.update({
        where: { id: Number(expedienteId) },
        data:  { estado: 'EN_REVISION_MDP', areaActualId: Number(areaDestinoId) },
      });
      await tx.movimiento.create({
        data: { expedienteId: Number(expedienteId), usuarioId, tipo_accion: 'DERIVACION', estado_resultado: 'EN_REVISION_MDP', areaDestinoId: Number(areaDestinoId),  comentario: instrucciones
  ? `${getComentarioAutomatico('DERIVAR', expediente.tipoTramiteId)} Instrucciones: ${instrucciones.trim()}`
  : getComentarioAutomatico('DERIVAR', expediente.tipoTramiteId)},
      });
    });

    await prisma.$transaction(async (tx) => {
      await tx.derivacionPendiente.update({ where: { token }, data: { estado: 'CONFIRMADO' } });
      await tx.expediente.update({ where: { id: Number(expedienteId) }, data: { estado: 'DERIVADO' } });
      await tx.movimiento.create({
        data: { expedienteId: Number(expedienteId), usuarioId, tipo_accion: 'DERIVACION', estado_resultado: 'DERIVADO', areaDestinoId: Number(areaDestinoId), comentario: 'Derivación confirmada con PIN de seguridad.' },
      });
    });

    notificarCambioEstado({
      email:       expediente.ciudadano.email ?? '',
      nombres:     expediente.ciudadano.nombres,
      codigo:      expediente.codigo,
      tipoTramite: expediente.tipoTramite.nombre,
      estado:      'DERIVADO',
      comentario:  null,
      area:        area.nombre,
    }).catch((e) => console.warn('⚠️ Email DERIVADO:', e));

    res.json({ message: `Expediente derivado a ${area.nombre} correctamente.` });
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
    if (!['RECIBIDO', 'EN_REVISION_MDP', 'EN_PROCESO'].includes(expediente.estado))
      throw new AppError(400, `No se puede observar en estado ${expediente.estado}.`);

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'OBSERVADO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'OBSERVACION', estado_resultado: 'OBSERVADO', comentario: comentario.trim() },
      });
    });

    notificarCambioEstado({
  email:       expediente.ciudadano.email ?? '',
  nombres:     expediente.ciudadano.nombres,
  codigo:      expediente.codigo,
  tipoTramite: expediente.tipoTramite.nombre,
  estado:      'OBSERVADO',
  comentario:  comentario.trim(),
  area:        expediente.areaActual?.nombre,
}).catch((e) => console.warn('⚠️ Email OBSERVADO MDP:', e));

    res.json({ message: 'Expediente marcado como OBSERVADO.' });
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
    if (expediente.estado !== 'OBSERVADO')
      throw new AppError(400, `Solo se pueden reactivar expedientes en OBSERVADO.`);

    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({ where: { id }, data: { estado: 'RECIBIDO' } });
      await tx.movimiento.create({
        data: { expedienteId: id, usuarioId, tipo_accion: 'SUBSANACION', estado_resultado: 'RECIBIDO', comentario: 'Expediente reactivado. Documentos subsanados.' },
      });
    });

    notificarCambioEstado({
  email:       expediente.ciudadano.email ?? '',
  nombres:     expediente.ciudadano.nombres,
  codigo:      expediente.codigo,
  tipoTramite: expediente.tipoTramite.nombre,
  estado:      'SUBSANADO',
  comentario:  'Tus documentos han sido revisados y aceptados.',
  area:        expediente.areaActual?.nombre,
}).catch((e) => console.warn('⚠️ Email SUBSANACION MDP:', e));

    res.json({ message: 'Expediente reactivado. Estado: RECIBIDO.' });
  } catch (err) { next(err); }
};

export const getVencidos = async (
  _req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const hoy         = new Date();
    const en2Dias     = new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000);
    const estadosActivos = ['PENDIENTE_PAGO', 'RECIBIDO', 'EN_REVISION_MDP', 'DERIVADO', 'EN_PROCESO', 'OBSERVADO'];
 
    const [vencidos, porVencer] = await Promise.all([
      prisma.expediente.findMany({
        where: {
          fecha_limite: { lt: hoy },
          estado:       { in: estadosActivos as any[] },
        },
        select: {
          id: true, codigo: true, estado: true,
          fecha_registro: true, fecha_limite: true,
          ciudadano:   { select: { nombres: true, apellido_pat: true, dni: true, email: true } },
          tipoTramite: { select: { nombre: true, plazo_dias: true } },
          areaActual:  { select: { nombre: true } },
        },
        orderBy: { fecha_limite: 'asc' },
      }),
      prisma.expediente.findMany({
        where: {
          fecha_limite: { gte: hoy, lte: en2Dias },
          estado:       { in: estadosActivos as any[] },
        },
        select: {
          id: true, codigo: true, estado: true,
          fecha_registro: true, fecha_limite: true,
          ciudadano:   { select: { nombres: true, apellido_pat: true, dni: true, email: true } },
          tipoTramite: { select: { nombre: true, plazo_dias: true } },
          areaActual:  { select: { nombre: true } },
        },
        orderBy: { fecha_limite: 'asc' },
      }),
    ]);
 
    res.json({ vencidos, porVencer });
  } catch (err) { next(err); }
};

export const reactivarVencido = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;
 
    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: {
        codigo: true, estado: true, fecha_limite: true,
        ciudadano:   { select: { email: true, nombres: true, apellido_pat: true } },
        tipoTramite: { select: { nombre: true, plazo_dias: true } },
        areaActual:  { select: { nombre: true } },
      },
    });
 
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
 
    // Extender la fecha límite en el plazo original del trámite
    const nuevaFecha = new Date();
    nuevaFecha.setDate(nuevaFecha.getDate() + expediente.tipoTramite.plazo_dias);
 
    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id },
        data:  { fecha_limite: nuevaFecha },
      });
 
      await tx.movimiento.create({
        data: {
          expedienteId:     id,
          usuarioId,
          tipo_accion:      'REVISION_MDP',
          estado_resultado: expediente.estado as any,
          comentario:       `Plazo reactivado por Mesa de Partes. Nueva fecha límite: ${nuevaFecha.toLocaleDateString('es-PE')}. Se envió disculpa al ciudadano.`,
        },
      });
    });
 
    // Email de disculpas al ciudadano
    const { Resend } = await import('resend');
    const { env }    = await import('../config/env');
    const resend     = new Resend(env.RESEND_API_KEY);
 
    await resend.emails.send({
      from:    'Municipalidad Carmen Alto <noreply@municipalidadcarmenalto.site>',
      to:      expediente.ciudadano.email ?? '',
      subject: `Actualización importante sobre su trámite ${expediente.codigo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <div style="background: #042C53; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0; font-size: 18px;">Municipalidad Distrital de Carmen Alto</h2>
            <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px;">Sistema de Trámite Documentario</p>
          </div>
          <div style="background: #f8f9fb; padding: 28px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #1e293b; font-size: 15px;">
              Estimado/a <strong>${expediente.ciudadano.nombres} ${expediente.ciudadano.apellido_pat}</strong>,
            </p>
            <p style="color: #475569; font-size: 14px; line-height: 1.7;">
              Le comunicamos que el plazo de atención de su trámite
              <strong>${expediente.tipoTramite.nombre}</strong>
              (código <strong style="color: #1d6fc7">${expediente.codigo}</strong>)
              fue extendido por parte de Mesa de Partes.
            </p>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin: 16px 0;">
              <p style="color: #92400e; font-size: 13px; margin: 0;">
                <strong>⚠ Sobre el retraso:</strong> Lamentamos sinceramente el inconveniente ocasionado por no haber atendido su trámite dentro del plazo establecido. Le pedimos disculpas por las molestias generadas.
              </p>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 16px; margin: 16px 0;">
              <p style="color: #14532d; font-size: 13px; margin: 0;">
                <strong>✓ Nueva fecha límite de atención:</strong><br/>
                <span style="font-size: 15px; font-weight: bold;">${nuevaFecha.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </p>
            </div>
            <p style="color: #475569; font-size: 14px; line-height: 1.7;">
              Su trámite será atendido con prioridad. Puede consultar el estado en cualquier momento ingresando su código en nuestro portal.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; text-align: center;">
              Municipalidad Distrital de Carmen Alto · (066) 123-456
            </p>
          </div>
        </div>
      `,
    }).catch((e: any) => console.warn('⚠️ Email disculpa no enviado:', e));
 
    res.json({
      message:      `Plazo extendido correctamente. Email de disculpa enviado a ${expediente.ciudadano.email}.`,
      nueva_fecha:  nuevaFecha,
    });
  } catch (err) { next(err); }
};