// src/controllers/tramites.controller.ts
// CRUD de tipos de trámite y sus requisitos — solo Admin.

import { Request, Response, NextFunction } from 'express';
import { prisma }   from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

// ── GET /api/tramites ────────────────────────────────────────
export const listarTramites = async (
  _req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const tramites = await prisma.tipoTramite.findMany({
      include: {
        requisitos:  { orderBy: { orden: 'asc' } },
        _count:      { select: { expedientes: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    res.json(tramites);
  } catch (err) { next(err); }
};

// ── POST /api/tramites ───────────────────────────────────────
export const crearTramite = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { nombre, descripcion, plazo_dias, costo_soles } = req.body as Record<string, string>;

    if (!nombre?.trim())  throw new AppError(400, 'El nombre es obligatorio.');
    if (!plazo_dias)      throw new AppError(400, 'El plazo en días es obligatorio.');
    if (!costo_soles)     throw new AppError(400, 'El costo es obligatorio.');

    const plazo  = Number(plazo_dias);
    const costo  = Number(costo_soles);
    if (isNaN(plazo) || plazo < 1)   throw new AppError(400, 'El plazo debe ser un número mayor a 0.');
    if (isNaN(costo) || costo < 0)   throw new AppError(400, 'El costo debe ser un número válido.');

    const existe = await prisma.tipoTramite.findUnique({ where: { nombre: nombre.trim() } });
    if (existe) throw new AppError(409, 'Ya existe un trámite con ese nombre.');

    const tramite = await prisma.tipoTramite.create({
      data: {
        nombre:      nombre.trim(),
        descripcion: descripcion?.trim() || null,
        plazo_dias:  plazo,
        costo_soles: costo,
        activo:      true,
      },
      include: { requisitos: true },
    });

    res.status(201).json(tramite);
  } catch (err) { next(err); }
};

// ── PUT /api/tramites/:id ────────────────────────────────────
export const editarTramite = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    const { nombre, descripcion, plazo_dias, costo_soles, activo } = req.body as Record<string, any>;

    const tramite = await prisma.tipoTramite.findUnique({ where: { id } });
    if (!tramite) throw new AppError(404, 'Trámite no encontrado.');

    const actualizado = await prisma.tipoTramite.update({
      where: { id },
      data: {
        ...(nombre      !== undefined && { nombre:      nombre.trim() }),
        ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(plazo_dias  !== undefined && { plazo_dias:  Number(plazo_dias) }),
        ...(costo_soles !== undefined && { costo_soles: Number(costo_soles) }),
        ...(activo      !== undefined && { activo }),
      },
      include: { requisitos: { orderBy: { orden: 'asc' } } },
    });

    res.json(actualizado);
  } catch (err) { next(err); }
};

// ── PATCH /api/tramites/:id/toggle ───────────────────────────
export const toggleTramite = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    const tramite = await prisma.tipoTramite.findUnique({ where: { id } });
    if (!tramite) throw new AppError(404, 'Trámite no encontrado.');

    const actualizado = await prisma.tipoTramite.update({
      where: { id },
      data:  { activo: !tramite.activo },
    });

    res.json({ message: `Trámite ${actualizado.activo ? 'activado' : 'desactivado'}.`, activo: actualizado.activo });
  } catch (err) { next(err); }
};

// ── GET /api/tramites/:id/requisitos ─────────────────────────
export const listarRequisitos = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    const requisitos = await prisma.requisito.findMany({
      where:   { tipo_tramite_id: id },
      orderBy: { orden: 'asc' },
    });
    res.json(requisitos);
  } catch (err) { next(err); }
};

// ── POST /api/tramites/:id/requisitos ────────────────────────
export const crearRequisito = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const tipoTramiteId = Number(req.params['id']);
    const { nombre, descripcion, obligatorio, orden } = req.body as Record<string, any>;

    if (!nombre?.trim()) throw new AppError(400, 'El nombre del requisito es obligatorio.');

    const tramite = await prisma.tipoTramite.findUnique({ where: { id: tipoTramiteId } });
    if (!tramite) throw new AppError(404, 'Trámite no encontrado.');

    // Calcular orden automático si no se proporciona
    let ordenFinal = orden !== undefined ? Number(orden) : 0;
    if (!orden) {
      const ultimo = await prisma.requisito.findFirst({
        where:   { tipo_tramite_id: tipoTramiteId },
        orderBy: { orden: 'desc' },
      });
      ordenFinal = (ultimo?.orden ?? 0) + 1;
    }

    const requisito = await prisma.requisito.create({
      data: {
        tipo_tramite_id: tipoTramiteId,
        nombre:          nombre.trim(),
        descripcion:     descripcion?.trim() || null,
        obligatorio:     obligatorio !== false,
        orden:           ordenFinal,
      },
    });

    res.status(201).json(requisito);
  } catch (err) { next(err); }
};

// ── PUT /api/tramites/requisitos/:reqId ──────────────────────
export const editarRequisito = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const reqId = Number(req.params['reqId']);
    const { nombre, descripcion, obligatorio, orden } = req.body as Record<string, any>;

    const req_ = await prisma.requisito.findUnique({ where: { id: reqId } });
    if (!req_) throw new AppError(404, 'Requisito no encontrado.');

    const actualizado = await prisma.requisito.update({
      where: { id: reqId },
      data: {
        ...(nombre      !== undefined && { nombre:      nombre.trim() }),
        ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(obligatorio !== undefined && { obligatorio }),
        ...(orden       !== undefined && { orden:       Number(orden) }),
      },
    });

    res.json(actualizado);
  } catch (err) { next(err); }
};

// ── DELETE /api/tramites/requisitos/:reqId ───────────────────
export const eliminarRequisito = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const reqId = Number(req.params['reqId']);
    const req_ = await prisma.requisito.findUnique({ where: { id: reqId } });
    if (!req_) throw new AppError(404, 'Requisito no encontrado.');

    await prisma.requisito.delete({ where: { id: reqId } });
    res.json({ message: 'Requisito eliminado correctamente.' });
  } catch (err) { next(err); }
};