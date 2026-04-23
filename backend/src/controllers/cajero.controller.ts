// src/controllers/cajero.controller.ts
// Módulo del Cajero: verificar pagos y consultar historial.
// Accesible por CAJERO y ADMIN.

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

// ----------------------------------------------------------------
// GET /api/cajero/pendientes
// Lista expedientes en estado PENDIENTE_PAGO con el monto a cobrar.
// ----------------------------------------------------------------
export const listarPendientesPago = async (
  _req: Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expedientes = await prisma.expediente.findMany({
      where: { estado: 'PENDIENTE_PAGO' },
      select: {
        id:             true,
        codigo:         true,
        estado:         true,
        fecha_registro: true,
        fecha_limite:   true,
        ciudadano: {
          select: {
            dni:         true,
            nombres:     true,
            apellido_pat: true,
            apellido_mat: true,
            email:       true,
            telefono:    true,
          },
        },
        tipoTramite: {
          select: {
            nombre:      true,
            costo_soles: true,
          },
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
// POST /api/cajero/verificar-pago
// El cajero registra el pago de un expediente.
// Body: { expedienteId, boleta, monto_cobrado }
// Inserta en tabla `pagos` y avanza expediente a RECIBIDO.
// ----------------------------------------------------------------
export const verificarPago = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { expedienteId, boleta, monto_cobrado } = req.body;
    const cajeroId = req.usuario!.id;

    if (!expedienteId || !boleta || !monto_cobrado) {
      throw new AppError(400, 'Faltan campos requeridos: expedienteId, boleta, monto_cobrado.');
    }

    if (Number(monto_cobrado) <= 0) {
      throw new AppError(400, 'El monto debe ser mayor a 0.');
    }

    // Verificar que el expediente existe y está en PENDIENTE_PAGO
    const expediente = await prisma.expediente.findUnique({
      where: { id: Number(expedienteId) },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    if (expediente.estado !== 'PENDIENTE_PAGO') {
      throw new AppError(400, `El expediente está en estado ${expediente.estado}. Solo se pueden verificar pagos de expedientes en PENDIENTE_PAGO.`);
    }

    // Verificar que no tenga ya un pago VERIFICADO
    const pagoExistente = await prisma.pago.findFirst({
      where: { expedienteId: Number(expedienteId), estado: 'VERIFICADO' },
    });
    if (pagoExistente) {
      throw new AppError(409, 'Este expediente ya tiene un pago verificado activo.');
    }

    // Transacción: insertar pago + actualizar expediente + registrar movimiento
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Insertar pago
      const pago = await tx.pago.create({
        data: {
          expedienteId:  Number(expedienteId),
          cajeroId,
          boleta:        boleta.trim(),
          monto_cobrado: Number(monto_cobrado),
          estado:        'VERIFICADO',
        },
      });

      // 2. Avanzar estado del expediente
      await tx.expediente.update({
        where: { id: Number(expedienteId) },
        data:  { estado: 'RECIBIDO' },
      });

      // 3. Registrar movimiento en bitácora
      await tx.movimiento.create({
        data: {
          expedienteId:    Number(expedienteId),
          usuarioId:       cajeroId,
          tipo_accion:     'VERIFICACION_PAGO',
          estado_resultado: 'RECIBIDO',
          comentario:      `Pago verificado. Boleta: ${boleta.trim()} | Monto: S/ ${monto_cobrado}`,
        },
      });

      return pago;
    });

    res.status(201).json({
      message: 'Pago verificado correctamente.',
      pago:    resultado,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// POST /api/cajero/anular-pago
// El cajero anula un pago registrado por error.
// Body: { pagoId, motivo }
// Revierte el expediente a PENDIENTE_PAGO.
// ----------------------------------------------------------------
export const anularPago = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pagoId, motivo } = req.body;
    const cajeroId = req.usuario!.id;

    if (!pagoId || !motivo || motivo.trim() === '') {
      throw new AppError(400, 'Faltan campos requeridos: pagoId, motivo.');
    }

    const pago = await prisma.pago.findUnique({
      where: { id: Number(pagoId) },
    });

    if (!pago) throw new AppError(404, 'Pago no encontrado.');
    if (pago.estado === 'ANULADO') throw new AppError(400, 'Este pago ya está anulado.');

    await prisma.$transaction(async (tx) => {
      // 1. Anular el pago
      await tx.pago.update({
        where: { id: Number(pagoId) },
        data: {
          estado:           'ANULADO',
          motivo_anulacion: motivo.trim(),
        },
      });

      // 2. Revertir expediente a PENDIENTE_PAGO
      await tx.expediente.update({
        where: { id: pago.expedienteId },
        data:  { estado: 'PENDIENTE_PAGO' },
      });

      // 3. Registrar movimiento
      await tx.movimiento.create({
        data: {
          expedienteId:    pago.expedienteId,
          usuarioId:       cajeroId,
          tipo_accion:     'ANULACION_PAGO',
          estado_resultado: 'PENDIENTE_PAGO',
          comentario:      `Pago anulado. Motivo: ${motivo.trim()}`,
        },
      });
    });

    res.json({ message: 'Pago anulado correctamente. El expediente volvió a PENDIENTE_PAGO.' });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/cajero/historial
// Historial de pagos verificados agrupados por fecha.
// Query params: ?fecha=2026-04-23 (opcional, filtra por día)
// ----------------------------------------------------------------
export const historialPagos = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fecha } = req.query;

    // Filtro por fecha si se proporciona
    const whereDate = fecha
      ? {
          fecha_pago: {
            gte: new Date(`${fecha}T00:00:00.000Z`),
            lte: new Date(`${fecha}T23:59:59.999Z`),
          },
        }
      : {};

    const pagos = await prisma.pago.findMany({
      where: {
        estado: 'VERIFICADO',
        ...whereDate,
      },
      select: {
        id:            true,
        boleta:        true,
        monto_cobrado: true,
        estado:        true,
        fecha_pago:    true,
        cajero: {
          select: { nombre_completo: true },
        },
        expediente: {
          select: {
            codigo: true,
            tipoTramite: { select: { nombre: true } },
            ciudadano: {
              select: {
                dni:         true,
                nombres:     true,
                apellido_pat: true,
              },
            },
          },
        },
      },
      orderBy: { fecha_pago: 'desc' },
    });

    // Calcular totales del día
    const totalMonto = pagos.reduce(
      (sum, p) => sum + Number(p.monto_cobrado), 0
    );

    res.json({
      total_pagos:  pagos.length,
      total_monto:  totalMonto,
      pagos,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/cajero/resumen-hoy
// Resumen del día actual para el cajero autenticado.
// ----------------------------------------------------------------
export const resumenHoy = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cajeroId = req.usuario!.id;
    const hoy      = new Date();
    const inicio   = new Date(hoy.setHours(0, 0, 0, 0));
    const fin      = new Date(hoy.setHours(23, 59, 59, 999));

    const pagosHoy = await prisma.pago.findMany({
      where: {
        cajeroId,
        estado:     'VERIFICADO',
        fecha_pago: { gte: inicio, lte: fin },
      },
      select: { monto_cobrado: true },
    });

    const totalMonto = pagosHoy.reduce(
      (sum, p) => sum + Number(p.monto_cobrado), 0
    );

    res.json({
      pagos_verificados_hoy: pagosHoy.length,
      total_recaudado_hoy:   totalMonto,
    });
  } catch (err) {
    next(err);
  }
};