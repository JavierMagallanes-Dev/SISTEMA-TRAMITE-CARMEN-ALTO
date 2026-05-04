// src/hooks/useHistorial.ts
// Hook que centraliza toda la lógica del Historial de Trámites.

import { useEffect, useState } from 'react';
import api             from '../services/api';
import { areasService } from '../services/areas.service';
import { toast }        from '../utils/toast';
import type { EstadoExpediente, Movimiento } from '../types';

// ── Tipos ────────────────────────────────────────────────────
export interface Documento {
  id: number; nombre: string; url: string; tipo_mime: string; uploaded_at: string;
}

export interface ExpedienteHistorial {
  id:                        number;
  codigo:                    string;
  estado:                    EstadoExpediente;
  fecha_registro:            string;
  fecha_limite:              string;
  fecha_resolucion:          string | null;
  url_pdf_firmado:           string | null;
  codigo_verificacion_firma: string | null;
  ciudadano:   { dni: string; nombres: string; apellido_pat: string; apellido_mat: string; email: string };
  tipoTramite: { nombre: string; plazo_dias: number; costo_soles: number };
  areaActual:  { nombre: string; sigla: string } | null;
  pagos:       { boleta: string; monto_cobrado: number; fecha_pago: string }[];
  movimientos: Movimiento[];
  documentos:  Documento[];
}

export type FiltroEstado = 'TODOS' | 'RESUELTO' | 'ARCHIVADO';

// ── Hook ─────────────────────────────────────────────────────
export function useHistorial() {
  const [expedientes,  setExpedientes]  = useState<ExpedienteHistorial[]>([]);
  const [cargando,     setCargando]     = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODOS');
  const [busqueda,     setBusqueda]     = useState('');

  const [modalDetalle, setModalDetalle] = useState(false);
  const [detalle,      setDetalle]      = useState<ExpedienteHistorial | null>(null);
  const [cargandoDet,  setCargandoDet]  = useState(false);

  // ── Carga ──────────────────────────────────────────────────
  const cargarHistorial = async () => {
    setCargando(true);
    try {
      const res = await api.get('/areas/historial');
      setExpedientes(res.data);
    } catch { toast.error({ titulo: 'Error al cargar el historial.' }); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargarHistorial(); }, []);

  // ── Detalle ────────────────────────────────────────────────
  const verDetalle = async (id: number) => {
    setModalDetalle(true); setCargandoDet(true);
    try {
      const det = await areasService.detalle(id);
      setDetalle({ ...det, documentos: det.documentos ?? [] });
    } catch { toast.error({ titulo: 'Error al cargar el detalle.' }); }
    finally { setCargandoDet(false); }
  };

  const cerrarDetalle = () => { setModalDetalle(false); setDetalle(null); };

  // ── Filtrado ───────────────────────────────────────────────
  const expedientesFiltrados = expedientes.filter((exp) => {
    const coincideEstado   = filtroEstado === 'TODOS' || exp.estado === filtroEstado;
    const q                = busqueda.trim().toLowerCase();
    const coincideBusqueda = !q ||
      exp.codigo.toLowerCase().includes(q) ||
      `${exp.ciudadano.nombres} ${exp.ciudadano.apellido_pat}`.toLowerCase().includes(q) ||
      exp.ciudadano.dni.includes(q) ||
      exp.tipoTramite.nombre.toLowerCase().includes(q);
    return coincideEstado && coincideBusqueda;
  });

  // ── Contadores ─────────────────────────────────────────────
  const totalResueltos  = expedientes.filter(e => e.estado === 'RESUELTO').length;
  const totalArchivados = expedientes.filter(e => e.estado === 'ARCHIVADO').length;

  return {
    expedientes, expedientesFiltrados, cargando,
    filtroEstado, setFiltroEstado,
    busqueda, setBusqueda,
    totalResueltos, totalArchivados,
    modalDetalle, detalle, cargandoDet,
    cargarHistorial, verDetalle, cerrarDetalle,
  };
}