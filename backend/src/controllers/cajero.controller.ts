// src/controllers/cajero.controller.ts
// RF20: Notificación al ciudadano cuando el pago es verificado.

import { Request, Response, NextFunction } from 'express';
import { prisma }   from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { notificarCambioEstado } from '../services/email.service';

// ── GET /api/cajero/pendientes ───────────────────────────────
export const listarPendientesPago = async (
  _req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const expedientes = await prisma.expediente.findMany({
      where:   { estado: 'PENDIENTE_PAGO' },
      select: {
        id: true, codigo: true, estado: true,
        fecha_registro: true, fecha_limite: true,
        ciudadano:   { select: { dni: true, nombres: true, apellido_pat: true, apellido_mat: true, email: true, telefono: true } },
        tipoTramite: { select: { nombre: true, costo_soles: true } },
      },
      orderBy: { fecha_registro: 'asc' },
    });
    res.json(expedientes);
  } catch (err) { next(err); }
};

// ── POST /api/cajero/verificar-pago ──────────────────────────
export const verificarPago = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { expedienteId, boleta, monto_cobrado } = req.body;
    const cajeroId = req.usuario!.id;

    if (!expedienteId || !boleta || !monto_cobrado) throw new AppError(400, 'Faltan campos: expedienteId, boleta, monto_cobrado.');
    if (Number(monto_cobrado) <= 0) throw new AppError(400, 'El monto debe ser mayor a 0.');

    const expediente = await prisma.expediente.findUnique({ where: { id: Number(expedienteId) } });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'PENDIENTE_PAGO') throw new AppError(400, `Solo se verifican pagos en PENDIENTE_PAGO. Estado: ${expediente.estado}.`);

    const pagoExistente = await prisma.pago.findFirst({ where: { expedienteId: Number(expedienteId), estado: 'VERIFICADO' } });
    if (pagoExistente) throw new AppError(409, 'Este expediente ya tiene un pago verificado.');

    const resultado = await prisma.$transaction(async (tx) => {
      const pago = await tx.pago.create({
        data: { expedienteId: Number(expedienteId), cajeroId, boleta: boleta.trim(), monto_cobrado: Number(monto_cobrado), estado: 'VERIFICADO' },
      });
      await tx.expediente.update({ where: { id: Number(expedienteId) }, data: { estado: 'RECIBIDO' } });
      await tx.movimiento.create({
        data: { expedienteId: Number(expedienteId), usuarioId: cajeroId, tipo_accion: 'VERIFICACION_PAGO', estado_resultado: 'RECIBIDO', comentario: `Pago verificado. Boleta: ${boleta.trim()} | Monto: S/ ${monto_cobrado}` },
      });
      return pago;
    });

    // RF20 — Notificar al ciudadano que su pago fue recibido
    try {
      const datos = await prisma.expediente.findUnique({
        where: { id: Number(expedienteId) },
        select: { codigo: true, ciudadano: { select: { email: true, nombres: true } }, tipoTramite: { select: { nombre: true } } },
      });
      if (datos) {
        await notificarCambioEstado({
          email:       datos.ciudadano.email,
          nombres:     datos.ciudadano.nombres,
          codigo:      datos.codigo,
          tipoTramite: datos.tipoTramite.nombre,
          estado:      'RECIBIDO',
          comentario:  `Pago verificado correctamente. Boleta N° ${boleta.trim()}.`,
        });
      }
    } catch (e) { console.warn('⚠️ Email RECIBIDO no enviado:', e); }

    res.status(201).json({ message: 'Pago verificado correctamente.', pago: resultado });
  } catch (err) { next(err); }
};

// ── POST /api/cajero/anular-pago ─────────────────────────────
export const anularPago = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { pagoId, motivo } = req.body;
    const cajeroId = req.usuario!.id;

    if (!pagoId || !motivo?.trim()) throw new AppError(400, 'Faltan campos: pagoId, motivo.');

    const pago = await prisma.pago.findUnique({ where: { id: Number(pagoId) } });
    if (!pago) throw new AppError(404, 'Pago no encontrado.');
    if (pago.estado === 'ANULADO') throw new AppError(400, 'Este pago ya está anulado.');

    await prisma.$transaction(async (tx) => {
      await tx.pago.update({ where: { id: Number(pagoId) }, data: { estado: 'ANULADO', motivo_anulacion: motivo.trim() } });
      await tx.expediente.update({ where: { id: pago.expedienteId }, data: { estado: 'PENDIENTE_PAGO' } });
      await tx.movimiento.create({
        data: { expedienteId: pago.expedienteId, usuarioId: cajeroId, tipo_accion: 'ANULACION_PAGO', estado_resultado: 'PENDIENTE_PAGO', comentario: `Pago anulado. Motivo: ${motivo.trim()}` },
      });
    });

    res.json({ message: 'Pago anulado. El expediente volvió a PENDIENTE_PAGO.' });
  } catch (err) { next(err); }
};

// ── GET /api/cajero/historial ────────────────────────────────
export const historialPagos = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { fecha } = req.query;
    const whereDate = fecha ? { fecha_pago: { gte: new Date(`${fecha}T00:00:00.000Z`), lte: new Date(`${fecha}T23:59:59.999Z`) } } : {};

    const pagos = await prisma.pago.findMany({
      where:   { estado: 'VERIFICADO', ...whereDate },
      select: {
        id: true, boleta: true, monto_cobrado: true, estado: true, fecha_pago: true,
        cajero:     { select: { nombre_completo: true } },
        expediente: { select: { codigo: true, tipoTramite: { select: { nombre: true } }, ciudadano: { select: { dni: true, nombres: true, apellido_pat: true } } } },
      },
      orderBy: { fecha_pago: 'desc' },
    });

    const totalMonto = pagos.reduce((sum, p) => sum + Number(p.monto_cobrado), 0);
    res.json({ total_pagos: pagos.length, total_monto: totalMonto, pagos });
  } catch (err) { next(err); }
};

// ── GET /api/cajero/resumen-hoy ──────────────────────────────
export const resumenHoy = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const cajeroId = req.usuario!.id;
    const hoy      = new Date();
    const inicio   = new Date(hoy.setHours(0, 0, 0, 0));
    const fin      = new Date(hoy.setHours(23, 59, 59, 999));

    const pagosHoy = await prisma.pago.findMany({
      where:  { cajeroId, estado: 'VERIFICADO', fecha_pago: { gte: inicio, lte: fin } },
      select: { monto_cobrado: true },
    });

    const totalMonto = pagosHoy.reduce((sum, p) => sum + Number(p.monto_cobrado), 0);
    res.json({ pagos_verificados_hoy: pagosHoy.length, total_recaudado_hoy: totalMonto });
  } catch (err) { next(err); }
};