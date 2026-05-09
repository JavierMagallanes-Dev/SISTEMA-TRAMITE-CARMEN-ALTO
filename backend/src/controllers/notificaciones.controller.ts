// src/controllers/notificaciones.controller.ts

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

// ── GET /api/notificaciones ──────────────────────────────────
// Devuelve las últimas 20 notificaciones del usuario logueado
export const getNotificaciones = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const usuarioId = req.usuario!.id;

    const notificaciones = await prisma.notificacion.findMany({
      where:   { usuarioId },
      orderBy: { created_at: 'desc' },
      take:    20,
      select: {
        id: true, titulo: true, mensaje: true,
        leida: true, created_at: true,
        expediente: { select: { codigo: true } },
      },
    });

    const noLeidas = notificaciones.filter(n => !n.leida).length;

    res.json({ notificaciones, noLeidas });
  } catch (err) { next(err); }
};

// ── PATCH /api/notificaciones/:id/leer ──────────────────────
export const marcarLeida = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id        = Number(req.params['id']);
    const usuarioId = req.usuario!.id;

    await prisma.notificacion.updateMany({
      where: { id, usuarioId },
      data:  { leida: true },
    });

    res.json({ message: 'Notificación marcada como leída.' });
  } catch (err) { next(err); }
};

// ── PATCH /api/notificaciones/leer-todas ────────────────────
export const marcarTodasLeidas = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const usuarioId = req.usuario!.id;

    await prisma.notificacion.updateMany({
      where: { usuarioId, leida: false },
      data:  { leida: true },
    });

    res.json({ message: 'Todas las notificaciones marcadas como leídas.' });
  } catch (err) { next(err); }
};

// ── Helper: crear notificación interna ──────────────────────
// Llámalo desde cualquier controller sin await para no bloquear el flujo
export const crearNotificacion = (
  usuarioId:    number,
  titulo:       string,
  mensaje:      string,
  expedienteId?: number,
) => {
  prisma.notificacion.create({
    data: { usuarioId, titulo, mensaje, expedienteId: expedienteId ?? null },
  }).catch((e) => console.warn('⚠️ Notificación interna no guardada:', e));
};