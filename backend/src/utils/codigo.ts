// src/utils/codigo.ts
// Genera el código correlativo EXP-YYYY-NNNNNN.
// Consulta cuántos expedientes existen en el año actual
// y genera el siguiente número en secuencia.

import { prisma } from '../config/prisma';

export const generarCodigoExpediente = async (): Promise<string> => {
  const anio = new Date().getFullYear();

  const total = await prisma.expediente.count({
    where: {
      fecha_registro: {
        gte: new Date(`${anio}-01-01T00:00:00.000Z`),
        lte: new Date(`${anio}-12-31T23:59:59.999Z`),
      },
    },
  });

  const numero = String(total + 1).padStart(6, '0');
  return `EXP-${anio}-${numero}`;
};