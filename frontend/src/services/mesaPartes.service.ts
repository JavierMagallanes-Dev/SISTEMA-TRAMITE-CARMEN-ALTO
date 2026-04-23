// src/services/mesaPartes.service.ts
import api from './api';

export const mesaPartesService = {
  consultarDni: (dni: string) =>
    api.get(`/mesa-partes/consultar-dni/${dni}`).then(r => r.data),

  tiposTramite: () =>
    api.get('/mesa-partes/tipos-tramite').then(r => r.data),

  areas: () =>
    api.get('/mesa-partes/areas').then(r => r.data),

  bandeja: () =>
    api.get('/mesa-partes/bandeja').then(r => r.data),

  registrar: (data: Record<string, string>) =>
    api.post('/mesa-partes/registrar', data).then(r => r.data),

  derivar: (expedienteId: number, areaDestinoId: number, instrucciones?: string) =>
    api.post('/mesa-partes/derivar', { expedienteId, areaDestinoId, instrucciones }).then(r => r.data),

  confirmarDerivacion: (token: string) =>
    api.post('/mesa-partes/confirmar-derivacion', { token }).then(r => r.data),
};