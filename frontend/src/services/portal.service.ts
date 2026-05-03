// src/services/portal.service.ts
import api from './api';

export const portalService = {
  tiposTramite: () =>
    api.get('/portal/tipos-tramite').then(r => r.data),

  requisitos: (tipoTramiteId: number) =>
    api.get(`/portal/tipos-tramite/${tipoTramiteId}/requisitos`).then(r => r.data),

  consultarDni: (dni: string) =>
    api.get(`/portal/consultar-dni/${dni}`).then(r => r.data),

  registrar: (data: Record<string, string>) =>
    api.post('/portal/registrar', data).then(r => r.data),

  subirDocumentoRequisito: (expedienteId: number, requisitoId: number, archivo: File) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return api.post(
      `/portal/documento/${expedienteId}/${requisitoId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data);
  },

  consultarEstado: (codigo: string) =>
    api.get(`/portal/consultar/${codigo}`).then(r => r.data),

  verificarPdf: (codigoVerificacion: string) =>
    api.get(`/portal/verificar/${codigoVerificacion}`).then(r => r.data),
};