// src/middlewares/error.middleware.ts
// Captura todos los errores no manejados del sistema.
// Express lo identifica como error handler por tener 4 parámetros.
// Debe registrarse AL FINAL de todos los app.use() en index.ts.

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err:  Error,
  _req: Request,
  res:  Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Error controlado lanzado desde los controladores
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

 if (err.message?.includes('Unique constraint')) {
    res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
    return;
  }

  if (err.message?.includes('Record to update not found')) {
    res.status(404).json({ error: 'Registro no encontrado.' });
    return;
  }

  // Error genérico — en producción no exponemos el detalle
  console.error('❌ Error no controlado:', err);

  res.status(500).json({
    error:   'Error interno del servidor.',
    detalle: env.isDev ? err.message : undefined,
  });
};