// src/controllers/portal.controller.ts
// Portal público para el ciudadano — sin autenticación.
// RF19: Notificación al registrar trámite desde el portal.
// Soporta: DNI, Carnet de Extranjería, Pasaporte.
// Punto 3: Adjuntar documentos uno por uno según requisitos.

import { Request, Response, NextFunction } from 'express';
import { prisma }   from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { generarCodigoExpediente } from '../utils/codigo';
import { consultarReniec }         from '../utils/reniec';
import { notificarRegistro }       from '../services/email.service';
import { storageService }          from '../services/storage.service';


// ── GET /api/portal/tipos-tramite ────────────────────────────
export const listarTiposTramitePublico = async (
  _req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const tipos = await prisma.tipoTramite.findMany({
      where:   { activo: true },
      select:  { id: true, nombre: true, descripcion: true, plazo_dias: true, costo_soles: true },
      orderBy: { nombre: 'asc' },
    });
    res.json(tipos);
  } catch (err) { next(err); }
};

// ── GET /api/portal/tipos-tramite/:id/requisitos ─────────────
export const listarRequisitos = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const tipoTramiteId = Number(req.params['id']);
    if (!tipoTramiteId) throw new AppError(400, 'ID de tipo de trámite inválido.');

    const requisitos = await prisma.requisito.findMany({
      where:   { tipo_tramite_id: tipoTramiteId },
      select:  { id: true, nombre: true, descripcion: true, obligatorio: true, orden: true },
      orderBy: { orden: 'asc' },
    });

    res.json(requisitos);
  } catch (err) { next(err); }
};

// ── GET /api/portal/consultar-dni/:dni ───────────────────────
export const consultarDniPublico = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const dni = String(req.params['dni']);
    if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) throw new AppError(400, 'DNI inválido.');

    const ciudadanoLocal = await prisma.ciudadano.findFirst({
      where:  { numero_documento: dni, tipo_documento: 'DNI' },
      select: { nombres: true, apellido_pat: true, apellido_mat: true, email: true, telefono: true },
    });
    if (ciudadanoLocal) { res.json({ fuente: 'local', datos: ciudadanoLocal }); return; }

    const datosReniec = await consultarReniec(dni);
    if (datosReniec) { res.json({ fuente: 'reniec', datos: datosReniec }); return; }

    res.json({ fuente: null, datos: null });
  } catch (err) { next(err); }
};

// ── POST /api/portal/registrar ───────────────────────────────
export const registrarTramitePublico = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const {
      tipoDocumento, dni,
      nombres, apellido_pat, apellido_mat,
      email, telefono, tipoTramiteId,
      pais_emision, fecha_vencimiento, fecha_nacimiento,
    } = req.body as Record<string, string>;

    const numeroDoc = dni || req.body.numero_documento;
    const tipoDoc   = tipoDocumento || 'DNI';

    if (!numeroDoc || !nombres || !apellido_pat || !email || !tipoTramiteId)
      throw new AppError(400, 'Faltan campos requeridos.');

    if (tipoDoc === 'DNI') {
      if (numeroDoc.length !== 8 || !/^\d+$/.test(numeroDoc))
        throw new AppError(400, 'El DNI debe tener exactamente 8 dígitos numéricos.');
    } else if (tipoDoc === 'CARNET') {
      if (!/^\d{6,12}$/.test(numeroDoc))
        throw new AppError(400, 'El Carnet de Extranjería debe tener entre 6 y 12 dígitos.');
    } else if (tipoDoc === 'PASAPORTE') {
      if (numeroDoc.trim().length < 6)
        throw new AppError(400, 'El número de pasaporte debe tener al menos 6 caracteres.');
      if (!pais_emision)
        throw new AppError(400, 'Debes indicar el país de emisión del pasaporte.');
    }

    const tipoTramite = await prisma.tipoTramite.findUnique({ where: { id: Number(tipoTramiteId) } });
    if (!tipoTramite || !tipoTramite.activo) throw new AppError(400, 'Tipo de trámite no válido o inactivo.');

   let ciudadano = await prisma.ciudadano.findFirst({
  where: { numero_documento: numeroDoc.trim().toUpperCase(), tipo_documento: tipoDoc },
});

