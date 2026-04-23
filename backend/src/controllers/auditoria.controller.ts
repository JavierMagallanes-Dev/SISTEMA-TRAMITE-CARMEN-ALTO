// src/controllers/auditoria.controller.ts
// Módulo de Auditoría — solo ADMIN.
// Consulta la tabla auditoria alimentada por triggers PostgreSQL.

import { Request, Response, NextFunction } from 'express';
import { prisma }   from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

// ----------------------------------------------------------------
// GET /api/auditoria
// Lista registros de auditoría con filtros opcionales.
// Query: ?tabla=expedientes&operacion=UPDATE&fecha=2026-04-23&page=1
// ----------------------------------------------------------------
export const listarAuditoria = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tabla, operacion, fecha, page = '1' } = req.query as Record<string, string>;

    const limite  = 50;
    const skip    = (Number(page) - 1) * limite;

    const where: any = {};

    if (tabla)     where.tabla     = tabla;
    if (operacion) where.operacion = operacion;
    if (fecha) {
      where.fecha_hora = {
        gte: new Date(`${fecha}T00:00:00.000Z`),
        lte: new Date(`${fecha}T23:59:59.999Z`),
      };
    }

    const [registros, total] = await Promise.all([
      prisma.auditoria.findMany({
        where,
        orderBy: { fecha_hora: 'desc' },
        take:    limite,
        skip,
      }),
      prisma.auditoria.count({ where }),
    ]);

    res.json({
      total,
      pagina:       Number(page),
      total_paginas: Math.ceil(total / limite),
      registros,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/auditoria/expediente/:id
// Muestra todos los registros de auditoría de un expediente.
// ----------------------------------------------------------------
export const auditoriaExpediente = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);

    // Verificar que el expediente existe
    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { codigo: true, estado: true },
    });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    const registros = await prisma.auditoria.findMany({
      where: {
        tabla:       'expedientes',
        registro_id: id,
      },
      orderBy: { fecha_hora: 'asc' },
    });

    // También traer los movimientos para narrativa legible
    const movimientos = await prisma.movimiento.findMany({
      where: { expedienteId: id },
      include: {
        usuario: { select: { nombre_completo: true, rol: { select: { nombre: true } } } },
      },
      orderBy: { fecha_hora: 'asc' },
    });

    res.json({
      expediente,
      auditoria_bd:  registros,
      bitacora:      movimientos,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/auditoria/resumen
// Resumen general de actividad del sistema para el dashboard Admin.
// ----------------------------------------------------------------
export const resumenAuditoria = async (
  _req: Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hoy    = new Date();
    const inicio = new Date(hoy.setHours(0, 0, 0, 0));
    const fin    = new Date(hoy.setHours(23, 59, 59, 999));

    const [
      totalExpedientesHoy,
      totalPagosHoy,
      expedientesPorEstado,
      ultimosMovimientos,
    ] = await Promise.all([
      // Expedientes registrados hoy
      prisma.expediente.count({
        where: { fecha_registro: { gte: inicio, lte: fin } },
      }),
      // Pagos verificados hoy
      prisma.pago.count({
        where: { estado: 'VERIFICADO', fecha_pago: { gte: inicio, lte: fin } },
      }),
      // Expedientes agrupados por estado
      prisma.expediente.groupBy({
        by:      ['estado'],
        _count:  { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      // Últimos 10 movimientos del sistema
      prisma.movimiento.findMany({
        take:    10,
        orderBy: { fecha_hora: 'desc' },
        select: {
          tipo_accion:      true,
          estado_resultado: true,
          comentario:       true,
          fecha_hora:       true,
          usuario:    { select: { nombre_completo: true } },
          expediente: { select: { codigo: true } },
        },
      }),
    ]);

    res.json({
      hoy: {
        expedientes_registrados: totalExpedientesHoy,
        pagos_verificados:       totalPagosHoy,
      },
      expedientes_por_estado: expedientesPorEstado.map(e => ({
        estado: e.estado,
        total:  e._count.id,
      })),
      ultimos_movimientos: ultimosMovimientos,
    });
  } catch (err) {
    next(err);
  }
};