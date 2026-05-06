// src/hooks/useAreas.ts
// Hook que centraliza toda la lógica del módulo de Áreas.
// Actualizado: Soporte para firma técnica (conformidad) y firma de resolución.

import { useEffect, useState, useRef, useCallback } from 'react';
import api                 from '../services/api';
import { areasService }     from '../services/areas.service';
import { documentosService }from '../services/documentos.service';
import { useAuth }          from '../context/AuthContext';
import { toast }            from '../utils/toast';
import type { EstadoExpediente, Movimiento } from '../types';

// ── Tipos ────────────────────────────────────────────────────
export interface ExpedienteBandeja {
  id:             number;
  codigo:         string;
  estado:         EstadoExpediente;
  fecha_registro: string;
  fecha_limite:   string;
  ciudadano:      { dni: string; nombres: string; apellido_pat: string };
  tipoTramite:    { nombre: string; plazo_dias: number };
}

export interface Documento {
  id: number; nombre: string; url: string; tipo_mime: string; uploaded_at: string;
}

export interface DetalleExpediente extends ExpedienteBandeja {
  areaActual:               { nombre: string; sigla: string } | null;
  fecha_resolucion:         string | null;
  url_pdf_firmado:          string | null;
  codigo_verificacion_firma: string | null;
  pagos:       { boleta: string; monto_cobrado: number; fecha_pago: string }[];
  movimientos: Movimiento[];
  documentos:  Documento[];
}

// Dimensiones del visor de firma
export const VISOR_W    = 480;
export const VISOR_H    = 620;
export const PDF_W      = 595;
export const PDF_H      = 842;
export const ESCALA_X   = VISOR_W / PDF_W;
export const ESCALA_Y   = VISOR_H / PDF_H;
export const FIRMA_PX_W = Math.round(150 * ESCALA_X);
export const FIRMA_PX_H = Math.round(60  * ESCALA_Y);

