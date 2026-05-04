// src/hooks/useAuditoria.ts
// Hook que centraliza toda la lógica del módulo de Auditoría.

import { useEffect, useState } from 'react';
import api                from '../services/api';
import { auditoriaService } from '../services/auditoria.service';
import { toast }          from '../utils/toast';
import type { EstadoExpediente, Movimiento } from '../types';

// ── Tipos ────────────────────────────────────────────────────
export interface RegistroAuditoria {
  id: number; tabla: string; operacion: string;
  registro_id:      number | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos:     Record<string, unknown> | null;
  usuario_bd: string | null; usuario_app_id: number | null;
  fecha_hora: string;
}

export interface MovimientoAuditoria {
  id: number; tipo_accion: string; estado_resultado: string;
  comentario: string | null; fecha_hora: string;
  usuario:     { nombre_completo: string; rol: { nombre: string } };
  areaOrigen:  { nombre: string; sigla: string } | null;
  areaDestino: { nombre: string; sigla: string } | null;
}

export interface ExpedienteAuditoria {
  id: number; codigo: string; estado: string;
  fecha_registro: string; fecha_limite: string; fecha_resolucion: string | null;
  ciudadano:    { nombres: string; apellido_pat: string; dni: string };
  tipoTramite:  { nombre: string };
  areaActual:   { nombre: string; sigla: string } | null;
  registradoPor:{ nombre_completo: string } | null;
  firmadoPor:   { nombre_completo: string } | null;
  movimientos:  MovimientoAuditoria[];
  pagos:        { boleta: string; monto_cobrado: number; fecha_pago: string }[];
}

export interface ResumenData {
  hoy: { expedientes_registrados: number; pagos_verificados: number };
  totales: { total: number; resueltos: number };
  expedientes_por_estado: { estado: string; total: number }[];
  ultimos_movimientos: {
    tipo_accion: string; estado_resultado: string; comentario: string | null;
    fecha_hora: string;
    usuario:    { nombre_completo: string; rol: { nombre: string } };
    expediente: { codigo: string; tipoTramite: { nombre: string } };
    areaDestino: { nombre: string } | null;
  }[];
}

export const ACCION_LABEL: Record<string, { label: string; color: string }> = {
  REGISTRO:          { label: 'Registro',    color: 'bg-blue-100 text-blue-700'      },
  PAGO:              { label: 'Pago',         color: 'bg-green-100 text-green-700'    },
  TOMA_EXPEDIENTE:   { label: 'Tomado',       color: 'bg-indigo-100 text-indigo-700'  },
  DERIVACION:        { label: 'Derivación',   color: 'bg-purple-100 text-purple-700'  },
  OBSERVACION:       { label: 'Observación',  color: 'bg-yellow-100 text-yellow-700'  },
  VISTO_BUENO:       { label: 'Visto Bueno',  color: 'bg-teal-100 text-teal-700'      },
  SUBIDA_PDF_FIRMADO:{ label: 'Firmado',      color: 'bg-emerald-100 text-emerald-700'},
  RECHAZO:           { label: 'Rechazo',      color: 'bg-red-100 text-red-700'        },
  SUBSANACION:       { label: 'Subsanación',  color: 'bg-orange-100 text-orange-700'  },
  ARCHIVADO:         { label: 'Archivado',    color: 'bg-gray-100 text-gray-600'      },
};

export const ESTADOS_DISPONIBLES = [
  'PENDIENTE_PAGO','RECIBIDO','EN_REVISION_MDP','DERIVADO',
  'EN_PROCESO','OBSERVADO','LISTO_DESCARGA','PDF_FIRMADO',
  'RESUELTO','ARCHIVADO','RECHAZADO',
];

// ── Hook ─────────────────────────────────────────────────────
export function useAuditoria() {
  const [tab,      setTab]      = useState<'resumen' | 'expedientes' | 'bitacora'>('resumen');
  const [cargando, setCargando] = useState(true);

  // Resumen
  const [resumen, setResumen] = useState<ResumenData | null>(null);

  // Bitácora
  const [registros,       setRegistros]       = useState<RegistroAuditoria[]>([]);
  const [totalBitacora,   setTotalBitacora]   = useState(0);
  const [paginaBitacora,  setPaginaBitacora]  = useState(1);
  const [filtroTabla,     setFiltroTabla]     = useState('');
  const [filtroOperacion, setFiltroOperacion] = useState('');
  const [filtroFecha,     setFiltroFecha]     = useState('');

  // Expedientes
  const [expedientes,  setExpedientes]  = useState<ExpedienteAuditoria[]>([]);
  const [totalExp,     setTotalExp]     = useState(0);
  const [paginaExp,    setPaginaExp]    = useState(1);
  const [expandedExp,  setExpandedExp]  = useState<number | null>(null);
  const [cargandoExp,  setCargandoExp]  = useState(false);
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFechaI, setFiltroFechaI] = useState('');
  const [filtroFechaF, setFiltroFechaF] = useState('');

  // ── Carga ──────────────────────────────────────────────────
  const cargarResumen = async () => {
    try { setResumen(await auditoriaService.resumen()); }
    catch { toast.error({ titulo: 'Error al cargar el resumen.' }); }
  };

  const cargarBitacora = async (pag = 1) => {
    try {
      const data = await auditoriaService.listar({
        tabla:     filtroTabla     || undefined,
        operacion: filtroOperacion || undefined,
        fecha:     filtroFecha     || undefined,
        page:      pag,
      });
      setRegistros(data.registros);
      setTotalBitacora(data.total);
      setPaginaBitacora(pag);
    } catch { toast.error({ titulo: 'Error al cargar la bitácora.' }); }
  };

  const cargarExpedientes = async (pag = 1) => {
    setCargandoExp(true);
    try {
      const params = new URLSearchParams({ page: String(pag) });
      if (filtroCodigo) params.append('codigo',       filtroCodigo);
      if (filtroEstado) params.append('estado',       filtroEstado);
      if (filtroFechaI) params.append('fecha_inicio', filtroFechaI);
      if (filtroFechaF) params.append('fecha_fin',    filtroFechaF);
      const res = await api.get(`/auditoria/expedientes?${params.toString()}`);
      setExpedientes(res.data.expedientes);
      setTotalExp(res.data.total);
      setPaginaExp(pag);
    } catch { toast.error({ titulo: 'Error al cargar expedientes.' }); }
    finally { setCargandoExp(false); }
  };

  const cargarDatos = async () => {
    setCargando(true);
    try { await Promise.all([cargarResumen(), cargarBitacora(1), cargarExpedientes(1)]); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  return {
    // Estado general
    tab, setTab, cargando, cargarDatos,
    // Resumen
    resumen,
    // Bitácora
    registros, totalBitacora, paginaBitacora,
    filtroTabla, setFiltroTabla,
    filtroOperacion, setFiltroOperacion,
    filtroFecha, setFiltroFecha,
    cargarBitacora,
    // Expedientes
    expedientes, totalExp, paginaExp,
    expandedExp, setExpandedExp,
    cargandoExp,
    filtroCodigo, setFiltroCodigo,
    filtroEstado, setFiltroEstado,
    filtroFechaI, setFiltroFechaI,
    filtroFechaF, setFiltroFechaF,
    cargarExpedientes,
  };
}