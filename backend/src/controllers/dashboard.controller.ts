// src/controllers/dashboard.controller.ts
// Dashboard con KPIs por rol - Queries en PARALELO con Promise.all.

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

// ── Helper: crear notificaciones de vencimiento ──────────────
// Se llama al cargar el dashboard de MDP/ADMIN.
// Crea notificaciones en la campana para expedientes vencidos
// y por vencer — sin duplicar si ya existe una hoy.
const notificarVencimientos = async () => {
  try {
    const hoy     = new Date();
    const en2Dias = new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000);
    const estadosActivos = [
      'PENDIENTE_PAGO', 'RECIBIDO', 'EN_REVISION_MDP',
      'DERIVADO', 'EN_PROCESO', 'OBSERVADO',
    ];

    const [vencidos, porVencer, usuariosMDP] = await Promise.all([
      prisma.expediente.findMany({
        where: { fecha_limite: { lt: hoy }, estado: { in: estadosActivos as any[] } },
        select: { id: true, codigo: true, tipoTramite: { select: { nombre: true } } },
      }),
      prisma.expediente.findMany({
        where: { fecha_limite: { gte: hoy, lte: en2Dias }, estado: { in: estadosActivos as any[] } },
        select: { id: true, codigo: true, fecha_limite: true, tipoTramite: { select: { nombre: true } } },
      }),
      prisma.usuario.findMany({
        where: { activo: true, rol: { nombre: { in: ['MESA_DE_PARTES', 'ADMIN'] } } },
        select: { id: true },
      }),
    ]);

    if (usuariosMDP.length === 0) return;

    const inicioHoy = new Date(hoy); inicioHoy.setHours(0, 0, 0, 0);
    const finHoy    = new Date(hoy); finHoy.setHours(23, 59, 59, 999);

    // Vencidos
    for (const exp of vencidos) {
      const titulo = `⚠ Expediente vencido: ${exp.codigo}`;
      const yaExiste = await prisma.notificacion.findFirst({
        where: { titulo, expedienteId: exp.id, created_at: { gte: inicioHoy, lte: finHoy } },
      });
      if (!yaExiste) {
        usuariosMDP.forEach(u => {
          prisma.notificacion.create({
            data: {
              usuarioId:    u.id,
              expedienteId: exp.id,
              titulo,
              mensaje: `El expediente ${exp.codigo} — ${exp.tipoTramite.nombre} ha vencido. Requiere atención inmediata.`,
            },
          }).catch(() => {});
        });
      }
    }

    // Por vencer
    for (const exp of porVencer) {
      const diasRestantes = Math.ceil(
        (new Date(exp.fecha_limite).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      );
      const titulo = `🕐 Por vencer en ${diasRestantes}d: ${exp.codigo}`;
      const yaExiste = await prisma.notificacion.findFirst({
        where: { titulo, expedienteId: exp.id, created_at: { gte: inicioHoy, lte: finHoy } },
      });
      if (!yaExiste) {
        usuariosMDP.forEach(u => {
          prisma.notificacion.create({
            data: {
              usuarioId:    u.id,
              expedienteId: exp.id,
              titulo,
              mensaje: `El expediente ${exp.codigo} — ${exp.tipoTramite.nombre} vence en ${diasRestantes} día(s). Atiéndelo antes de que venza.`,
            },
          }).catch(() => {});
        });
      }
    }
  } catch (e) {
    console.warn('⚠️ notificarVencimientos:', e);
  }
};

