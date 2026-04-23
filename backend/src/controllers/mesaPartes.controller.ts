// src/controllers/mesaPartes.controller.ts

import { Request, Response, NextFunction } from 'express';
import { randomBytes }  from 'crypto';
import { prisma }       from '../config/prisma';
import { AppError }     from '../middlewares/error.middleware';
import { generarCodigoExpediente } from '../utils/codigo';
import { consultarReniec }         from '../utils/reniec';

// ----------------------------------------------------------------
// GET /api/mesa-partes/consultar-dni/:dni
// ----------------------------------------------------------------
export const consultarDni = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dni = String(req.params['dni']);

    if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) {
      throw new AppError(400, 'DNI inválido. Debe tener exactamente 8 dígitos.');
    }

    const ciudadanoLocal = await prisma.ciudadano.findUnique({
      where: { dni },
    });

    if (ciudadanoLocal) {
      res.json({ fuente: 'local', ciudadano: ciudadanoLocal });
      return;
    }

    const datosReniec = await consultarReniec(dni);

    if (datosReniec) {
      res.json({ fuente: 'reniec', ciudadano: datosReniec });
      return;
    }

    res.json({ fuente: null, ciudadano: null });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/mesa-partes/tipos-tramite
// ----------------------------------------------------------------
export const listarTiposTramite = async (
  _req: Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tipos = await prisma.tipoTramite.findMany({
      where:   { activo: true },
      orderBy: { nombre: 'asc' },
    });
    res.json(tipos);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/mesa-partes/areas
// ----------------------------------------------------------------
export const listarAreasTecnicas = async (
  _req: Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const areas = await prisma.area.findMany({
      where:   { sigla: { not: 'MDP' } },
      orderBy: { nombre: 'asc' },
    });
    res.json(areas);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// POST /api/mesa-partes/registrar
// ----------------------------------------------------------------
export const registrarExpediente = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      dni, nombres, apellido_pat, apellido_mat,
      email, telefono, tipoTramiteId,
    } = req.body as Record<string, string>;

    const registradoPorId = req.usuario!.id;

    if (!dni || !nombres || !apellido_pat || !email || !tipoTramiteId) {
      throw new AppError(400, 'Faltan campos requeridos: dni, nombres, apellido_pat, email, tipoTramiteId.');
    }

    if (dni.length !== 8 || !/^\d+$/.test(dni)) {
      throw new AppError(400, 'DNI inválido.');
    }

    const tipoTramite = await prisma.tipoTramite.findUnique({
      where: { id: Number(tipoTramiteId) },
    });
    if (!tipoTramite || !tipoTramite.activo) {
      throw new AppError(400, 'Tipo de trámite no válido o inactivo.');
    }

    const ciudadano = await prisma.ciudadano.upsert({
      where: { dni },
      update: {
        nombres:      nombres.trim(),
        apellido_pat: apellido_pat.trim(),
        apellido_mat: (apellido_mat ?? '').trim(),
        email:        email.toLowerCase().trim(),
        ...(telefono && { telefono: telefono.trim() }),
      },
      create: {
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
        data: {
          codigo,
          ciudadanoId:    ciudadano.id,
          tipoTramiteId:  Number(tipoTramiteId),
          estado:         'PENDIENTE_PAGO',
          fecha_limite,
          registradoPorId,
        },
        include: {
          ciudadano:   true,
          tipoTramite: true,
        },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     exp.id,
          usuarioId:        registradoPorId,
          tipo_accion:      'REGISTRO',
          estado_resultado: 'PENDIENTE_PAGO',
          comentario:       `Expediente registrado. Trámite: ${tipoTramite.nombre}`,
        },
      });

      return exp;
    });

    res.status(201).json({
      message: 'Expediente registrado correctamente.',
      expediente,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/mesa-partes/bandeja
// ----------------------------------------------------------------
export const bandejaMDP = async (
  _req: Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expedientes = await prisma.expediente.findMany({
      where: {
        estado: { in: ['RECIBIDO', 'EN_REVISION_MDP'] },
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
          },
        },
        tipoTramite: {
          select: { nombre: true, costo_soles: true },
        },
        pagos: {
          where:  { estado: 'VERIFICADO' },
          select: { boleta: true, monto_cobrado: true, fecha_pago: true },
          take:   1,
        },
      },
      orderBy: { fecha_registro: 'asc' },
    });

    res.json(expedientes);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// POST /api/mesa-partes/derivar
// ----------------------------------------------------------------
export const derivarExpediente = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { expedienteId, areaDestinoId, instrucciones } = req.body as Record<string, string>;
    const usuarioId = req.usuario!.id;

    if (!expedienteId || !areaDestinoId) {
      throw new AppError(400, 'Faltan campos requeridos: expedienteId, areaDestinoId.');
    }

    const expediente = await prisma.expediente.findUnique({
      where:   { id: Number(expedienteId) },
      include: { ciudadano: true, tipoTramite: true },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    if (!['EN_REVISION_MDP', 'RECIBIDO'].includes(expediente.estado)) {
      throw new AppError(400, `No se puede derivar un expediente en estado ${expediente.estado}.`);
    }

    const area = await prisma.area.findUnique({ where: { id: Number(areaDestinoId) } });
    if (!area) throw new AppError(400, 'Área destino no encontrada.');

    const token      = randomBytes(32).toString('hex');
    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + 24);

    await prisma.$transaction(async (tx) => {
      await tx.derivacionPendiente.create({
        data: {
          expedienteId:  Number(expedienteId),
          areaDestinoId: Number(areaDestinoId),
          token,
          instrucciones: instrucciones ? instrucciones.trim() : null,
          estado:        'PENDIENTE',
          expires_at,
        },
      });

      await tx.expediente.update({
        where: { id: Number(expedienteId) },
        data: {
          estado:       'EN_REVISION_MDP',
          areaActualId: Number(areaDestinoId),
        },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     Number(expedienteId),
          usuarioId,
          tipo_accion:      'DERIVACION',
          estado_resultado: 'EN_REVISION_MDP',
          areaDestinoId:    Number(areaDestinoId),
          comentario: instrucciones
            ? `Derivado a ${area.nombre}. Instrucciones: ${instrucciones.trim()}`
            : `Derivado a ${area.nombre}.`,
        },
      });
    });

    res.json({
      message:    `Expediente derivado a ${area.nombre}. Token generado.`,
      token,
      expires_at,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// POST /api/mesa-partes/confirmar-derivacion
// ----------------------------------------------------------------
export const confirmarDerivacion = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body as { token: string };

    if (!token) throw new AppError(400, 'Token requerido.');

    const derivacion = await prisma.derivacionPendiente.findUnique({
      where: { token },
    });

    if (!derivacion)                        throw new AppError(404, 'Token inválido.');
    if (derivacion.estado === 'CONFIRMADO') throw new AppError(400, 'Esta derivación ya fue confirmada.');
    if (derivacion.estado === 'EXPIRADO' || derivacion.expires_at < new Date()) {
      throw new AppError(400, 'El token ha expirado. Solicita una nueva derivación.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.derivacionPendiente.update({
        where: { token },
        data:  { estado: 'CONFIRMADO' },
      });

      await tx.expediente.update({
        where: { id: derivacion.expedienteId },
        data:  { estado: 'DERIVADO' },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     derivacion.expedienteId,
          usuarioId:        req.usuario!.id,
          tipo_accion:      'DERIVACION',
          estado_resultado: 'DERIVADO',
          areaDestinoId:    derivacion.areaDestinoId,
          comentario:       'Derivación confirmada por token.',
        },
      });
    });

    res.json({ message: 'Derivación confirmada. El expediente avanzó a DERIVADO.' });
  } catch (err) {
    next(err);
  }
};