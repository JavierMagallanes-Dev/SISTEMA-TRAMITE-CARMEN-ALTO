// src/hooks/useDashboard.ts
import { useEffect, useMemo, useState } from 'react';
import api      from '../services/api';
import { toast } from '../utils/toast';
import type { EstadoExpediente, Ciudadano, TipoTramite } from '../types';
import { ESTADO_CONFIG } from '../utils/constants';

// ── Tipos ────────────────────────────────────────────────────
export interface KpisMesaPartes {
  registrados_hoy: number; pendiente_pago: number;
  en_revision: number; derivados: number; recibidos: number;
  observados: number; rechazados: number; vencidos: number; proximos_vencer: number;
}
export interface KpisCajero {
  pagos_hoy: number; monto_hoy: number; pendientes_pago: number;
}
export interface KpisAreaTecnica {
  total_en_bandeja: number; en_proceso: number; listo_descarga: number; observados: number;
}
export type KpisDashboard = KpisMesaPartes | KpisCajero | KpisAreaTecnica;

export interface UltimoExpediente {
  id: number; codigo: string; estado: EstadoExpediente;
  fecha_registro: string; fecha_limite: string;
  ciudadano:   Pick<Ciudadano, 'nombres' | 'apellido_pat'>;
  tipoTramite: Pick<TipoTramite, 'nombre'>;
}

export interface PuntoEstado    { estado: EstadoExpediente; cantidad: number; }
export interface PuntoTendencia { fecha: string; registrados: number; resueltos: number; }

export interface DatosDashboard {
  kpis:                 KpisDashboard;
  ultimos_expedientes?: UltimoExpediente[];
  por_estado?:          PuntoEstado[];
  tendencia_7d?:        PuntoTendencia[];
}

// ── Type guards ───────────────────────────────────────────────
export const isKpisMesaPartes  = (k: KpisDashboard): k is KpisMesaPartes  => (k as KpisMesaPartes).registrados_hoy  !== undefined;
export const isKpisCajero      = (k: KpisDashboard): k is KpisCajero      => (k as KpisCajero).pagos_hoy            !== undefined;
export const isKpisAreaTecnica = (k: KpisDashboard): k is KpisAreaTecnica => (k as KpisAreaTecnica).total_en_bandeja !== undefined;

// ── Colores y etiquetas ───────────────────────────────────────
export const COLOR_POR_ESTADO: Record<EstadoExpediente, string> = {
  PENDIENTE_PAGO:  '#eab308', RECIBIDO:       '#216ece', EN_REVISION_MDP: '#a855f7',
  DERIVADO:        '#6366f1', EN_PROCESO:     '#fb923c', LISTO_DESCARGA:  '#06b6d4',
  PDF_FIRMADO:     '#14b8a6', RESUELTO:       '#16a34a', OBSERVADO:       '#dc2626',
  RECHAZADO:       '#991b1b', ARCHIVADO:      '#6b7280',
};

export const SHORT_LABEL: Record<EstadoExpediente, string> = {
  PENDIENTE_PAGO:  'Pend. Pago', RECIBIDO:       'Recibido', EN_REVISION_MDP: 'Rev. MDP',
  DERIVADO:        'Derivado',   EN_PROCESO:     'Proceso',  LISTO_DESCARGA:  'L. Firma',
  PDF_FIRMADO:     'Firmado',    RESUELTO:       'Resuelto', OBSERVADO:       'Observado',
  RECHAZADO:       'Rechazado',  ARCHIVADO:      'Archivado',
};

export function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return `${dias[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}`;
}

// ── Hook ─────────────────────────────────────────────────────
export function useDashboard() {
  const [datos,    setDatos]    = useState<DatosDashboard | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await api.get<DatosDashboard>('/dashboard');
      setDatos(res.data);
    } catch { toast.error({ titulo: 'Error al cargar el dashboard.' }); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const dataBarras = useMemo(() => (datos?.por_estado ?? []).map((p) => ({
    estado:      p.estado,
    estadoLabel: ESTADO_CONFIG[p.estado]?.label ?? p.estado,
    short:       SHORT_LABEL[p.estado] ?? p.estado,
    cantidad:    p.cantidad,
    fillColor:   COLOR_POR_ESTADO[p.estado] ?? '#6b7280',
  })), [datos?.por_estado]);

  const dataTendencia = useMemo(() => (datos?.tendencia_7d ?? []).map((p) => ({
    ...p, dia: fechaCorta(p.fecha),
  })), [datos?.tendencia_7d]);

  return { datos, cargando, cargar, dataBarras, dataTendencia };
}