// ── Hook ─────────────────────────────────────────────────────
export function useAreas() {
  const { usuario } = useAuth();
  const rol    = usuario?.rol?.nombre;
  const esJefe = rol === 'JEFE_AREA';

  const [bandeja,  setBandeja]  = useState<ExpedienteBandeja[]>([]);
  const [cargando, setCargando] = useState(true);
  const [loading,  setLoading]  = useState(false);

  // Detalle
  const [modalDetalle, setModalDetalle] = useState(false);
  const [detalle,      setDetalle]      = useState<DetalleExpediente | null>(null);
  const [cargandoDet,  setCargandoDet]  = useState(false);
  const [loadingUnif,  setLoadingUnif]  = useState(false);

  // Vista previa
  const [modalPreview, setModalPreview] = useState(false);
  const [previewDoc,   setPreviewDoc]   = useState<Documento | null>(null);

  // Observar / Rechazar
  const [modalObservar, setModalObservar] = useState(false);
  const [modalRechazar, setModalRechazar] = useState(false);
  const [comentario,    setComentario]    = useState('');
  const [expAccion,     setExpAccion]     = useState<ExpedienteBandeja | null>(null);

  // Adjuntar
  const [modalAdjuntar,  setModalAdjuntar]  = useState(false);
  const [expAdjuntar,    setExpAdjuntar]    = useState<ExpedienteBandeja | null>(null);
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);
  const [loadingAdjunto, setLoadingAdjunto] = useState(false);

  // Firma (General / Jefe)
  const [modalFirma,       setModalFirma]       = useState(false);
  const [modalFirmaTecnico, setModalFirmaTecnico] = useState(false); // NUEVO: Modal para técnico
  const [expFirma,         setExpFirma]         = useState<ExpedienteBandeja | null>(null);
  const [loadingPdfFirma, setLoadingPdfFirma] = useState(false);
  const [urlPdfFirma,     setUrlPdfFirma]     = useState('');
  const [loadingCodigo,   setLoadingCodigo]   = useState(false);
  const [codigoEnviado,   setCodigoEnviado]   = useState(false);
  const [codigoInput,     setCodigoInput]     = useState('');
  const [loadingFirmar,   setLoadingFirmar]   = useState(false);
  const [paginaFirma,     setPaginaFirma]     = useState(1);
  const [emailJefe,       setEmailJefe]       = useState('');
  const [urlFirmaPreview, setUrlFirmaPreview] = useState('');
  const [tieneFirma,      setTieneFirma]      = useState(false);
  const [firmaPos,        setFirmaPos]        = useState({
    x: VISOR_W - FIRMA_PX_W - 16,
    y: VISOR_H - FIRMA_PX_H - 16,
  });

  // Drag refs
  const visorRef   = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart  = useRef({ mouseX: 0, mouseY: 0, boxX: 0, boxY: 0 });

  // Subir firma
  const [modalSubirFirma,    setModalSubirFirma]    = useState(false);
  const [archivoFirma,        setArchivoFirma]       = useState<File | null>(null);
  const [loadingSubirFirma,  setLoadingSubirFirma]  = useState(false);
  const [previewFirmaLocal,  setPreviewFirmaLocal]  = useState('');
  const [emailEditable,      setEmailEditable]      = useState('');
  const [loadingEmail,       setLoadingEmail]       = useState(false);

  // Confirms
  const [confirmTomar,     setConfirmTomar]     = useState<ExpedienteBandeja | null>(null);
  const [confirmVisto,     setConfirmVisto]     = useState<ExpedienteBandeja | null>(null);
  const [confirmArchivar,  setConfirmArchivar]  = useState<ExpedienteBandeja | null>(null);
  const [confirmReactivar, setConfirmReactivar] = useState<ExpedienteBandeja | null>(null);

  // ── Carga ──────────────────────────────────────────────────
  const cargarBandeja = async () => {
    setCargando(true);
    try { setBandeja(await areasService.bandeja()); }
    catch { toast.error({ titulo: 'Error al cargar la bandeja.' }); }
    finally { setCargando(false); }
  };

  // CAMBIO 2: verificarPerfil ahora corre para Jefe y Técnico
  const verificarPerfil = async () => {
    if (!usuario) return;
    try {
      const res = await api.get('/usuarios/mi-perfil');
      setTieneFirma(!!res.data.url_firma_png);
      setEmailJefe(res.data.email ?? '');
      setEmailEditable(res.data.email ?? '');
      setUrlFirmaPreview(res.data.url_firma_png ?? '');
    } catch { /* silencioso */ }
  };

  useEffect(() => { cargarBandeja(); verificarPerfil(); }, [usuario]);

  // ── Drag ───────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current  = { mouseX: e.clientX, mouseY: e.clientY, boxX: firmaPos.x, boxY: firmaPos.y };
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;
    const nx = Math.max(0, Math.min(dragStart.current.boxX + dx, VISOR_W - FIRMA_PX_W));
    const ny = Math.max(0, Math.min(dragStart.current.boxY + dy, VISOR_H - FIRMA_PX_H));
    setFirmaPos({ x: nx, y: ny });
  }, []);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const toPdfCoords = () => ({
    x: Math.round(firmaPos.x / ESCALA_X),
    y: Math.round((VISOR_H - firmaPos.y - FIRMA_PX_H) / ESCALA_Y),
  });

  // ── Acciones bandeja ───────────────────────────────────────
  const verDetalle = async (id: number) => {
    setModalDetalle(true); setCargandoDet(true);
    try {
      const det = await areasService.detalle(id);
      setDetalle({ ...det, documentos: det.documentos ?? [] });
    } catch { toast.error({ titulo: 'Error al cargar el detalle.' }); }
    finally { setCargandoDet(false); }
  };

  const cerrarDetalle = () => { setModalDetalle(false); setDetalle(null); };

  const descargarUnificado = async (id: number, codigo: string) => {
    setLoadingUnif(true);
    try {
      const res  = await api.get(`/areas/expediente/${id}/pdf-unificado`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href  = url; link.setAttribute('download', `expediente-unificado-${codigo}.pdf`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      toast.success({ titulo: 'PDF unificado descargado' });
    } catch { toast.error({ titulo: 'Error al generar el PDF.' }); }
    finally { setLoadingUnif(false); }
  };

  const abrirPreview  = (doc: Documento) => { setPreviewDoc(doc); setModalPreview(true); };
  const cerrarPreview = () => { setModalPreview(false); setPreviewDoc(null); };

  const handleTomar = async (exp: ExpedienteBandeja) => {
    setLoading(true);
    try { await areasService.tomar(exp.id); toast.success({ titulo: 'Expediente tomado' }); setConfirmTomar(null); cargarBandeja(); }
    catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); }
    finally { setLoading(false); }
  };

  const handleVistoBueno = async (exp: ExpedienteBandeja) => {
    setLoading(true);
    try { await areasService.vistoBueno(exp.id); toast.success({ titulo: 'Visto bueno otorgado' }); setConfirmVisto(null); cargarBandeja(); }
    catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); }
    finally { setLoading(false); }
  };

  const handleReactivar = async (exp: ExpedienteBandeja) => {
    setLoading(true);
    try { await areasService.reactivar(exp.id); toast.success({ titulo: 'Reactivado' }); setConfirmReactivar(null); cargarBandeja(); }
    catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); }
    finally { setLoading(false); }
  };

  const handleArchivar = async (exp: ExpedienteBandeja) => {
    setLoading(true);
    try { await areasService.archivar(exp.id); toast.success({ titulo: 'Archivado' }); setConfirmArchivar(null); cargarBandeja(); }
    catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); }
    finally { setLoading(false); }
  };

  const handleObservar = async () => {
    if (!expAccion || !comentario.trim()) return;
    setLoading(true);
    try { await areasService.observar(expAccion.id, comentario.trim()); toast.success({ titulo: 'Observado' }); setModalObservar(false); setComentario(''); cargarBandeja(); }
    catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); }
    finally { setLoading(false); }
  };

  const handleRechazar = async () => {
    if (!expAccion || !comentario.trim()) return;
    setLoading(true);
    try { await areasService.rechazar(expAccion.id, comentario.trim()); toast.success({ titulo: 'Rechazado' }); setModalRechazar(false); setComentario(''); cargarBandeja(); }
    catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); }
    finally { setLoading(false); }
  };

  const handleAdjuntar = async () => {
    if (!expAdjuntar || !archivoAdjunto) return;
    setLoadingAdjunto(true);
    try { await documentosService.subirDocumento(expAdjuntar.id, archivoAdjunto); toast.success({ titulo: 'Adjuntado' }); setModalAdjuntar(false); setArchivoAdjunto(null); }
    catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); }
    finally { setLoadingAdjunto(false); }
  };

  const abrirModalFirma = async (exp: ExpedienteBandeja) => {
    if (!tieneFirma) {
      toast.warning({ titulo: 'Debes subir tu firma primero', descripcion: 'Haz clic en "Mi firma" para configurarla.' });
      return;
    }
    setExpFirma(exp); setCodigoEnviado(false); setCodigoInput(''); setPaginaFirma(1);
    setFirmaPos({ x: VISOR_W - FIRMA_PX_W - 16, y: VISOR_H - FIRMA_PX_H - 16 });
    setModalFirma(true);
    setLoadingPdfFirma(true);
    try {
      // Buscar el PDF firmado por el técnico
      const det = await areasService.detalle(exp.id);
      const docFirmadoTecnico = det.documentos?.find((d: any) =>
        d.nombre?.startsWith('FIRMADO_TECNICO:')
      );

      if (docFirmadoTecnico) {
        // Usar el PDF con firma del técnico para que el Jefe vea dónde firmar
        const response = await fetch(docFirmadoTecnico.url);
        const blob     = await response.blob();
        const blobUrl  = window.URL.createObjectURL(blob);
        setUrlPdfFirma(blobUrl);
      } else {
        // Fallback: sin firma del técnico, usar PDF unificado
        const docUnificado = det.documentos?.find((d: any) =>
          d.nombre?.startsWith('PDF_UNIFICADO:')
        );
        if (docUnificado) {
          const response = await fetch(docUnificado.url);
          const blob     = await response.blob();
          const blobUrl  = window.URL.createObjectURL(blob);
          setUrlPdfFirma(blobUrl);
        } else {
          const res     = await api.get(`/areas/expediente/${exp.id}/pdf-unificado`, { responseType: 'blob' });
          const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
          setUrlPdfFirma(blobUrl);
        }
      }
    } catch { setUrlPdfFirma(''); }
    finally { setLoadingPdfFirma(false); }
  };

  const cerrarModalFirma = () => {
    if (urlPdfFirma) window.URL.revokeObjectURL(urlPdfFirma);
    setModalFirma(false); setUrlPdfFirma('');
  };

  const solicitarCodigo = async () => {
    if (!expFirma) return;
    setLoadingCodigo(true);
    try {
      const res = await api.post(`/areas/solicitar-codigo-firma/${expFirma.id}`);
      setCodigoEnviado(true);
      toast.success({ titulo: 'Código enviado', descripcion: res.data.message });
    } catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); }
    finally { setLoadingCodigo(false); }
  };

  const handleFirmar = async () => {
    if (!expFirma || !codigoInput.trim()) return;
    setLoadingFirmar(true);
    const { x, y } = toPdfCoords();
    try {
      await api.post(`/areas/firmar/${expFirma.id}`, {
        codigo: codigoInput.trim(), pagina: paginaFirma,
        posicion_x: x, posicion_y: y, ancho: 150, alto: 60,
      });
      toast.success({ titulo: '¡Expediente firmado y resuelto!' });
      cerrarModalFirma(); cargarBandeja();
    } catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error al firmar.' }); }
    finally { setLoadingFirmar(false); }
  };

  // REEMPLAZA abrirModalFirmaTecnico en useAreas.ts
