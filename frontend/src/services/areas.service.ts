// src/services/areas.service.ts
import api from './api';

export const areasService = {
  bandeja: () =>
    api.get('/areas/bandeja').then(r => r.data),

  detalle: (id: number) =>
    api.get(`/areas/expediente/${id}`).then(r => r.data),

  tomar: (id: number) =>
    api.patch(`/areas/tomar/${id}`).then(r => r.data),

  observar: (id: number, comentario: string) =>
    api.patch(`/areas/observar/${id}`, { comentario }).then(r => r.data),

  rechazar: (id: number, comentario: string) =>
    api.patch(`/areas/rechazar/${id}`, { comentario }).then(r => r.data),

  vistoBueno: (id: number) =>
    api.patch(`/areas/visto-bueno/${id}`).then(r => r.data),

  subirPdfFirmado: (id: number, url_pdf_firmado: string) =>
    api.post(`/areas/subir-pdf-firmado/${id}`, { url_pdf_firmado }).then(r => r.data),

  archivar: (id: number) =>
    api.patch(`/areas/archivar/${id}`).then(r => r.data),
  reactivar: (id: number) =>
  api.patch(`/areas/reactivar/${id}`).then(r => r.data),
};