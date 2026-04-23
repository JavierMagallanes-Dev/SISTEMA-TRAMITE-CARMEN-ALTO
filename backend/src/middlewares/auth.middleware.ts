// src/middlewares/auth.middleware.ts
// Verifica que el request tenga un token JWT válido.
// Si es válido, adjunta los datos del usuario a req.usuario
// para que los controladores puedan usarlos sin consultar la BD.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface JwtPayload {
  id:     number;
  email:  string;
  rol:    string;
  areaId: number | null;
}

export const autenticar = (
  req:  Request,
  res:  Response,
  next: NextFunction
): void => {
  // El token viene en el header: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token no proporcionado.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.usuario = {
      id:     payload.id,
      email:  payload.email,
      rol:    payload.rol as any,
      areaId: payload.areaId,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};