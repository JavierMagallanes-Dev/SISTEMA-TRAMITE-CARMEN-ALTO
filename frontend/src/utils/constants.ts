// src/utils/constants.ts
// Colores y labels para cada estado del expediente.
// Centralizado aquí para que cualquier componente los use igual.

import type { EstadoExpediente } from '../types';

export const ESTADO_CONFIG: Record<
  EstadoExpediente,
  { label: string; color: string; bg: string }
> = {
  PENDIENTE_PAGO:  { label: 'Pendiente de Pago',  color: 'text-yellow-700', bg: 'bg-yellow-100' },
  RECIBIDO:        { label: 'Recibido',            color: 'text-blue-700',   bg: 'bg-blue-100'   },
  EN_REVISION_MDP: { label: 'En Revisión MDP',     color: 'text-purple-700', bg: 'bg-purple-100' },
  DERIVADO:        { label: 'Derivado',            color: 'text-indigo-700', bg: 'bg-indigo-100' },
  EN_PROCESO:      { label: 'En Proceso',          color: 'text-orange-700', bg: 'bg-orange-100' },
  LISTO_DESCARGA:  { label: 'Listo para Firma',   color: 'text-cyan-700',   bg: 'bg-cyan-100'   },
  PDF_FIRMADO:     { label: 'PDF Firmado',         color: 'text-teal-700',   bg: 'bg-teal-100'   },
  RESUELTO:        { label: 'Resuelto',            color: 'text-green-700',  bg: 'bg-green-100'  },
  OBSERVADO:       { label: 'Observado',           color: 'text-red-700',    bg: 'bg-red-100'    },
  RECHAZADO:       { label: 'Rechazado',           color: 'text-red-800',    bg: 'bg-red-200'    },
  ARCHIVADO:       { label: 'Archivado',           color: 'text-gray-700',   bg: 'bg-gray-100'   },
};

export const ROL_LABEL: Record<string, string> = {
  ADMIN:          'Administrador',
  MESA_DE_PARTES: 'Mesa de Partes',
  CAJERO:         'Cajero',
  TECNICO:        'Técnico',
  JEFE_AREA:      'Jefe de Área',
};