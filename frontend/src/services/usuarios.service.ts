// src/services/usuarios.service.ts
import api from './api';

export const usuariosService = {
  listar: (activo?: boolean) =>
    api.get('/usuarios', { params: activo !== undefined ? { activo } : {} }).then(r => r.data),

  obtener: (id: number) =>
    api.get(`/usuarios/${id}`).then(r => r.data),

  areas: () =>
    api.get('/usuarios/areas').then(r => r.data),

  roles: () =>
    api.get('/usuarios/roles').then(r => r.data),

  crear: (data: Record<string, any>) =>
    api.post('/usuarios', data).then(r => r.data),

  editar: (id: number, data: Record<string, any>) =>
    api.put(`/usuarios/${id}`, data).then(r => r.data),

  desactivar: (id: number) =>
    api.patch(`/usuarios/${id}/desactivar`).then(r => r.data),

  activar: (id: number) =>
    api.patch(`/usuarios/${id}/activar`).then(r => r.data),

  resetPassword: (id: number, nueva_password: string) =>
    api.patch(`/usuarios/${id}/reset-password`, { nueva_password }).then(r => r.data),
};