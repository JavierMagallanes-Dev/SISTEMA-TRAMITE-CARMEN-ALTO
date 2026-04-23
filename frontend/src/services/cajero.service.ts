// src/services/cajero.service.ts
import api from './api';

export const cajeroService = {
  pendientes: () =>
    api.get('/cajero/pendientes').then(r => r.data),

  historial: (fecha?: string) =>
    api.get('/cajero/historial', { params: fecha ? { fecha } : {} }).then(r => r.data),

  resumenHoy: () =>
    api.get('/cajero/resumen-hoy').then(r => r.data),

  verificarPago: (expedienteId: number, boleta: string, monto_cobrado: number) =>
    api.post('/cajero/verificar-pago', { expedienteId, boleta, monto_cobrado }).then(r => r.data),

  anularPago: (pagoId: number, motivo: string) =>
    api.post('/cajero/anular-pago', { pagoId, motivo }).then(r => r.data),
};