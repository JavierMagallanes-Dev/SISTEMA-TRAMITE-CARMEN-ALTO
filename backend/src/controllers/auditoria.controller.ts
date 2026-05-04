// src/controllers/auditoria.controller.ts
// Módulo de Auditoría — solo ADMIN.

import { Request, Response, NextFunction } from 'express';
import { prisma }   from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

// ── GET /api/auditoria ───────────────────────────────────────
export const listarAuditoria = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { tabla, operacion, fecha, page = '1' } = req.query as Record<string, string>;
    const limite = 50;
    const skip   = (Number(page) - 1) * limite;
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
      prisma.auditoria.findMany({ where, orderBy: { fecha_hora: 'desc' }, take: limite, skip }),
      prisma.auditoria.count({ where }),
    ]);
    res.json({ total, pagina: Number(page), total_paginas: Math.ceil(total / limite), registros });
  } catch (err) { next(err); }
};

// ── GET /api/auditoria/expediente/:id ────────────────────────
export const auditoriaExpediente = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    const expediente = await prisma.expediente.findUnique({
      where:  { id },
      select: { codigo: true, estado: true },
    });
    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    const [registros, movimientos] = await Promise.all([
      prisma.auditoria.findMany({
        where: { tabla: 'expedientes', registro_id: id },
        orderBy: { fecha_hora: 'asc' },
      }),
      prisma.movimiento.findMany({
        where: { expedienteId: id },
        include: { usuario: { select: { nombre_completo: true, rol: { select: { nombre: true } } } } },
        orderBy: { fecha_hora: 'asc' },
      }),
    ]);

    res.json({ expediente, auditoria_bd: registros, bitacora: movimientos });
  } catch (err) { next(err); }
};

// ── GET /api/auditoria/expedientes ───────────────────────────
// Lista todos los expedientes con su historial de movimientos resumido.
export const listarExpedientesAuditoria = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { codigo, estado, fecha_inicio, fecha_fin, page = '1' } = req.query as Record<string, string>;
    const limite = 20;
    const skip   = (Number(page) - 1) * limite;

    const where: any = {};
    if (codigo)       where.codigo = { contains: codigo.toUpperCase() };
    if (estado)       where.estado = estado;
    if (fecha_inicio || fecha_fin) {
      where.fecha_registro = {
        ...(fecha_inicio && { gte: new Date(`${fecha_inicio}T00:00:00.000Z`) }),
        ...(fecha_fin    && { lte: new Date(`${fecha_fin}T23:59:59.999Z`) }),
      };
    }

    const [expedientes, total] = await Promise.all([
      prisma.expediente.findMany({
        where,
        orderBy: { fecha_registro: 'desc' },
        take:    limite,
        skip,
        select: {
          id:               true,
          codigo:           true,
          estado:           true,
          fecha_registro:   true,
          fecha_limite:     true,
          fecha_resolucion: true,
          ciudadano:    { select: { nombres: true, apellido_pat: true, dni: true } },
          tipoTramite:  { select: { nombre: true } },
          areaActual:   { select: { nombre: true, sigla: true } },
          registradoPor:{ select: { nombre_completo: true } },
          firmadoPor:   { select: { nombre_completo: true } },
          movimientos: {
            orderBy: { fecha_hora: 'asc' },
            select: {
              id:               true,
              tipo_accion:      true,
              estado_resultado: true,
              comentario:       true,
              fecha_hora:       true,
              usuario:     { select: { nombre_completo: true, rol: { select: { nombre: true } } } },
              areaOrigen:  { select: { nombre: true, sigla: true } },
              areaDestino: { select: { nombre: true, sigla: true } },
            },
          },
          pagos: {
            where:  { estado: 'VERIFICADO' },
            select: { boleta: true, monto_cobrado: true, fecha_pago: true },
            take: 1,
          },
        },
      }),
      prisma.expediente.count({ where }),
    ]);

    res.json({ total, pagina: Number(page), total_paginas: Math.ceil(total / limite), expedientes });
  } catch (err) { next(err); }
};

// ── GET /api/auditoria/resumen ───────────────────────────────
export const resumenAuditoria = async (
  _req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const hoy    = new Date();
    const inicio = new Date(hoy); inicio.setHours(0, 0, 0, 0);
    const fin    = new Date(hoy); fin.setHours(23, 59, 59, 999);

    const [
      totalExpedientesHoy,
      totalPagosHoy,
      expedientesPorEstado,
      ultimosMovimientos,
      totalExpedientes,
      expedientesResueltos,
    ] = await Promise.all([
      prisma.expediente.count({ where: { fecha_registro: { gte: inicio, lte: fin } } }),
      prisma.pago.count({ where: { estado: 'VERIFICADO', fecha_pago: { gte: inicio, lte: fin } } }),
      prisma.expediente.groupBy({ by: ['estado'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      prisma.movimiento.findMany({
        take: 15, orderBy: { fecha_hora: 'desc' },
        select: {
          tipo_accion: true, estado_resultado: true, comentario: true, fecha_hora: true,
          usuario:    { select: { nombre_completo: true, rol: { select: { nombre: true } } } },
          expediente: { select: { codigo: true, tipoTramite: { select: { nombre: true } } } },
          areaDestino: { select: { nombre: true } },
        },
      }),
      prisma.expediente.count(),
      prisma.expediente.count({ where: { estado: { in: ['RESUELTO', 'ARCHIVADO'] } } }),
    ]);

    res.json({
      hoy: { expedientes_registrados: totalExpedientesHoy, pagos_verificados: totalPagosHoy },
      totales: { total: totalExpedientes, resueltos: expedientesResueltos },
      expedientes_por_estado: expedientesPorEstado.map(e => ({ estado: e.estado, total: e._count.id })),
      ultimos_movimientos: ultimosMovimientos,
    });
  } catch (err) { next(err); }
};