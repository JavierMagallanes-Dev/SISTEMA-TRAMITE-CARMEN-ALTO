// src/controllers/portal.controller.ts
// Portal público para el ciudadano — sin autenticación.
// RF19: Notificación al registrar trámite desde el portal.

import { Request, Response, NextFunction } from 'express';
import { prisma }   from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { generarCodigoExpediente } from '../utils/codigo';
import { consultarReniec }         from '../utils/reniec';
import { notificarRegistro }       from '../services/email.service';

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

// ── GET /api/portal/consultar-dni/:dni ───────────────────────
export const consultarDniPublico = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const dni = String(req.params['dni']);
    if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) throw new AppError(400, 'DNI inválido.');

    const ciudadanoLocal = await prisma.ciudadano.findUnique({
      where:  { dni },
      select: { nombres: true, apellido_pat: true, apellido_mat: true, email: true, telefono: true },
    });
    if (ciudadanoLocal) { res.json({ fuente: 'local', datos: ciudadanoLocal }); return; }

    const datosReniec = await consultarReniec(dni);
    if (datosReniec) { res.json({ fuente: 'reniec', datos: datosReniec }); return; }

    res.json({ fuente: null, datos: null });
  } catch (err) { next(err); }
};

// ── POST /api/portal/registrar ───────────────────────────────
// RF19: Envía email al ciudadano al registrar desde el portal
export const registrarTramitePublico = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { dni, nombres, apellido_pat, apellido_mat, email, telefono, tipoTramiteId } = req.body as Record<string, string>;

    if (!dni || !nombres || !apellido_pat || !email || !tipoTramiteId) {
      throw new AppError(400, 'Faltan campos requeridos: dni, nombres, apellido_pat, email, tipoTramiteId.');
    }
    if (dni.length !== 8 || !/^\d+$/.test(dni)) throw new AppError(400, 'DNI inválido.');

    const tipoTramite = await prisma.tipoTramite.findUnique({ where: { id: Number(tipoTramiteId) } });
    if (!tipoTramite || !tipoTramite.activo) throw new AppError(400, 'Tipo de trámite no válido o inactivo.');

    const ciudadano = await prisma.ciudadano.upsert({
      where:  { dni },
      update: { nombres: nombres.trim(), apellido_pat: apellido_pat.trim(), apellido_mat: (apellido_mat ?? '').trim(), email: email.toLowerCase().trim(), ...(telefono && { telefono: telefono.trim() }) },
      create: { dni, nombres: nombres.trim(), apellido_pat: apellido_pat.trim(), apellido_mat: (apellido_mat ?? '').trim(), email: email.toLowerCase().trim(), telefono: telefono ? telefono.trim() : null },
    });

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
          comentario:       `Trámite registrado por el ciudadano desde el portal público. Tipo: ${tipoTramite.nombre}`,
        },
      });

      return exp;
    });

    // RF19 — Notificar al ciudadano
    console.log('📧 Enviando email de registro al ciudadano:', ciudadano.email);
    try {
      await notificarRegistro({
        email:          ciudadano.email,
        nombres:        ciudadano.nombres,
        codigo:         expediente.codigo,
        tipoTramite:    tipoTramite.nombre,
        fecha_registro: expediente.fecha_registro,
        fecha_limite:   expediente.fecha_limite,
        costo_soles:    Number(tipoTramite.costo_soles),
      });
      console.log('✅ Email RF19 enviado correctamente a:', ciudadano.email);
    } catch (e) {
      console.error('❌ Error RF19 al enviar email:', e);
    }

    res.status(201).json({
      message: 'Trámite registrado exitosamente. Acércate a la municipalidad para realizar el pago.',
      expediente: {
        ...expediente,
        instrucciones: `Presenta el código ${expediente.codigo} en ventanilla para pagar S/ ${tipoTramite.costo_soles}`,
      },
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
        ciudadano:  { select: { nombres: true, apellido_pat: true } },
        tipoTramite: { select: { nombre: true, plazo_dias: true } },
        areaActual:  { select: { nombre: true, sigla: true } },
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
      mensaje:         'Documento auténtico — firmado digitalmente con FirmaPeru.',
      codigo:          expediente.codigo,
      tramite:         expediente.tipoTramite.nombre,
      firmado_por:     expediente.firmadoPor?.nombre_completo ?? 'No disponible',
      fecha_firma:     expediente.fecha_firma,
      url_pdf_firmado: expediente.url_pdf_firmado,
    });
  } catch (err) { next(err); }
};