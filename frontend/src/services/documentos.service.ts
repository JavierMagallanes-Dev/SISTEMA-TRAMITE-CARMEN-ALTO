// src/services/documentos.service.ts

import api from './api';

export const documentosService = {
  // Subir documento adjunto (ciudadano o empleado)
  subirDocumento: (expedienteId: number, archivo: File) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return api.post(`/documentos/subir/${expedienteId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  // Listar documentos de un expediente
  listar: (expedienteId: number) =>
    api.get(`/documentos/expediente/${expedienteId}`).then(r => r.data),

  // Subir PDF firmado con FirmaPeru (solo Jefe)
  subirPdfFirmado: (expedienteId: number, archivo: File) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return api.post(`/documentos/subir-firmado/${expedienteId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};