if (!ciudadano) {
  ciudadano = await prisma.ciudadano.create({
    data: {
      tipo_documento:    tipoDoc,
      numero_documento:  numeroDoc.trim().toUpperCase(),
      dni:               tipoDoc === 'DNI' ? numeroDoc.trim() : null,
      nombres:           nombres.trim(),
      apellido_pat:      apellido_pat.trim(),
      apellido_mat:      (apellido_mat ?? '').trim(),
      email:             email.toLowerCase().trim(),
      telefono:          telefono ? telefono.trim() : null,
      pais_emision:      pais_emision      ? pais_emision.trim()      : null,
      fecha_vencimiento: fecha_vencimiento ? fecha_vencimiento.trim() : null,
      fecha_nacimiento:  fecha_nacimiento  ? fecha_nacimiento.trim()  : null,
    },
  });
}
    const codigo       = await generarCodigoExpediente();
    const fecha_limite = new Date();
    fecha_limite.setDate(fecha_limite.getDate() + tipoTramite.plazo_dias);

    const expediente = await prisma.$transaction(async (tx) => {
      const exp = await tx.expediente.create({
        data: {
          codigo,
          ciudadanoId:   ciudadano.id,
          tipoTramiteId: Number(tipoTramiteId),
          estado:        'PENDIENTE_PAGO',
          fecha_limite,
        },
        select: {
          id: true, codigo: true, estado: true,
          fecha_registro: true, fecha_limite: true,
          tipoTramite: { select: { nombre: true, costo_soles: true, plazo_dias: true } },
        },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     exp.id,
          usuarioId:        1,
          tipo_accion:      'REGISTRO',
          estado_resultado: 'PENDIENTE_PAGO',
          comentario:       `Trámite registrado desde el portal. Tipo: ${tipoTramite.nombre}. Documento: ${tipoDoc} ${numeroDoc}`,
        },
      });

      return exp;
    });

    try {
      await notificarRegistro({
        email:          email.toLowerCase().trim(), 
        nombres:        ciudadano.nombres,
        codigo:         expediente.codigo,
        tipoTramite:    tipoTramite.nombre,
        fecha_registro: expediente.fecha_registro,
        fecha_limite:   expediente.fecha_limite,
        costo_soles:    Number(tipoTramite.costo_soles),
      });
    } catch (e) {
      console.error('Error RF19 al enviar email:', e);
    }

    res.status(201).json({
      message: 'Trámite registrado exitosamente.',
      expediente: {
        ...expediente,
        instrucciones: `Presenta el código ${expediente.codigo} en ventanilla para pagar S/ ${tipoTramite.costo_soles}`,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/portal/documento/:expedienteId/:requisitoId ────
// Ciudadano sube un documento por requisito específico.
export const subirDocumentoPorRequisito = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const expedienteId = Number(req.params['expedienteId']);
    const requisitoId  = Number(req.params['requisitoId']);
    const file         = req.file;

    if (!file)         throw new AppError(400, 'No se recibió ningún archivo.');
    if (!expedienteId) throw new AppError(400, 'ID de expediente inválido.');
    if (!requisitoId)  throw new AppError(400, 'ID de requisito inválido.');

    if (!file.mimetype.startsWith('application/pdf'))
      throw new AppError(400, 'Solo se aceptan archivos PDF.');

    if (file.size > 10 * 1024 * 1024)
      throw new AppError(400, 'El archivo no puede superar los 10MB.');

    // Verificar que el expediente existe y está en estado correcto
    const expediente = await prisma.expediente.findUnique({
      where:  { id: expedienteId },
      select: { id: true, estado: true, tipoTramiteId: true },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    // Verificar que el requisito pertenece al tipo de trámite del expediente
    const requisito = await prisma.requisito.findFirst({
      where: { id: requisitoId, tipo_tramite_id: expediente.tipoTramiteId },
    });

    if (!requisito) throw new AppError(404, 'Requisito no válido para este trámite.');

    // Verificar si ya existe un documento para este requisito en este expediente
    const docExistente = await prisma.documento.findFirst({
      where: { expedienteId, nombre: `REQ-${requisitoId}: ${requisito.nombre}` },
    });

    // Subir archivo a Supabase Storage
    const url = await storageService.subirArchivo(file.buffer, file.mimetype, 'expedientes');

    if (docExistente) {
      // Actualizar documento existente
      await prisma.documento.update({
        where: { id: docExistente.id },
        data:  { url, tipo_mime: file.mimetype },
      });
    } else {
      // Crear nuevo documento vinculado al requisito
      await prisma.documento.create({
        data: {
          expedienteId,
          nombre:    `REQ-${requisitoId}: ${requisito.nombre}`,
          url,
          tipo_mime: file.mimetype,
        },
      });
    }

    res.json({
      message:      `Documento "${requisito.nombre}" subido correctamente.`,
      requisitoId,
      url,
    });
  } catch (err) { next(err); }
};

// ── GET /api/portal/consultar/:codigo ────────────────────────
export const consultarEstado = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const codigo = String(req.params['codigo']).toUpperCase();

    const expediente = await prisma.expediente.findUnique({
      where: { codigo },
      select: {
        id: true, codigo: true, estado: true,
        fecha_registro: true, fecha_limite: true,
        fecha_resolucion: true, url_pdf_firmado: true,
        codigo_verificacion_firma: true,
        ciudadano:   { select: { nombres: true, apellido_pat: true, tipo_documento: true, numero_documento: true } },
        tipoTramite: { select: { nombre: true, plazo_dias: true, costo_soles: true } },
        areaActual:  { select: { nombre: true, sigla: true } },
        pagos: {
          select: {
            id: true, boleta: true, monto_cobrado: true,
            estado: true, fecha_pago: true, url_comprobante: true,
          },
          orderBy: { fecha_pago: 'desc' },
          take: 1,
        },
        documentos: {
          select: { id: true, nombre: true, url: true, uploaded_at: true },
          orderBy: { uploaded_at: 'desc' },
        },
        movimientos: {
          select: {
            tipo_accion: true, estado_resultado: true,
            comentario: true, fecha_hora: true,
            usuario: { select: { nombre_completo: true, rol: { select: { nombre: true } } } },
          },
          orderBy: { fecha_hora: 'asc' },
        },
      },
    });

    if (!expediente) throw new AppError(404, `No se encontró ningún expediente con el código ${codigo}.`);

    const hoy           = new Date();
    const diasRestantes = Math.ceil((expediente.fecha_limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    res.json({ ...expediente, dias_restantes: diasRestantes, vencido: diasRestantes < 0 });
  } catch (err) { next(err); }
};

// ── POST /api/portal/comprobante/:codigo ─────────────────────
export const subirComprobantePago = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const codigo = String(req.params['codigo']).toUpperCase();
    const file   = req.file;

    if (!file) throw new AppError(400, 'No se recibió ningún archivo.');

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!tiposPermitidos.includes(file.mimetype))
      throw new AppError(400, 'Solo se aceptan imágenes (JPG, PNG, WebP) o PDF.');

    if (file.size > 10 * 1024 * 1024)
      throw new AppError(400, 'El archivo no puede superar los 10MB.');

    const expediente = await prisma.expediente.findUnique({
      where:  { codigo },
      select: { id: true, estado: true, tipoTramite: { select: { costo_soles: true } } },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'PENDIENTE_PAGO')
      throw new AppError(400, 'Solo se puede subir comprobante cuando el trámite está en estado PENDIENTE DE PAGO.');

    const comprobanteExistente = await prisma.pago.findFirst({
      where: { expedienteId: expediente.id, estado: 'PENDIENTE' },
    });
    if (comprobanteExistente)
      throw new AppError(400, 'Ya enviaste un comprobante. Espera a que el cajero lo revise.');

    const url = await storageService.subirArchivo(file.buffer, file.mimetype, 'comprobantes');

    const pago = await prisma.pago.create({
      data: {
        expedienteId:    expediente.id,
        cajeroId:        1,
        boleta:          `COMP-${codigo}-${Date.now()}`,
        monto_cobrado:   expediente.tipoTramite.costo_soles,
        estado:          'PENDIENTE',
        url_comprobante: url,
        fecha_pago:      new Date(),
      },
    });

    await prisma.movimiento.create({
      data: {
        expedienteId:     expediente.id,
        usuarioId:        1,
        tipo_accion:      'VERIFICACION_PAGO',
        estado_resultado: 'PENDIENTE_PAGO',
        comentario:       'Ciudadano adjuntó comprobante de pago. En espera de verificación por cajero.',
      },
    });

    res.json({
      message:         'Comprobante enviado exitosamente. El cajero revisará y verificará tu pago pronto.',
      pago_id:         pago.id,
      url_comprobante: url,
    });
  } catch (err) { next(err); }
};

// ── GET /api/portal/verificar/:codigo_verificacion ───────────
export const verificarPdfFirmado = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const codigoVerif = String(req.params['codigo_verificacion']);

    const expediente = await prisma.expediente.findUnique({
      where: { codigo_verificacion_firma: codigoVerif },
      select: {
        codigo: true, estado: true, fecha_firma: true, url_pdf_firmado: true,
        firmadoPor:  { select: { nombre_completo: true } },
        tipoTramite: { select: { nombre: true } },
      },
    });

    if (!expediente) throw new AppError(404, 'Código de verificación inválido.');

    res.json({
      valido:          true,
      mensaje:         'Documento auténtico — firmado digitalmente.',
      codigo:          expediente.codigo,
      tramite:         expediente.tipoTramite.nombre,
      firmado_por:     expediente.firmadoPor?.nombre_completo ?? 'No disponible',
      fecha_firma:     expediente.fecha_firma,
      url_pdf_firmado: expediente.url_pdf_firmado,
    });
  } catch (err) { next(err); }
};