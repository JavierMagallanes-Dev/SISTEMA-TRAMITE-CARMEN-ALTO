// src/controllers/recepcion.controller.ts

import { Request, Response, NextFunction } from 'express';
import { prisma }     from '../config/prisma';
import { pdfService } from '../services/pdf.service';
import { AppError }   from '../middlewares/error.middleware';

const buildDatos = (exp: any) => ({
  codigo:         exp.codigo,
  ciudadano:      {
    nombres:      exp.ciudadano.nombres,
    apellido_pat: exp.ciudadano.apellido_pat,
    apellido_mat: exp.ciudadano.apellido_mat,
    dni:          exp.ciudadano.dni,
  },
  tipoTramite: {
    nombre:      exp.tipoTramite.nombre,
    plazo_dias:  exp.tipoTramite.plazo_dias,
    costo_soles: Number(exp.tipoTramite.costo_soles),
  },
  fecha_registro: exp.fecha_registro,
  fecha_limite:   exp.fecha_limite,
  area:           exp.areaActual?.nombre ?? 'Mesa de Partes',
});

const enviarPdf = async (exp: any, res: Response) => {
  const buffer = await pdfService.generarCargoRecepcion(buildDatos(exp));
  res.writeHead(200, {
    'Content-Type':        'application/pdf',
    'Content-Disposition': `attachment; filename="cargo-${exp.codigo}.pdf"`,
    'Content-Length':      buffer.length,
    'Cache-Control':       'no-cache',
  });
  res.end(buffer, 'binary');
};

// ── Privado: Mesa de Partes por ID ───────────────────────────
export const descargarCargo = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const exp = await prisma.expediente.findUnique({
      where:   { id: Number(req.params.expedienteId) },
      include: { ciudadano: true, tipoTramite: true, areaActual: true },
    });
    if (!exp) throw new AppError(404, 'Expediente no encontrado.');
    await enviarPdf(exp, res);
  } catch (err) { next(err); }
};

// ── Público: ciudadano por código ────────────────────────────
export const descargarCargoPorCodigo = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const exp = await prisma.expediente.findUnique({
      where:   { codigo: String(req.params.codigo).toUpperCase() },
      include: { ciudadano: true, tipoTramite: true, areaActual: true },
    });
    if (!exp) throw new AppError(404, 'Expediente no encontrado.');
    await enviarPdf(exp, res);
  } catch (err) { next(err); }
};