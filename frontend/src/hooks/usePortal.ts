// src/hooks/usePortal.ts
// Hook que centraliza toda la lógica del Portal Ciudadano.

import { useEffect, useState } from 'react';
import { portalService }  from '../services/portal.service';
import type { EstadoReq } from '../components/shared/Paso2Datos';
import { toast }          from '../utils/toast';

// ── Tipos ────────────────────────────────────────────────────
export interface TipoTramite {
  id: number; nombre: string; descripcion: string | null;
  costo_soles: number; plazo_dias: number;
}

export interface Requisito {
  id: number; nombre: string; descripcion: string | null;
  obligatorio: boolean; orden: number;
}

export type PasoInterno = 1 | 2 | 3;

const FORM_INICIAL = {
  tipoDocumento: 'DNI', dni: '', nombres: '',
  apellido_pat: '', apellido_mat: '', email: '',
  telefono: '', pais_emision: '', fecha_vencimiento: '', fecha_nacimiento: '',
};

// ── Hook ─────────────────────────────────────────────────────
export function usePortal() {
  const [paso,             setPaso]             = useState<PasoInterno>(1);
  const [tipos,            setTipos]            = useState<TipoTramite[]>([]);
  const [requisitos,       setRequisitos]       = useState<Requisito[]>([]);
  const [estadosReq,       setEstadosReq]       = useState<Record<number, EstadoReq>>({});
  const [loading,          setLoading]          = useState(false);
  const [codigoGenerado,   setCodigoGenerado]   = useState('');
  const [expedienteId,     setExpedienteId]     = useState<number>(0);
  const [tipoRegistrado,   setTipoRegistrado]   = useState<TipoTramite | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoTramite | null>(null);
  const [turnstileToken,   setTurnstileToken]   = useState('');
  const [buscandoDni,      setBuscandoDni]      = useState(false);
  const [form,             setForm]             = useState(FORM_INICIAL);

  // ── Carga inicial ──────────────────────────────────────────
  useEffect(() => {
    portalService.tiposTramite().then(setTipos).catch(() => {});
  }, []);

  // ── Selección de trámite ───────────────────────────────────
  const handleSeleccionarTramite = async (tipo: TipoTramite) => {
    setTipoSeleccionado(tipo);
    try {
      const reqs = await portalService.requisitos(tipo.id);
      setRequisitos(reqs);
      const estados: Record<number, EstadoReq> = {};
      reqs.forEach((r: Requisito) => {
        estados[r.id] = { archivo: null, subido: false, subiendo: false, error: '' };
      });
      setEstadosReq(estados);
    } catch {
      setRequisitos([]); setEstadosReq({});
    }
  };

  const handleContinuar = () => {
    if (!tipoSeleccionado) { toast.warning({ titulo: 'Selecciona un tipo de trámite.' }); return; }
    setPaso(2);
  };

  // ── Datos personales ───────────────────────────────────────
  const setF = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const buscarDni = async () => {
    if (form.tipoDocumento !== 'DNI' || form.dni.length !== 8) return;
    setBuscandoDni(true);
    try {
      const res = await portalService.consultarDni(form.dni);
      const c   = res.datos || res.ciudadano;
      if (c) setForm(prev => ({
        ...prev,
        nombres:      c.nombres      || '',
        apellido_pat: c.apellido_pat || c.apellidoPat || '',
        apellido_mat: c.apellido_mat || c.apellidoMat || '',
        email:        c.email        || '',
      }));
    } catch { /* RENIEC no disponible */ }
    finally { setBuscandoDni(false); }
  };

  const handleAtras = () => { setPaso(1); setTurnstileToken(''); };

  const handleTurnstileExpire = () => {
    setTurnstileToken('');
    toast.warning({ titulo: 'La verificación expiró.' });
  };

  const handleTurnstileError = () => {
    setTurnstileToken('');
    toast.error({ titulo: 'Error en la verificación.' });
  };

  // ── Requisitos ─────────────────────────────────────────────
  const handleArchivoReq = (reqId: number, archivo: File | null) => {
    setEstadosReq(prev => ({ ...prev, [reqId]: { ...prev[reqId], archivo, error: '' } }));
  };

  const handleSubirReq = async (reqId: number) => {
    const estado = estadosReq[reqId];
    if (!estado?.archivo) return;

    if (expedienteId > 0) {
      setEstadosReq(prev => ({ ...prev, [reqId]: { ...prev[reqId], subiendo: true, error: '' } }));
      try {
        await portalService.subirDocumentoRequisito(expedienteId, reqId, estado.archivo!);
        setEstadosReq(prev => ({ ...prev, [reqId]: { ...prev[reqId], subiendo: false, subido: true } }));
      } catch {
        setEstadosReq(prev => ({ ...prev, [reqId]: { ...prev[reqId], subiendo: false, error: 'Error al subir. Intenta de nuevo.' } }));
      }
      return;
    }

    setEstadosReq(prev => ({ ...prev, [reqId]: { ...prev[reqId], subido: true, error: '' } }));
  };

  // ── Registro ───────────────────────────────────────────────
  const handleRegistrar = async () => {
    if (!form.dni || !form.nombres || !form.apellido_pat || !form.email || !tipoSeleccionado) {
      toast.warning({ titulo: 'Completa todos los campos obligatorios.' }); return;
    }
    if (!turnstileToken) {
      toast.warning({ titulo: 'Completa la verificación de seguridad.' }); return;
    }

    const reqOblig  = requisitos.filter(r => r.obligatorio);
    const faltantes = reqOblig.filter(r => !estadosReq[r.id]?.subido && !estadosReq[r.id]?.archivo);
    if (faltantes.length > 0) {
      toast.warning({ titulo: 'Faltan documentos obligatorios', descripcion: `Adjunta: ${faltantes.map(r => r.nombre).join(', ')}` });
      return;
    }

    setLoading(true);
    try {
      const res = await portalService.registrar({
        tipoDocumento:           form.tipoDocumento,
        dni:                     form.dni,
        nombres:                 form.nombres,
        apellido_pat:            form.apellido_pat,
        apellido_mat:            form.apellido_mat,
        email:                   form.email,
        telefono:                form.telefono,
        pais_emision:            form.pais_emision,
        fecha_vencimiento:       form.fecha_vencimiento,
        fecha_nacimiento:        form.fecha_nacimiento,
        tipoTramiteId:           String(tipoSeleccionado.id),
        'cf-turnstile-response': turnstileToken,
      });

      const expId = res.expediente.id;
      setCodigoGenerado(res.expediente.codigo);
      setExpedienteId(expId);
      setTipoRegistrado(tipoSeleccionado);

      // Subir archivos adjuntados
      const archivosParaSubir = requisitos.filter(r => estadosReq[r.id]?.archivo);
      for (const req of archivosParaSubir) {
        const archivo = estadosReq[req.id].archivo;
        if (!archivo) continue;
        try {
          await portalService.subirDocumentoRequisito(expId, req.id, archivo);
          setEstadosReq(prev => ({ ...prev, [req.id]: { ...prev[req.id], subido: true, subiendo: false } }));
        } catch { console.warn(`No se pudo subir documento del requisito ${req.id}`); }
      }

      setPaso(3);
    } catch (err: any) {
      toast.error({ titulo: err?.response?.data?.error ?? 'Error al registrar el trámite.' });
      setTurnstileToken('');
    } finally { setLoading(false); }
  };

  // ── Reset ──────────────────────────────────────────────────
  const resetForm = () => {
    setPaso(1); setTipoSeleccionado(null);
    setTipoRegistrado(null); setTurnstileToken('');
    setRequisitos([]); setEstadosReq({});
    setExpedienteId(0); setForm(FORM_INICIAL);
  };

  return {
    // Pasos
    paso, setPaso,
    // Tipos de trámite
    tipos, tipoSeleccionado, handleSeleccionarTramite, handleContinuar,
    // Formulario
    form, setF, buscandoDni, buscarDni,
    // Turnstile
    turnstileToken, setTurnstileToken,
    handleTurnstileExpire, handleTurnstileError,
    // Requisitos
    requisitos, estadosReq, handleArchivoReq, handleSubirReq,
    // Registro
    loading, handleRegistrar, handleAtras,
    // Pago
    codigoGenerado, tipoRegistrado, resetForm,
  };
}