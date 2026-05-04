// src/hooks/useConsulta.ts
// Hook que centraliza toda la lógica de la página de consulta pública.

import { useEffect, useState, useRef } from 'react';
import { useParams }     from 'react-router-dom';
import { portalService } from '../services/portal.service';
import { toast }         from '../utils/toast';
import type { EstadoExpediente, Movimiento } from '../types';

export const VITE_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

// ── Tipos ────────────────────────────────────────────────────
export interface Pago {
  id: number; boleta: string; monto_cobrado: number;
  estado: string; fecha_pago: string; url_comprobante: string | null;
}

export interface ExpedientePublico {
  id:                        number;
  codigo:                    string;
  estado:                    EstadoExpediente;
  fecha_registro:            string;
  fecha_limite:              string;
  fecha_resolucion:          string | null;
  url_pdf_firmado:           string | null;
  codigo_verificacion_firma: string | null;
  dias_restantes:            number;
  vencido:                   boolean;
  ciudadano:   { nombres: string; apellido_pat: string };
  tipoTramite: { nombre: string; plazo_dias: number; costo_soles: number };
  areaActual:  { nombre: string; sigla: string } | null;
  pagos:       Pago[];
  movimientos: Movimiento[];
}

export type OpcionPago = 'seleccion' | 'comprobante' | 'stripe';

// ── Colores institucionales ───────────────────────────────────
export const PRIMARY        = '#216ece';
export const PRIMARY_DARKER = '#143f7a';
export const ACCENT         = '#4abdef';
export const TINT           = '#eaf2fb';

// ── Hook ─────────────────────────────────────────────────────
export function useConsulta() {
  const { codigo: codigoParam } = useParams<{ codigo: string }>();

  const [codigo,     setCodigo]     = useState(codigoParam?.toUpperCase() ?? '');
  const [expediente, setExpediente] = useState<ExpedientePublico | null>(null);
  const [cargando,   setCargando]   = useState(false);

  // Documentos (observado)
  const [archivos,     setArchivos]     = useState<File[]>([]);
  const [subiendoDocs, setSubiendoDocs] = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  // Pago
  const [opcionPago,        setOpcionPago]       = useState<OpcionPago>('seleccion');
  const [comprobante,       setComprobante]       = useState<File | null>(null);
  const [subiendoComp,      setSubiendoComp]      = useState(false);
  const [comprobanteSubido, setComprobanteSubido] = useState(false);
  const comprobanteInputRef                        = useRef<HTMLInputElement>(null);

  // ── Consultar expediente ──────────────────────────────────
  const consultar = async (cod: string) => {
    if (!cod.trim()) return;
    setCargando(true);
    setExpediente(null);
    setOpcionPago('seleccion');
    setComprobanteSubido(false);
    try {
      const data = await portalService.consultarEstado(cod.trim().toUpperCase());
      setExpediente(data);
    } catch (err: any) {
      toast.error({ titulo: err?.response?.data?.error ?? 'No se encontró ningún expediente con ese código.' });
    } finally { setCargando(false); }
  };

  useEffect(() => {
    if (codigoParam) consultar(codigoParam);
  }, [codigoParam]);

  // ── Cargo de recepción ────────────────────────────────────
  const descargarCargo = (cod: string) => {
    window.open(`${VITE_API_URL}/recepcion/cargo/publico/${cod}`, '_blank');
  };

  // ── Documentos (observado) ────────────────────────────────
  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files   = Array.from(e.target.files ?? []);
    const validos = files.filter((f) => {
      if (f.type !== 'application/pdf') { toast.warning({ titulo: `"${f.name}" no es un PDF.` }); return false; }
      if (f.size > 10 * 1024 * 1024)   { toast.warning({ titulo: `"${f.name}" supera los 10MB.` }); return false; }
      return true;
    });
    setArchivos(prev => [...prev, ...validos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const quitarArchivo = (index: number) =>
    setArchivos(prev => prev.filter((_, i) => i !== index));

  const handleSubirDocumentos = async () => {
    if (!expediente || archivos.length === 0) return;
    setSubiendoDocs(true);
    try {
      for (const archivo of archivos) {
        const formData = new FormData();
        formData.append('archivo', archivo);
        await fetch(`${VITE_API_URL}/documentos/subir/${expediente.id}`, { method: 'POST', body: formData });
      }
      toast.success({ titulo: 'Documentos enviados', descripcion: `${archivos.length} documento(s) enviado(s) correctamente.` });
      setArchivos([]);
      consultar(expediente.codigo);
    } catch { toast.error({ titulo: 'Error al subir los documentos.' }); }
    finally { setSubiendoDocs(false); }
  };

  // ── Comprobante de pago ───────────────────────────────────
  const handleComprobanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!tiposPermitidos.includes(file.type)) { toast.warning({ titulo: 'Solo se aceptan imágenes o PDF.' }); return; }
    if (file.size > 10 * 1024 * 1024)         { toast.warning({ titulo: 'El archivo no puede superar los 10MB.' }); return; }
    setComprobante(file);
    if (comprobanteInputRef.current) comprobanteInputRef.current.value = '';
  };

  const handleSubirComprobante = async () => {
    if (!expediente || !comprobante) return;
    setSubiendoComp(true);
    try {
      const formData = new FormData();
      formData.append('comprobante', comprobante);
      const res = await fetch(`${VITE_API_URL}/portal/comprobante/${expediente.codigo}`, {
        method: 'POST', body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al subir el comprobante.');
      }
      setComprobanteSubido(true);
      setComprobante(null);
      toast.success({ titulo: '¡Comprobante enviado!', descripcion: 'El cajero lo revisará y verificará tu pago pronto.' });
      consultar(expediente.codigo);
    } catch (err: any) {
      toast.error({ titulo: err.message ?? 'Error al subir el comprobante.' });
    } finally { setSubiendoComp(false); }
  };

  const handlePagoExito = () => {
    toast.success({ titulo: '¡Pago procesado!', descripcion: 'Tu trámite ha sido activado automáticamente.' });
    setOpcionPago('seleccion');
    if (expediente) consultar(expediente.codigo);
  };

  // ── Helpers ───────────────────────────────────────────────
  const obtenerObservacion = (): string | null => {
    if (!expediente) return null;
    const movObs = [...expediente.movimientos].reverse().find((m) => m.tipo_accion === 'OBSERVACION');
    return movObs?.comentario ?? null;
  };

  const yaSubioComprobante = expediente?.pagos?.some((p) => p.url_comprobante) ?? false;

  const movimientosPublicos = expediente?.movimientos.filter((m) =>
    !['REGISTRO','VERIFICACION_PAGO','REVISION_MDP','DERIVACION',
      'TOMA_EXPEDIENTE','VISTO_BUENO','SUBIDA_PDF_FIRMADO','ARCHIVADO'].includes(m.tipo_accion)
  ) ?? [];

  return {
    // Búsqueda
    codigo, setCodigo, expediente, cargando,
    consultar, descargarCargo,
    // Documentos
    archivos, subiendoDocs, fileInputRef,
    handleArchivoChange, quitarArchivo, handleSubirDocumentos,
    // Pago
    opcionPago, setOpcionPago,
    comprobante, setComprobante,
    subiendoComp, comprobanteSubido,
    comprobanteInputRef,
    handleComprobanteChange, handleSubirComprobante, handlePagoExito,
    // Helpers
    obtenerObservacion, yaSubioComprobante, movimientosPublicos,
  };
}
