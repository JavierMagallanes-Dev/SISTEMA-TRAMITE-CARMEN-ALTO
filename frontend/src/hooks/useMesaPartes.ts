// src/hooks/useMesaPartes.ts
// Hook que centraliza toda la lógica de Mesa de Partes.
// Las páginas y componentes solo consumen este hook.

import { useEffect, useState, useRef } from 'react';
import api                   from '../services/api';
import { mesaPartesService } from '../services/mesaPartes.service';
import { areasService }      from '../services/areas.service';
import { documentosService } from '../services/documentos.service';
import { toast }             from '../utils/toast';
import type { Area, EstadoExpediente, Movimiento } from '../types';

// ── Tipos ────────────────────────────────────────────────────
export interface TipoTramite {
  id: number; nombre: string; costo_soles: number; plazo_dias: number;
}

export interface Documento {
  id: number; nombre: string; url: string; tipo_mime: string; uploaded_at: string;
}

export interface ExpedienteBandeja {
  id:             number;
  codigo:         string;
  estado:         EstadoExpediente;
  fecha_registro: string;
  fecha_limite:   string;
  ciudadano:      { dni: string; nombres: string; apellido_pat: string; email: string };
  tipoTramite:    { nombre: string; costo_soles: number };
  pagos:          { boleta: string; monto_cobrado: number }[];
}

export interface DetalleExpediente {
  id: number; codigo: string; estado: EstadoExpediente;
  fecha_registro: string; fecha_limite: string; fecha_resolucion: string | null;
  ciudadano:   { dni: string; nombres: string; apellido_pat: string; apellido_mat: string; email: string; telefono: string | null };
  tipoTramite: { nombre: string; plazo_dias: number; costo_soles: number };
  areaActual:  { nombre: string; sigla: string } | null;
  pagos:       { boleta: string; monto_cobrado: number; fecha_pago: string }[];
  movimientos: Movimiento[];
  documentos:  Documento[];
}

export interface FormRegistro {
  dni: string; nombres: string; apellido_pat: string; apellido_mat: string;
  email: string; telefono: string; tipoTramiteId: string;
}

const FORM_INICIAL: FormRegistro = {
  dni: '', nombres: '', apellido_pat: '', apellido_mat: '',
  email: '', telefono: '', tipoTramiteId: '',
};

