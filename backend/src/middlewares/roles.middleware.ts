// src/middlewares/roles.middleware.ts
// Verifica que el usuario autenticado tenga uno de los roles
// permitidos para acceder a la ruta.
// Siempre debe usarse DESPUÉS de autenticar.
//
// Uso en rutas:
//   router.post('/derivar', autenticar, autorizar('MESA_DE_PARTES', 'ADMIN'), ...)
//   router.get('/reportes', autenticar, autorizar('ADMIN', 'JEFE_AREA'), ...)

import { Request, Response, NextFunction } from 'express';
import { NombreRol } from '@prisma/client';

export const autorizar = (...rolesPermitidos: NombreRol[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ error: 'No autenticado.' });
      return;
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      res.status(403).json({
        error: 'No tienes permiso para realizar esta acción.',
        tu_rol:          req.usuario.rol,
        roles_requeridos: rolesPermitidos,
      });
      return;
    }

    next();
  };
};