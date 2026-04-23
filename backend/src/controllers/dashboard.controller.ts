// src/controllers/dashboard.controller.ts
// Dashboard con KPIs por rol.

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

// ----------------------------------------------------------------
// GET /api/dashboard
// Devuelve KPIs según el rol del usuario autenticado.
// ----------------------------------------------------------------
export const getDashboard = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rol, areaId } = req.usuario!;
    const hoy    = new Date();
    const inicio = new Date(hoy); inicio.setHours(0, 0, 0, 0);
    const fin    = new Date(hoy); fin.setHours(23, 59, 59, 999);

    if (rol === 'MESA_DE_PARTES' || rol === 'ADMIN') {
      const [
        registradosHoy,
        pendientePago,
        recibidos,
        enRevision,
        derivados,
        observados,
        rechazados,
        vencidos,
        proximosVencer,
        ultimosExpedientes,
      ] = await Promise.all([
        // Registrados hoy
        prisma.expediente.count({
          where: { fecha_registro: { gte: inicio, lte: fin } },
        }),
        // Por estado
        prisma.expediente.count({ where: { estado: 'PENDIENTE_PAGO' } }),
        prisma.expediente.count({ where: { estado: 'RECIBIDO' } }),
        prisma.expediente.count({ where: { estado: 'EN_REVISION_MDP' } }),
        prisma.expediente.count({ where: { estado: 'DERIVADO' } }),
        prisma.expediente.count({ where: { estado: 'OBSERVADO' } }),
        prisma.expediente.count({ where: { estado: 'RECHAZADO' } }),
        // Vencidos (fecha_limite < hoy y no resueltos)
        prisma.expediente.count({
          where: {
            fecha_limite: { lt: hoy },
            estado: { notIn: ['RESUELTO', 'ARCHIVADO', 'RECHAZADO'] },
          },
        }),
        // Próximos a vencer (2 días)
        prisma.expediente.count({
          where: {
            fecha_limite: { gte: hoy, lte: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000) },
            estado: { notIn: ['RESUELTO', 'ARCHIVADO', 'RECHAZADO'] },
          },
        }),
        // Últimos 5 expedientes
        prisma.expediente.findMany({
          take:    5,
          orderBy: { fecha_registro: 'desc' },
          select: {
            id:             true,
            codigo:         true,
            estado:         true,
            fecha_registro: true,
            fecha_limite:   true,
            ciudadano:      { select: { nombres: true, apellido_pat: true } },
            tipoTramite:    { select: { nombre: true } },
          },
        }),
      ]);

      res.json({
        rol,
        kpis: {
          registrados_hoy:   registradosHoy,
          pendiente_pago:    pendientePago,
          recibidos,
          en_revision:       enRevision,
          derivados,
          observados,
          rechazados,
          vencidos,
          proximos_vencer:   proximosVencer,
        },
        ultimos_expedientes: ultimosExpedientes,
      });
      return;
    }

    if (rol === 'CAJERO') {
      const [pagosHoy, montoHoy, pendientes] = await Promise.all([
        prisma.pago.count({
          where: { estado: 'VERIFICADO', fecha_pago: { gte: inicio, lte: fin } },
        }),
        prisma.pago.aggregate({
          where:   { estado: 'VERIFICADO', fecha_pago: { gte: inicio, lte: fin } },
          _sum:    { monto_cobrado: true },
        }),
        prisma.expediente.count({ where: { estado: 'PENDIENTE_PAGO' } }),
      ]);

      res.json({
        rol,
        kpis: {
          pagos_hoy:       pagosHoy,
          monto_hoy:       montoHoy._sum.monto_cobrado ?? 0,
          pendientes_pago: pendientes,
        },
      });
      return;
    }

    if (rol === 'TECNICO' || rol === 'JEFE_AREA') {
      const whereArea = areaId ? { areaActualId: areaId } : {};

      const [enProceso, listoDescarga, observados, total] = await Promise.all([
        prisma.expediente.count({ where: { ...whereArea, estado: 'EN_PROCESO'      } }),
        prisma.expediente.count({ where: { ...whereArea, estado: 'LISTO_DESCARGA'  } }),
        prisma.expediente.count({ where: { ...whereArea, estado: 'OBSERVADO'       } }),
        prisma.expediente.count({ where: { ...whereArea, estado: { in: ['DERIVADO', 'EN_PROCESO', 'LISTO_DESCARGA', 'OBSERVADO'] } } }),
      ]);

      res.json({
        rol,
        kpis: {
          total_en_bandeja: total,
          en_proceso:       enProceso,
          listo_descarga:   listoDescarga,
          observados,
        },
      });
      return;
    }

    res.json({ rol, kpis: {} });
  } catch (err) {
    next(err);
  }
};