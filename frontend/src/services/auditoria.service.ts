// src/services/auditoria.service.ts
import api from './api';

export const auditoriaService = {
  listar: (params?: { tabla?: string; operacion?: string; fecha?: string; page?: number }) =>
    api.get('/auditoria', { params }).then(r => r.data),

  resumen: () =>
    api.get('/auditoria/resumen').then(r => r.data),

  porExpediente: (id: number) =>
    api.get(`/auditoria/expediente/${id}`).then(r => r.data),
};