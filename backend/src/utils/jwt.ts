// src/utils/jwt.ts
// Funciones para generar y verificar tokens JWT.

import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { NombreRol } from '@prisma/client';

interface JwtPayload {
  id:     number;
  email:  string;
  rol:    NombreRol;
  areaId: number | null;
}

export const generarToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verificarToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};