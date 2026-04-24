// src/controllers/dashboard.controller.ts
// Dashboard con KPIs por rol - Consultas Secuenciales para compatibilidad con PgBouncer.

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

    // ── MESA DE PARTES / ADMIN ───────────────────────────────
    if (rol === 'MESA_DE_PARTES' || rol === 'ADMIN') {
      // Nota: Se ejecutan una tras otra para evitar saturar la conexión única de PgBouncer
      const registradosHoy  = await prisma.expediente.count({ where: { fecha_registro: { gte: inicio, lte: fin } } });
      const pendientePago   = await prisma.expediente.count({ where: { estado: 'PENDIENTE_PAGO' } });
      const recibidos       = await prisma.expediente.count({ where: { estado: 'RECIBIDO' } });
      const enRevision      = await prisma.expediente.count({ where: { estado: 'EN_REVISION_MDP' } });
      const derivados       = await prisma.expediente.count({ where: { estado: 'DERIVADO' } });
      const observados      = await prisma.expediente.count({ where: { estado: 'OBSERVADO' } });
      const rechazados      = await prisma.expediente.count({ where: { estado: 'RECHAZADO' } });
      
      const vencidos = await prisma.expediente.count({
        where: {
          fecha_limite: { lt: hoy },
          estado: { notIn: ['RESUELTO', 'ARCHIVADO', 'RECHAZADO'] },
        },
      });

      const proximosVencer = await prisma.expediente.count({
        where: {
          fecha_limite: { gte: hoy, lte: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000) },
          estado: { notIn: ['RESUELTO', 'ARCHIVADO', 'RECHAZADO'] },
        },
      });

      const ultimosExpedientes = await prisma.expediente.findMany({
        take:    5,
        orderBy: { fecha_registro: 'desc' },
        select: {
          id:             true,
          codigo:          true,
          estado:          true,
          fecha_registro: true,
          fecha_limite:   true,
          ciudadano:   { select: { nombres: true, apellido_pat: true } },
          tipoTramite: { select: { nombre: true } },
        },
      });

      res.json({
        rol,
        kpis: {
          registrados_hoy:  registradosHoy,
          pendiente_pago:   pendientePago,
          recibidos,
          en_revision:      enRevision,
          derivados,
          observados,
          rechazados,
          vencidos,
          proximos_vencer:  proximosVencer,
        },
        ultimos_expedientes: ultimosExpedientes,
      });
      return;
    }

    // ── CAJERO ───────────────────────────────────────────────
    if (rol === 'CAJERO') {
      const pagosHoy   = await prisma.pago.count({ where: { estado: 'VERIFICADO', fecha_pago: { gte: inicio, lte: fin } } });
      
      const montoHoy   = await prisma.pago.aggregate({ 
        where: { estado: 'VERIFICADO', fecha_pago: { gte: inicio, lte: fin } }, 
        _sum: { monto_cobrado: true } 
      });
      
      const pendientes = await prisma.expediente.count({ where: { estado: 'PENDIENTE_PAGO' } });

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

    // ── TÉCNICO / JEFE ───────────────────────────────────────
    if (rol === 'TECNICO' || rol === 'JEFE_AREA') {
      const whereArea = areaId ? { areaActualId: areaId } : {};

      const enProceso      = await prisma.expediente.count({ where: { ...whereArea, estado: 'EN_PROCESO' } });
      const listoDescarga  = await prisma.expediente.count({ where: { ...whereArea, estado: 'LISTO_DESCARGA' } });
      const obsArea        = await prisma.expediente.count({ where: { ...whereArea, estado: 'OBSERVADO' } });
      const total          = await prisma.expediente.count({
        where: { ...whereArea, estado: { in: ['DERIVADO', 'EN_PROCESO', 'LISTO_DESCARGA', 'OBSERVADO'] } },
      });

      res.json({
        rol,
        kpis: { 
          total_en_bandeja: total, 
          en_proceso: enProceso, 
          listo_descarga: listoDescarga, 
          observados: obsArea 
        },
      });
      return;
    }

    // Rol desconocido
    res.json({ rol, kpis: {} });
  } catch (err) {
    next(err);
  }
};