// src/services/auth.service.ts
import api from './api';

export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),

  perfil: () =>
    api.get('/auth/perfil').then(r => r.data),

  cambiarPassword: (password_actual: string, password_nuevo: string) =>
    api.put('/auth/cambiar-password', { password_actual, password_nuevo }).then(r => r.data),
};