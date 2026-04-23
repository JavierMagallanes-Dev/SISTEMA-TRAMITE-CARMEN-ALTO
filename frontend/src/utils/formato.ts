// src/utils/formato.ts
// Funciones puras de formateo reutilizables en toda la app.

export const formatFecha = (fecha: string | Date): string => {
  return new Date(fecha).toLocaleDateString('es-PE', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
};

export const formatFechaHora = (fecha: string | Date): string => {
  return new Date(fecha).toLocaleString('es-PE', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
};

export const formatMoneda = (monto: number | string): string => {
  return `S/ ${Number(monto).toFixed(2)}`;
};

export const formatNombreCompleto = (
  nombres:     string,
  apellidoPat: string,
  apellidoMat: string
): string => {
  return `${apellidoPat} ${apellidoMat}, ${nombres}`.trim();
};

export const diasRestantes = (fechaLimite: string | Date): number => {
  const hoy   = new Date();
  const limit = new Date(fechaLimite);
  return Math.ceil((limit.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
};

export const colorDiasRestantes = (dias: number): string => {
  if (dias < 0)  return 'text-red-600';
  if (dias <= 2) return 'text-orange-500';
  return 'text-green-600';
};