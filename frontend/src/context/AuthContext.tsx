// src/context/AuthContext.tsx
// Contexto global que guarda el usuario autenticado y el token.
// Expone login, logout y el usuario actual a toda la app.

import { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Usuario } from '../types';
import api from '../services/api';

interface AuthContextType {
  usuario:  Usuario | null;
  token:    string | null;
  login:    (email: string, password: string) => Promise<void>;
  logout:   () => void;
  cargando: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const stored = localStorage.getItem('usuario');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token')
  );

  const [cargando, setCargando] = useState(false);

  const login = async (email: string, password: string) => {
    setCargando(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token',   data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      setToken(data.token);
      setUsuario(data.usuario);
    } finally {
      setCargando(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};