// ── GET /api/dashboard ───────────────────────────────────────
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

      const [
        registradosHoy, pendientePago, recibidos, enRevision,
        derivados, observados, rechazados, enProceso, resueltos,
        vencidos, proximosVencer, ultimosExpedientes, tendenciaRaw,
      ] = await Promise.all([
        prisma.expediente.count({ where: { fecha_registro: { gte: inicio, lte: fin } } }),
        prisma.expediente.count({ where: { estado: 'PENDIENTE_PAGO' } }),
        prisma.expediente.count({ where: { estado: 'RECIBIDO' } }),
        prisma.expediente.count({ where: { estado: 'EN_REVISION_MDP' } }),
        prisma.expediente.count({ where: { estado: 'DERIVADO' } }),
        prisma.expediente.count({ where: { estado: 'OBSERVADO' } }),
        prisma.expediente.count({ where: { estado: 'RECHAZADO' } }),
        prisma.expediente.count({ where: { estado: 'EN_PROCESO' } }),
        prisma.expediente.count({ where: { estado: 'RESUELTO' } }),
        prisma.expediente.count({
          where: { fecha_limite: { lt: hoy }, estado: { notIn: ['RESUELTO', 'ARCHIVADO', 'RECHAZADO'] } },
        }),
        prisma.expediente.count({
          where: {
            fecha_limite: { gte: hoy, lte: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000) },
            estado:       { notIn: ['RESUELTO', 'ARCHIVADO', 'RECHAZADO'] },
          },
        }),
        prisma.expediente.findMany({
          take: 5, orderBy: { fecha_registro: 'desc' },
          select: {
            id: true, codigo: true, estado: true,
            fecha_registro: true, fecha_limite: true,
            ciudadano:   { select: { nombres: true, apellido_pat: true } },
            tipoTramite: { select: { nombre: true } },
          },
        }),
        Promise.all(
          Array.from({ length: 7 }, (_, i) => {
            const dia       = new Date();
            dia.setDate(dia.getDate() - (6 - i));
            const diaInicio = new Date(dia); diaInicio.setHours(0, 0, 0, 0);
            const diaFin    = new Date(dia); diaFin.setHours(23, 59, 59, 999);
            return Promise.all([
              prisma.expediente.count({ where: { fecha_registro:   { gte: diaInicio, lte: diaFin } } }),
              prisma.expediente.count({ where: { fecha_resolucion: { gte: diaInicio, lte: diaFin } } }),
              dia,
            ]);
          })
        ),
      ]);

      const tendencia_7d = (tendenciaRaw as [number, number, Date][]).map(
        ([registradosDia, resueltosDia, dia]) => ({
          fecha:       dia.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit' }),
          registrados: registradosDia,
          resueltos:   resueltosDia,
        })
      );

      const por_estado = [
        { estado: 'PENDIENTE_PAGO',  cantidad: pendientePago },
        { estado: 'RECIBIDO',        cantidad: recibidos     },
        { estado: 'EN_REVISION_MDP', cantidad: enRevision    },
        { estado: 'DERIVADO',        cantidad: derivados     },
        { estado: 'EN_PROCESO',      cantidad: enProceso     },
        { estado: 'OBSERVADO',       cantidad: observados    },
        { estado: 'RECHAZADO',       cantidad: rechazados    },
        { estado: 'RESUELTO',        cantidad: resueltos     },
      ];

      // Disparar notificaciones de vencimiento sin bloquear la respuesta
      notificarVencimientos().catch(() => {});

      res.json({
        rol,
        kpis: {
          registrados_hoy: registradosHoy,
          pendiente_pago:  pendientePago,
          recibidos,
          en_revision:     enRevision,
          derivados,
          observados,
          rechazados,
          vencidos,
          proximos_vencer: proximosVencer,
        },
        ultimos_expedientes: ultimosExpedientes,
        por_estado,
        tendencia_7d,
      });
      return;
    }

    // ── CAJERO ───────────────────────────────────────────────
    if (rol === 'CAJERO') {
      const [pagosHoy, montoHoy, pendientes] = await Promise.all([
        prisma.pago.count({ where: { estado: 'VERIFICADO', fecha_pago: { gte: inicio, lte: fin } } }),
        prisma.pago.aggregate({
          where: { estado: 'VERIFICADO', fecha_pago: { gte: inicio, lte: fin } },
          _sum:  { monto_cobrado: true },
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

    // ── TÉCNICO / JEFE ───────────────────────────────────────
    if (rol === 'TECNICO' || rol === 'JEFE_AREA') {
      const whereArea = areaId ? { areaActualId: areaId } : {};

      const [enProceso, listoDescarga, obsArea, total] = await Promise.all([
        prisma.expediente.count({ where: { ...whereArea, estado: 'EN_PROCESO' } }),
        prisma.expediente.count({ where: { ...whereArea, estado: 'LISTO_DESCARGA' } }),
        prisma.expediente.count({ where: { ...whereArea, estado: 'OBSERVADO' } }),
        prisma.expediente.count({
          where: { ...whereArea, estado: { in: ['DERIVADO', 'EN_PROCESO', 'LISTO_DESCARGA', 'OBSERVADO'] } },
        }),
      ]);

      res.json({
        rol,
        kpis: {
          total_en_bandeja: total,
          en_proceso:       enProceso,
          listo_descarga:   listoDescarga,
          observados:       obsArea,
        },
      });
      return;
    }

    res.json({ rol, kpis: {} });
  } catch (err) {
    next(err);
  }
};