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

  archivar: (id: number) =>
    api.patch(`/areas/archivar/${id}`).then(r => r.data),

  reactivar: (id: number) =>
    api.patch(`/areas/reactivar/${id}`).then(r => r.data),

  solicitarCodigoFirma: (expedienteId: number) =>
    api.post(`/areas/solicitar-codigo-firma/${expedienteId}`).then(r => r.data),

  firmar: (expedienteId: number, datos: {
    codigo: string; pagina: number;
    posicion_x: number; posicion_y: number;
    ancho: number; alto: number;
  }) => api.post(`/areas/firmar/${expedienteId}`, datos).then(r => r.data),
};