// ── Hook ─────────────────────────────────────────────────────
export function useMesaPartes() {
  const [tab,      setTab]      = useState<'bandeja' | 'registrar'>('bandeja');
  const [bandeja,  setBandeja]  = useState<ExpedienteBandeja[]>([]);
  const [tipos,    setTipos]    = useState<TipoTramite[]>([]);
  const [areas,    setAreas]    = useState<Area[]>([]);
  const [cargando, setCargando] = useState(true);

  // Registro
  const [form,        setForm]        = useState<FormRegistro>(FORM_INICIAL);
  const [archivoPdf,  setArchivoPdf]  = useState<File | null>(null);
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [loadingReg,  setLoadingReg]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detalle
  const [modalDetalle,     setModalDetalle]     = useState(false);
  const [detalle,          setDetalle]          = useState<DetalleExpediente | null>(null);
  const [cargandoDet,      setCargandoDet]      = useState(false);
  const [loadingReactivar, setLoadingReactivar] = useState(false);
  const [loadingUnificado, setLoadingUnificado] = useState(false);

  // Vista previa
  const [modalPreview, setModalPreview] = useState(false);
  const [previewDoc,   setPreviewDoc]   = useState<Documento | null>(null);

  // Observar
  const [modalObservar,   setModalObservar]   = useState(false);
  const [expObservar,     setExpObservar]     = useState<DetalleExpediente | null>(null);
  const [comentarioObs,   setComentarioObs]   = useState('');
  const [loadingObservar, setLoadingObservar] = useState(false);

  // Derivar
  const [modalDerivar,   setModalDerivar]   = useState(false);
  const [expDerivar,     setExpDerivar]     = useState<ExpedienteBandeja | null>(null);
  const [areaDestino,    setAreaDestino]    = useState('');
  const [instrucciones,  setInstrucciones]  = useState('');
  const [pinInput,       setPinInput]       = useState('');
  const [loadingDerivar, setLoadingDerivar] = useState(false);

  // ── Carga de datos ─────────────────────────────────────────
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [band, tip, ar] = await Promise.all([
        mesaPartesService.bandeja(),
        mesaPartesService.tiposTramite(),
        mesaPartesService.areas(),
      ]);
      setBandeja(band); setTipos(tip); setAreas(ar);
    } catch { toast.error({ titulo: 'Error al cargar los datos.' }); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  // ── Acciones de registro ───────────────────────────────────
  const setF = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const buscarDni = async () => {
    if (form.dni.length !== 8) return;
    setBuscandoDni(true);
    try {
      const res = await mesaPartesService.consultarDni(form.dni);
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

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.warning({ titulo: 'Solo PDFs.' }); return; }
    if (file.size > 10 * 1024 * 1024)   { toast.warning({ titulo: 'Máximo 10MB.' }); return; }
    setArchivoPdf(file);
  };

  const handleRegistrar = async () => {
    if (!form.dni || !form.nombres || !form.apellido_pat || !form.email || !form.tipoTramiteId) {
      toast.warning({ titulo: 'Completa todos los campos obligatorios.' }); return;
    }
    setLoadingReg(true);
    try {
      const res = await mesaPartesService.registrar(form as unknown as Record<string, string>);
      if (archivoPdf) {
        try { await documentosService.subirDocumento(res.expediente.id, archivoPdf); }
        catch { console.warn('No se pudo subir el PDF.'); }
      }
      toast.success({ titulo: 'Expediente registrado', descripcion: `${res.expediente.codigo} creado.` });
      setForm(FORM_INICIAL); setArchivoPdf(null); setTab('bandeja'); cargarDatos();
    } catch (err: any) { toast.error({ titulo: err?.response?.data?.error ?? 'Error.' }); }
    finally { setLoadingReg(false); }
  };

  const limpiarArchivo = () => {
    setArchivoPdf(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Acciones de detalle ────────────────────────────────────
  const verDetalle = async (id: number) => {
    setModalDetalle(true); setCargandoDet(true);
    try {
      const det = await areasService.detalle(id);
      setDetalle({ ...det, documentos: det.documentos ?? [] });
    } catch { toast.error({ titulo: 'Error al cargar el detalle.' }); }
    finally { setCargandoDet(false); }
  };

  const cerrarDetalle = () => { setModalDetalle(false); setDetalle(null); };

  const descargarCargo = (expedienteId: number, codigo: string) => {
    api.get(`/recepcion/cargo/${expedienteId}`, { responseType: 'blob' })
      .then((res) => {
        const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href  = url; link.setAttribute('download', `cargo-${codigo}.pdf`);
        document.body.appendChild(link); link.click(); link.remove();
        window.URL.revokeObjectURL(url);
      }).catch(() => toast.error({ titulo: 'Error al generar el cargo.' }));
  };

  const descargarPdfUnificado = async (expedienteId: number, codigo: string) => {
    setLoadingUnificado(true);
    try {
      const res  = await api.get(`/mesa-partes/expediente/${expedienteId}/pdf-unificado`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href  = url; link.setAttribute('download', `expediente-unificado-${codigo}.pdf`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      toast.success({ titulo: 'PDF unificado descargado' });
    } catch { toast.error({ titulo: 'Error al generar el PDF.' }); }
    finally { setLoadingUnificado(false); }
  };

  const abrirPreview = (doc: Documento) => { setPreviewDoc(doc); setModalPreview(true); };
  const cerrarPreview = () => { setModalPreview(false); setPreviewDoc(null); };

  // ── Acciones de observación ────────────────────────────────
  const abrirObservar = () => {
    if (!detalle) return;
    setExpObservar(detalle); setComentarioObs(''); setModalObservar(true);
  };

  const handleObservar = async () => {
    if (!expObservar || !comentarioObs.trim()) return;
    setLoadingObservar(true);
    try {
      await mesaPartesService.observar(expObservar.id, comentarioObs.trim());
      toast.success({ titulo: 'Expediente observado' });
      setModalObservar(false); cerrarDetalle(); setComentarioObs(''); cargarDatos();
    } catch (err: any) { toast.error({ titulo: err?.response?.data?.error ?? 'Error.' }); }
    finally { setLoadingObservar(false); }
  };

  // ── Acciones de reactivación ───────────────────────────────
  const handleReactivar = async () => {
    if (!detalle) return;
    setLoadingReactivar(true);
    try {
      await mesaPartesService.reactivar(detalle.id);
      toast.success({ titulo: 'Expediente reactivado' });
      cerrarDetalle(); cargarDatos();
    } catch (err: any) { toast.error({ titulo: err?.response?.data?.error ?? 'Error.' }); }
    finally { setLoadingReactivar(false); }
  };

  // ── Acciones de derivación ─────────────────────────────────
  const abrirDerivar = (exp: ExpedienteBandeja) => {
    setExpDerivar(exp); setAreaDestino(''); setInstrucciones(''); setPinInput('');
    setModalDerivar(true);
  };

  const cerrarDerivar = () => { setModalDerivar(false); setExpDerivar(null); };

  const handleDerivar = async () => {
    if (!expDerivar || !areaDestino || !pinInput.trim()) return;
    setLoadingDerivar(true);
    try {
      await api.post('/mesa-partes/derivar', {
        expedienteId:  expDerivar.id,
        areaDestinoId: areaDestino,
        instrucciones,
        pin:           pinInput.trim(),
      });
      toast.success({ titulo: 'Expediente derivado', descripcion: `${expDerivar.codigo} enviado al área técnica.` });
      cerrarDerivar(); cargarDatos();
    } catch (err: any) { toast.error({ titulo: err?.response?.data?.error ?? 'Error al derivar.' }); }
    finally { setLoadingDerivar(false); }
  };

  // ── Helper ─────────────────────────────────────────────────
  const nombreDoc = (nombre: string) =>
    nombre.startsWith('REQ-') ? nombre.replace(/^REQ-\d+:\s*/, '') : nombre;

  const puedeObservar = (estado: EstadoExpediente) =>
    ['RECIBIDO', 'EN_REVISION_MDP'].includes(estado);

  return {
    // Estado
    tab, setTab,
    bandeja, tipos, areas, cargando,
    form, setF, archivoPdf, setArchivoPdf, buscandoDni, loadingReg, fileInputRef,
    modalDetalle, detalle, cargandoDet, loadingReactivar, loadingUnificado,
    modalPreview, previewDoc,
    modalObservar, setModalObservar, expObservar, comentarioObs, setComentarioObs, loadingObservar,
    modalDerivar, expDerivar, areaDestino, setAreaDestino,
    instrucciones, setInstrucciones, pinInput, setPinInput, loadingDerivar,
    
    // Acciones
    cargarDatos,
    buscarDni, handleArchivoChange, handleRegistrar, limpiarArchivo,
    verDetalle, cerrarDetalle, descargarCargo, descargarPdfUnificado,
    abrirPreview, cerrarPreview,
    abrirObservar, handleObservar,
    handleReactivar,
    abrirDerivar, cerrarDerivar, handleDerivar,
    nombreDoc, puedeObservar,
  };
}
