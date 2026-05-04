// src/hooks/useCajero.ts
// Hook que centraliza toda la lógica del módulo Cajero.

import { useEffect, useState } from 'react';
import { cajeroService } from '../services/cajero.service';

// ── Tipos ────────────────────────────────────────────────────
export interface PagoComprobante {
  id:              number;
  url_comprobante: string | null;
  boleta:          string;
  fecha_pago:      string;
}

export interface ExpedientePendiente {
  id:             number;
  codigo:         string;
  fecha_registro: string;
  ciudadano:   { dni: string; nombres: string; apellido_pat: string };
  tipoTramite: { nombre: string; costo_soles: number };
  pagos:       PagoComprobante[];
}

export interface PagoHistorial {
  id:              number;
  boleta:          string;
  monto_cobrado:   number;
  estado:          string;
  fecha_pago:      string;
  url_comprobante: string | null;
  expediente: {
    codigo:    string;
    ciudadano: { nombres: string; apellido_pat: string };
  };
}

export interface ResumenHoy {
  pagos_verificados_hoy:  number;
  total_recaudado_hoy:    number;
}

// ── Hook ─────────────────────────────────────────────────────
export function useCajero() {
  const [tab,        setTab]        = useState<'pendientes' | 'historial'>('pendientes');
  const [pendientes, setPendientes] = useState<ExpedientePendiente[]>([]);
  const [historial,  setHistorial]  = useState<{ pagos: PagoHistorial[]; total_monto: number }>({ pagos: [], total_monto: 0 });
  const [resumenHoy, setResumenHoy] = useState<ResumenHoy | null>(null);
  const [cargando,   setCargando]   = useState(true);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // Modal verificar pago
  const [modalPago,       setModalPago]       = useState(false);
  const [expSeleccionado, setExpSeleccionado] = useState<ExpedientePendiente | null>(null);
  const [boleta,          setBoleta]          = useState('');
  const [monto,           setMonto]           = useState('');
  const [loadingPago,     setLoadingPago]     = useState(false);

  // Modal anular
  const [modalAnular,      setModalAnular]      = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<PagoHistorial | null>(null);
  const [motivo,           setMotivo]           = useState('');
  const [loadingAnular,    setLoadingAnular]    = useState(false);

  // Modal comprobante
  const [modalComprobante, setModalComprobante] = useState(false);
  const [urlComprobante,   setUrlComprobante]   = useState('');
  const [esImagen,         setEsImagen]         = useState(false);

  // ── Carga ──────────────────────────────────────────────────
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [pend, hist, resumen] = await Promise.all([
        cajeroService.pendientes(),
        cajeroService.historial(),
        cajeroService.resumenHoy(),
      ]);
      setPendientes(pend); setHistorial(hist); setResumenHoy(resumen);
    } catch { setError('Error al cargar los datos.'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  // ── Verificar pago ─────────────────────────────────────────
  const abrirModalPago = (exp: ExpedientePendiente) => {
    setExpSeleccionado(exp);
    setMonto(String(exp.tipoTramite.costo_soles));
    setBoleta('');
    setModalPago(true);
  };

  const handleVerificarPago = async () => {
    if (!expSeleccionado || !boleta.trim() || !monto) return;
    setLoadingPago(true);
    try {
      await cajeroService.verificarPago(expSeleccionado.id, boleta.trim(), Number(monto));
      setSuccess(`Pago verificado para ${expSeleccionado.codigo}.`);
      setModalPago(false);
      cargarDatos();
    } catch (err: any) { setError(err?.response?.data?.error ?? 'Error al verificar el pago.'); }
    finally { setLoadingPago(false); }
  };

  // ── Anular pago ────────────────────────────────────────────
  const abrirModalAnular = (pago: PagoHistorial) => {
    setPagoSeleccionado(pago);
    setMotivo('');
    setModalAnular(true);
  };

  const handleAnularPago = async () => {
    if (!pagoSeleccionado || !motivo.trim()) return;
    setLoadingAnular(true);
    try {
      await cajeroService.anularPago(pagoSeleccionado.id, motivo.trim());
      setSuccess('Pago anulado correctamente.');
      setModalAnular(false);
      cargarDatos();
    } catch (err: any) { setError(err?.response?.data?.error ?? 'Error al anular el pago.'); }
    finally { setLoadingAnular(false); }
  };

  // ── Ver comprobante ────────────────────────────────────────
  const verComprobante = (url: string) => {
    setUrlComprobante(url);
    setEsImagen(!url.endsWith('.pdf'));
    setModalComprobante(true);
  };

  return {
    // Estado
    tab, setTab,
    pendientes, historial, resumenHoy,
    cargando, error, setError, success, setSuccess,
    // Verificar pago
    modalPago, setModalPago,
    expSeleccionado,
    boleta, setBoleta,
    monto, setMonto,
    loadingPago,
    abrirModalPago, handleVerificarPago,
    // Anular pago
    modalAnular, setModalAnular,
    pagoSeleccionado,
    motivo, setMotivo,
    loadingAnular,
    abrirModalAnular, handleAnularPago,
    // Comprobante
    modalComprobante, setModalComprobante,
    urlComprobante, esImagen,
    verComprobante,
    // Acciones
    cargarDatos,
  };
}