// src/types/express.d.ts
// Extiende el tipo Request de Express para incluir el usuario
// autenticado después de pasar por el middleware de autenticación.

import { NombreRol } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id:     number;
        email:  string;
        rol:    NombreRol;
        areaId: number | null;
      };
    }
  }
}

export {};