// src/hooks/useNotificaciones.ts
// Polling cada 30 segundos para obtener notificaciones del usuario logueado.

import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface Notificacion {
  id:          number;
  titulo:      string;
  mensaje:     string;
  leida:       boolean;
  created_at:  string;
  expediente?: { codigo: string } | null;
}

export function useNotificaciones() {
  const { usuario } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas,       setNoLeidas]       = useState(0);
  const [open,           setOpen]           = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    try {
      const res = await api.get('/notificaciones');
      setNotificaciones(res.data.notificaciones);
      setNoLeidas(res.data.noLeidas);
    } catch { /* silencioso — no interrumpir la app */ }
  }, [usuario]);

  // Carga inicial + polling cada 30s
  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 30_000);
    return () => clearInterval(interval);
  }, [cargar]);

  const marcarLeida = async (id: number) => {
    try {
      await api.patch(`/notificaciones/${id}/leer`);
      setNotificaciones(prev =>
        prev.map(n => n.id === id ? { ...n, leida: true } : n)
      );
      setNoLeidas(prev => Math.max(0, prev - 1));
    } catch { /* silencioso */ }
  };

  const marcarTodasLeidas = async () => {
    try {
      await api.patch('/notificaciones/leer-todas');
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch { /* silencioso */ }
  };

  const toggleOpen = () => setOpen(prev => !prev);
  const cerrar     = () => setOpen(false);

  const tiempoRelativo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const min  = Math.floor(diff / 60_000);
    if (min < 1)  return 'ahora mismo';
    if (min < 60) return `hace ${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24)   return `hace ${h}h`;
    return `hace ${Math.floor(h / 24)}d`;
  };

  return {
    notificaciones, noLeidas, open,
    toggleOpen, cerrar,
    marcarLeida, marcarTodasLeidas,
    tiempoRelativo,
  };
}