// Ahora obtiene el detalle del expediente y usa el PDF_UNIFICADO guardado
// en lugar de regenerarlo desde el endpoint.

  const abrirModalFirmaTecnico = async (exp: ExpedienteBandeja) => {
    if (!tieneFirma) {
      toast.warning({ titulo: 'Debes subir tu firma primero', descripcion: 'Ve a "Mi firma" en tu perfil.' });
      return;
    }
    setExpFirma(exp);
    setPaginaFirma(1);
    setFirmaPos({ x: VISOR_W - FIRMA_PX_W - 16, y: VISOR_H - FIRMA_PX_H - 16 });
    setModalFirmaTecnico(true);
    setLoadingPdfFirma(true);
    try {
      // Obtener detalle para encontrar el PDF_UNIFICADO guardado
      const det = await areasService.detalle(exp.id);
      const docUnificado = det.documentos?.find((d: any) =>
        d.nombre?.startsWith('PDF_UNIFICADO:')
      );

      if (docUnificado) {
        // Usar el PDF unificado guardado directamente
        const response = await fetch(docUnificado.url);
        const blob     = await response.blob();
        const blobUrl  = window.URL.createObjectURL(blob);
        setUrlPdfFirma(blobUrl);
      } else {
        // Fallback: regenerar desde el endpoint
        const res     = await api.get(`/areas/expediente/${exp.id}/pdf-unificado`, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        setUrlPdfFirma(blobUrl);
      }
    } catch {
      setUrlPdfFirma('');
    } finally {
      setLoadingPdfFirma(false);
    }
  };

  const handleFirmarTecnico = async () => {
    if (!expFirma) return;
    setLoadingFirmar(true);
    const { x, y } = toPdfCoords();
    try {
      await api.post(`/areas/firmar-tecnico/${expFirma.id}`, {
        pagina: paginaFirma,
        posicion_x: x, posicion_y: y, ancho: 150, alto: 60,
      });
      toast.success({ titulo: 'Expediente firmado y enviado al Jefe.' });
      setModalFirmaTecnico(false); cargarBandeja();
    } catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error al firmar.' }); }
    finally { setLoadingFirmar(false); }
  };

  // ── Subir firma ────────────────────────────────────────────
  const handleFirmaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { toast.warning({ titulo: 'Solo PNG, JPG o WebP.' }); return; }
    if (file.size > 2 * 1024 * 1024) { toast.warning({ titulo: 'Máximo 2MB.' }); return; }
    setArchivoFirma(file);
    setPreviewFirmaLocal(URL.createObjectURL(file));
  };

  const handleSubirFirma = async () => {
    if (!archivoFirma || !usuario) return;
    setLoadingSubirFirma(true);
    try {
      const formData = new FormData();
      formData.append('firma', archivoFirma);
      const res = await api.post(`/usuarios/${usuario.id}/firma`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success({ titulo: 'Firma guardada correctamente.' });
      setTieneFirma(true); setUrlFirmaPreview(res.data.url_firma_png);
      setArchivoFirma(null); setPreviewFirmaLocal('');
    } catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); }
    finally { setLoadingSubirFirma(false); }
  };

  const handleActualizarEmail = async () => {
    if (!emailEditable.trim() || !usuario) return;
    setLoadingEmail(true);
    try {
      await api.patch(`/usuarios/${usuario.id}/email`, { email: emailEditable.trim() });
      setEmailJefe(emailEditable.trim());
      toast.success({ titulo: 'Email actualizado correctamente.' });
    } catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); }
    finally { setLoadingEmail(false); }
  };

  const nombreDoc = (n: string) => n.startsWith('REQ-') ? n.replace(/^REQ-\d+:\s*/, '') : n;

  return {
    // Auth
    usuario, esJefe,
    // Bandeja
    bandeja, cargando, loading,
    cargarBandeja,
    // Detalle
    modalDetalle, detalle, cargandoDet, loadingUnif,
    verDetalle, cerrarDetalle, descargarUnificado,
    // Preview
    modalPreview, previewDoc,
    abrirPreview, cerrarPreview,
    // Observar / Rechazar
    modalObservar, setModalObservar,
    modalRechazar, setModalRechazar,
    comentario, setComentario,
    expAccion, setExpAccion,
    handleObservar, handleRechazar,
    // Adjuntar
    modalAdjuntar, setModalAdjuntar,
    expAdjuntar, setExpAdjuntar,
    archivoAdjunto, setArchivoAdjunto,
    loadingAdjunto, handleAdjuntar,
    // Confirms
    confirmTomar,     setConfirmTomar,
    confirmVisto,     setConfirmVisto,
    confirmArchivar,  setConfirmArchivar,
    confirmReactivar, setConfirmReactivar,
    handleTomar, handleVistoBueno, handleReactivar, handleArchivar,
    // Firma Jefe
    modalFirma, expFirma, loadingPdfFirma, urlPdfFirma,
    loadingCodigo, codigoEnviado, setCodigoEnviado,
    codigoInput, setCodigoInput,
    loadingFirmar, paginaFirma, setPaginaFirma,
    emailJefe, urlFirmaPreview, tieneFirma,
    firmaPos, visorRef, onMouseDown,
    abrirModalFirma, cerrarModalFirma,
    solicitarCodigo, handleFirmar,
    // Firma Técnico (NUEVO)
    modalFirmaTecnico, setModalFirmaTecnico,
    abrirModalFirmaTecnico, handleFirmarTecnico,
    // Subir firma
    modalSubirFirma, setModalSubirFirma,
    archivoFirma, setArchivoFirma,
    loadingSubirFirma, previewFirmaLocal, setPreviewFirmaLocal,
    emailEditable, setEmailEditable,
    loadingEmail,
    handleFirmaChange, handleSubirFirma, handleActualizarEmail,
    // Utils
    nombreDoc,
    VISOR_W, VISOR_H, FIRMA_PX_W, FIRMA_PX_H,
  };
}