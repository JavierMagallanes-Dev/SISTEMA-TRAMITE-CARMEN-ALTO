// src/services/portal.service.ts
import api from './api';

export const portalService = {
  tiposTramite: () =>
    api.get('/portal/tipos-tramite').then(r => r.data),

  consultarDni: (dni: string) =>
    api.get(`/portal/consultar-dni/${dni}`).then(r => r.data),

  registrar: (data: Record<string, string>) =>
    api.post('/portal/registrar', data).then(r => r.data),

  consultarEstado: (codigo: string) =>
    api.get(`/portal/consultar/${codigo}`).then(r => r.data),

  verificarPdf: (codigoVerificacion: string) =>
    api.get(`/portal/verificar/${codigoVerificacion}`).then(r => r.data),
};