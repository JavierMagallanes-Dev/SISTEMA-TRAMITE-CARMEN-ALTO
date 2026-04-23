// src/controllers/portal.controller.ts
// Portal público para el ciudadano — sin autenticación.
// Permite: registrar trámite, consultar estado, descargar PDF firmado.

import { Request, Response, NextFunction } from 'express';
import { prisma }   from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { generarCodigoExpediente } from '../utils/codigo';
import { consultarReniec }         from '../utils/reniec';

// ----------------------------------------------------------------
// GET /api/portal/tipos-tramite
// Lista tipos de trámite activos para el formulario público.
// ----------------------------------------------------------------
export const listarTiposTramitePublico = async (
  _req: Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tipos = await prisma.tipoTramite.findMany({
      where:   { activo: true },
      select: {
        id:          true,
        nombre:      true,
        descripcion: true,
        plazo_dias:  true,
        costo_soles: true,
      },
      orderBy: { nombre: 'asc' },
    });
    res.json(tipos);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/portal/consultar-dni/:dni
// Consulta DNI en RENIEC para autocompletar el formulario.
// ----------------------------------------------------------------
export const consultarDniPublico = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dni = String(req.params['dni']);

    if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) {
      throw new AppError(400, 'DNI inválido. Debe tener exactamente 8 dígitos.');
    }

    // Buscar primero en BD local
    const ciudadanoLocal = await prisma.ciudadano.findUnique({
      where:  { dni },
      select: {
        nombres:      true,
        apellido_pat: true,
        apellido_mat: true,
        email:        true,
        telefono:     true,
      },
    });

    if (ciudadanoLocal) {
      res.json({ fuente: 'local', datos: ciudadanoLocal });
      return;
    }

    // Consultar RENIEC
    const datosReniec = await consultarReniec(dni);
    if (datosReniec) {
      res.json({ fuente: 'reniec', datos: datosReniec });
      return;
    }

    res.json({ fuente: null, datos: null });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// POST /api/portal/registrar
// El ciudadano registra su trámite desde el portal público.
// Body: { dni, nombres, apellido_pat, apellido_mat, email,
//         telefono?, tipoTramiteId }
// ----------------------------------------------------------------
export const registrarTramitePublico = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      dni, nombres, apellido_pat, apellido_mat,
      email, telefono, tipoTramiteId,
    } = req.body as Record<string, string>;

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

    // Crear o actualizar ciudadano
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
          ciudadanoId:   ciudadano.id,
          tipoTramiteId: Number(tipoTramiteId),
          estado:        'PENDIENTE_PAGO',
          fecha_limite,
        },
        select: {
          id:             true,
          codigo:         true,
          estado:         true,
          fecha_registro: true,
          fecha_limite:   true,
          tipoTramite: {
            select: { nombre: true, costo_soles: true, plazo_dias: true },
          },
        },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     exp.id,
          // Sin usuarioId — el ciudadano no tiene cuenta
          // Usamos el id del primer usuario admin como referencia del sistema
          usuarioId:        1,
          tipo_accion:      'REGISTRO',
          estado_resultado: 'PENDIENTE_PAGO',
          comentario:       `Trámite registrado por el ciudadano desde el portal público. Tipo: ${tipoTramite.nombre}`,
        },
      });

      return exp;
    });

    res.status(201).json({
      message: 'Trámite registrado exitosamente. Acércate a la municipalidad para realizar el pago.',
      expediente: {
        ...expediente,
        instrucciones: `Presenta el código ${expediente.codigo} en ventanilla para pagar S/ ${tipoTramite.costo_soles}`,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/portal/consultar/:codigo
// El ciudadano consulta el estado de su expediente por código.
// Devuelve la línea de tiempo de movimientos sin datos sensibles.
// ----------------------------------------------------------------
export const consultarEstado = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const codigo = String(req.params['codigo']).toUpperCase();

    const expediente = await prisma.expediente.findUnique({
      where: { codigo },
      select: {
        id:                       true,
        codigo:                   true,
        estado:                   true,
        fecha_registro:           true,
        fecha_limite:             true,
        fecha_resolucion:         true,
        url_pdf_firmado:          true,
        codigo_verificacion_firma: true,
        ciudadano: {
          select: {
            nombres:      true,
            apellido_pat: true,
            // No exponer DNI completo ni email en consulta pública
          },
        },
        tipoTramite: {
          select: { nombre: true, plazo_dias: true },
        },
        areaActual: {
          select: { nombre: true, sigla: true },
        },
        movimientos: {
          select: {
            tipo_accion:      true,
            estado_resultado: true,
            comentario:       true,
            fecha_hora:       true,
            usuario: {
              select: {
                nombre_completo: true,
                rol: { select: { nombre: true } },
              },
            },
          },
          orderBy: { fecha_hora: 'asc' },
        },
      },
    });

    if (!expediente) {
      throw new AppError(404, `No se encontró ningún expediente con el código ${codigo}.`);
    }

    // Calcular días restantes
    const hoy           = new Date();
    const diasRestantes = Math.ceil(
      (expediente.fecha_limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      ...expediente,
      dias_restantes: diasRestantes,
      vencido:        diasRestantes < 0,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/portal/verificar/:codigo_verificacion
// Verifica la autenticidad de un PDF firmado por su código único.
// ----------------------------------------------------------------
export const verificarPdfFirmado = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const codigoVerif = String(req.params['codigo_verificacion']);

    const expediente = await prisma.expediente.findUnique({
      where: { codigo_verificacion_firma: codigoVerif },
      select: {
        codigo:          true,
        estado:          true,
        fecha_firma:     true,
        url_pdf_firmado: true,
        firmadoPor: {
          select: { nombre_completo: true },
        },
        tipoTramite: {
          select: { nombre: true },
        },
      },
    });

    if (!expediente) {
      throw new AppError(404, 'Código de verificación inválido. El documento no es auténtico.');
    }

    res.json({
      valido:          true,
      mensaje:         'Documento auténtico — firmado digitalmente con FirmaPeru.',
      codigo:          expediente.codigo,
      tramite:         expediente.tipoTramite.nombre,
      firmado_por:     expediente.firmadoPor?.nombre_completo ?? 'No disponible',
      fecha_firma:     expediente.fecha_firma,
      url_pdf_firmado: expediente.url_pdf_firmado,
    });
  } catch (err) {
    next(err);
  }
};