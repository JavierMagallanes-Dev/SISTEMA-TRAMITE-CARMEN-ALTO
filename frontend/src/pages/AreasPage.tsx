// src/pages/AreasPage.tsx
// Técnico y Jefe de Área.
// MEJORADO: drag corregido + PDF real como fondo + email actualizable.

import { useEffect, useState, useRef, useCallback } from 'react';
import api                             from '../services/api';
import { areasService }                from '../services/areas.service';
import { documentosService }           from '../services/documentos.service';
import { useAuth }                     from '../context/AuthContext';
import { Card, CardTitle }             from '../components/ui/Card';
import Button                          from '../components/ui/Button';
import Modal                           from '../components/ui/Modal';
import Alert                           from '../components/ui/Alert';
import Spinner                         from '../components/ui/Spinner';
import Input                           from '../components/ui/Input';
import EstadoBadge                     from '../components/shared/EstadoBadge';
import TimelineMovimientos             from '../components/shared/TimelineMovimientos';
import ConfirmModal                    from '../components/shared/ConfirmModal';
import { toast }                       from '../utils/toast';
import { formatFecha, diasRestantes, colorDiasRestantes } from '../utils/formato';
import type { EstadoExpediente, Movimiento } from '../types';
import {
  RefreshCw, Eye, Play, AlertCircle,
  XCircle, CheckCircle, Archive,
  Clock, FileText, Download, X, Paperclip,
  PenLine, Package, ZoomIn, Upload, ShieldCheck,
  ImagePlus, Mail, Save,
} from 'lucide-react';

interface ExpedienteBandeja {
  id:             number;
  codigo:         string;
  estado:         EstadoExpediente;
  fecha_registro: string;
  fecha_limite:   string;
  ciudadano:      { dni: string; nombres: string; apellido_pat: string };
  tipoTramite:    { nombre: string; plazo_dias: number };
}

interface Documento {
  id: number; nombre: string; url: string; tipo_mime: string; uploaded_at: string;
}

interface DetalleExpediente extends ExpedienteBandeja {
  areaActual:               { nombre: string; sigla: string } | null;
  fecha_resolucion:         string | null;
  url_pdf_firmado:          string | null;
  codigo_verificacion_firma: string | null;
  pagos:       { boleta: string; monto_cobrado: number; fecha_pago: string }[];
  movimientos: Movimiento[];
  documentos:  Documento[];
}

// Dimensiones del visor de firma (proporcional A4 visible)
const VISOR_W  = 480;
const VISOR_H  = 620;
const PDF_W    = 595; // puntos PDF
const PDF_H    = 842;
const ESCALA_X = VISOR_W / PDF_W;
const ESCALA_Y = VISOR_H / PDF_H;
const FIRMA_PX_W = Math.round(150 * ESCALA_X); // ~121px
const FIRMA_PX_H = Math.round(60  * ESCALA_Y); // ~44px

export default function AreasPage() {
  const { usuario } = useAuth();
  const rol    = usuario?.rol?.nombre;
  const esJefe = rol === 'JEFE_AREA';

  const [bandeja,  setBandeja]  = useState<ExpedienteBandeja[]>([]);
  const [cargando, setCargando] = useState(true);
  const [loading,  setLoading]  = useState(false);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [detalle,      setDetalle]      = useState<DetalleExpediente | null>(null);
  const [cargandoDet,  setCargandoDet]  = useState(false);
  const [loadingUnif,  setLoadingUnif]  = useState(false);

  const [modalPreview, setModalPreview] = useState(false);
  const [previewDoc,   setPreviewDoc]   = useState<Documento | null>(null);

  const [modalObservar, setModalObservar] = useState(false);
  const [modalRechazar, setModalRechazar] = useState(false);
  const [comentario,    setComentario]    = useState('');
  const [expAccion,     setExpAccion]     = useState<ExpedienteBandeja | null>(null);

  const [modalAdjuntar,  setModalAdjuntar]  = useState(false);
  const [expAdjuntar,    setExpAdjuntar]    = useState<ExpedienteBandeja | null>(null);
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);
  const [loadingAdjunto, setLoadingAdjunto] = useState(false);
  const adjuntoRef = useRef<HTMLInputElement>(null);

  // ── Estado modal firma ──────────────────────────────────────
  const [modalFirma,      setModalFirma]      = useState(false);
  const [expFirma,        setExpFirma]        = useState<ExpedienteBandeja | null>(null);
  const [loadingPdfFirma, setLoadingPdfFirma] = useState(false);
  const [urlPdfFirma,     setUrlPdfFirma]     = useState(''); // URL del PDF unificado
  const [loadingCodigo,   setLoadingCodigo]   = useState(false);
  const [codigoEnviado,   setCodigoEnviado]   = useState(false);
  const [codigoInput,     setCodigoInput]     = useState('');
  const [loadingFirmar,   setLoadingFirmar]   = useState(false);
  const [paginaFirma,     setPaginaFirma]     = useState(1);
  const [emailJefe,       setEmailJefe]       = useState('');
  const [urlFirmaPreview, setUrlFirmaPreview] = useState('');
  const [tieneFirma,      setTieneFirma]      = useState(false);

  // Posición del recuadro (en píxeles del visor)
  const [firmaPos, setFirmaPos] = useState({ x: VISOR_W - FIRMA_PX_W - 16, y: VISOR_H - FIRMA_PX_H - 16 });

  // Refs para drag
  const visorRef    = useRef<HTMLDivElement>(null);
  const isDragging  = useRef(false);
  const dragStart   = useRef({ mouseX: 0, mouseY: 0, boxX: 0, boxY: 0 });

  // ── Estado modal Mi firma ───────────────────────────────────
  const [modalSubirFirma,    setModalSubirFirma]    = useState(false);
  const [archivoFirma,       setArchivoFirma]       = useState<File | null>(null);
  const [loadingSubirFirma,  setLoadingSubirFirma]  = useState(false);
  const [previewFirmaLocal,  setPreviewFirmaLocal]  = useState('');
  const [emailEditable,      setEmailEditable]      = useState('');
  const [loadingEmail,       setLoadingEmail]       = useState(false);
  const firmaRef = useRef<HTMLInputElement>(null);

  const [confirmTomar,     setConfirmTomar]     = useState<ExpedienteBandeja | null>(null);
  const [confirmVisto,     setConfirmVisto]     = useState<ExpedienteBandeja | null>(null);
  const [confirmArchivar,  setConfirmArchivar]  = useState<ExpedienteBandeja | null>(null);
  const [confirmReactivar, setConfirmReactivar] = useState<ExpedienteBandeja | null>(null);

  const cargarBandeja = async () => {
    setCargando(true);
    try { setBandeja(await areasService.bandeja()); }
    catch { toast.error({ titulo: 'Error al cargar la bandeja.' }); }
    finally { setCargando(false); }
  };

  const verificarPerfil = async () => {
    if (!esJefe) return;
    try {
      const res = await api.get('/usuarios/mi-perfil');
      setTieneFirma(!!res.data.url_firma_png);
      setEmailJefe(res.data.email ?? '');
      setEmailEditable(res.data.email ?? '');
      setUrlFirmaPreview(res.data.url_firma_png ?? '');
    } catch { /* silencioso */ }
  };

  useEffect(() => { cargarBandeja(); verificarPerfil(); }, []);

  // ── Drag handlers correctos ─────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current  = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      boxX:   firmaPos.x,
      boxY:   firmaPos.y,
    };
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

  // Convertir coordenadas visor → coordenadas PDF reales
  const toPdfCoords = () => ({
    x: Math.round(firmaPos.x / ESCALA_X),
    // PDF: Y=0 es abajo, visor: Y=0 es arriba
    y: Math.round((VISOR_H - firmaPos.y - FIRMA_PX_H) / ESCALA_Y),
  });

  const verDetalle = async (id: number) => {
    setModalDetalle(true); setCargandoDet(true);
    try {
      const det = await areasService.detalle(id);
      setDetalle({ ...det, documentos: det.documentos ?? [] });
    } catch { toast.error({ titulo: 'Error al cargar el detalle.' }); }
    finally { setCargandoDet(false); }
  };

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

  // Abrir modal firma — cargar PDF real del expediente
  const abrirModalFirma = async (exp: ExpedienteBandeja) => {
    if (!tieneFirma) {
      toast.warning({ titulo: 'Debes subir tu firma primero', descripcion: 'Haz clic en "Mi firma" para configurarla.' });
      return;
    }
    setExpFirma(exp);
    setCodigoEnviado(false); setCodigoInput(''); setPaginaFirma(1);
    setFirmaPos({ x: VISOR_W - FIRMA_PX_W - 16, y: VISOR_H - FIRMA_PX_H - 16 });
    setModalFirma(true);

    // Cargar el PDF unificado del expediente como blob URL
    setLoadingPdfFirma(true);
    try {
      const res    = await api.get(`/areas/expediente/${exp.id}/pdf-unificado`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      setUrlPdfFirma(blobUrl);
    } catch {
      setUrlPdfFirma(''); // Si falla, muestra fondo vacío
    } finally {
      setLoadingPdfFirma(false);
    }
  };

  const solicitarCodigo = async () => {
    if (!expFirma) return;
    setLoadingCodigo(true);
    try {
      const res = await api.post(`/areas/solicitar-codigo-firma/${expFirma.id}`);
      setCodigoEnviado(true);
      toast.success({ titulo: 'Código enviado', descripcion: res.data.message });
    } catch (err: any) { toast.error({ titulo: err?.response?.data?.error ?? 'Error al enviar.' }); }
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
      toast.success({ titulo: '¡Expediente firmado y resuelto!', descripcion: `${expFirma.codigo} resuelto.` });
      // Limpiar blob URL
      if (urlPdfFirma) window.URL.revokeObjectURL(urlPdfFirma);
      setModalFirma(false); setUrlPdfFirma(''); cargarBandeja();
    } catch (err: any) { toast.error({ titulo: err?.response?.data?.error ?? 'Error al firmar.' }); }
    finally { setLoadingFirmar(false); }
  };

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
      const res = await api.post(`/usuarios/${usuario.id}/firma`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success({ titulo: 'Firma guardada correctamente.' });
      setTieneFirma(true); setUrlFirmaPreview(res.data.url_firma_png);
      setArchivoFirma(null); setPreviewFirmaLocal('');
    } catch (err: any) { toast.error({ titulo: err?.response?.data?.error ?? 'Error.' }); }
    finally { setLoadingSubirFirma(false); }
  };

  const handleActualizarEmail = async () => {
    if (!emailEditable.trim() || !usuario) return;
    setLoadingEmail(true);
    try {
      await api.patch(`/usuarios/${usuario.id}/email`, { email: emailEditable.trim() });
      setEmailJefe(emailEditable.trim());
      toast.success({ titulo: 'Email actualizado correctamente.' });
    } catch (err: any) { toast.error({ titulo: err?.response?.data?.error ?? 'Error al actualizar.' }); }
    finally { setLoadingEmail(false); }
  };

  const handleTomar      = async (exp: ExpedienteBandeja) => { setLoading(true); try { await areasService.tomar(exp.id);      toast.success({ titulo: 'Expediente tomado' });    setConfirmTomar(null);     cargarBandeja(); } catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); } finally { setLoading(false); } };
  const handleVistoBueno = async (exp: ExpedienteBandeja) => { setLoading(true); try { await areasService.vistoBueno(exp.id); toast.success({ titulo: 'Visto bueno otorgado' }); setConfirmVisto(null);     cargarBandeja(); } catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); } finally { setLoading(false); } };
  const handleReactivar  = async (exp: ExpedienteBandeja) => { setLoading(true); try { await areasService.reactivar(exp.id);  toast.success({ titulo: 'Reactivado' });           setConfirmReactivar(null); cargarBandeja(); } catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); } finally { setLoading(false); } };
  const handleArchivar   = async (exp: ExpedienteBandeja) => { setLoading(true); try { await areasService.archivar(exp.id);   toast.success({ titulo: 'Archivado' });            setConfirmArchivar(null);  cargarBandeja(); } catch (e: any) { toast.error({ titulo: e?.response?.data?.error ?? 'Error.' }); } finally { setLoading(false); } };

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

  const nombreDoc = (n: string) => n.startsWith('REQ-') ? n.replace(/^REQ-\d+:\s*/, '') : n;

  if (cargando) return <Spinner text="Cargando bandeja..." />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{esJefe ? 'Bandeja Jefe de Área' : 'Bandeja Técnica'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{usuario?.area?.nombre} — {bandeja.length} expediente(s)</p>
        </div>
        <div className="flex gap-2">
          {esJefe && (
            <Button variant={tieneFirma ? 'secondary' : 'primary'} icon={<ImagePlus size={14} />} onClick={() => setModalSubirFirma(true)}>
              {tieneFirma ? 'Mi firma ✓' : 'Subir mi firma'}
            </Button>
          )}
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={cargarBandeja}>Actualizar</Button>
        </div>
      </div>

      {bandeja.length === 0 ? (
        <Card><div className="text-center py-8 text-gray-400"><FileText size={32} className="mx-auto mb-2 opacity-40" /><p className="text-sm">No hay expedientes en tu bandeja.</p></div></Card>
      ) : (
        <div className="space-y-3">
          {bandeja.map((exp) => {
            const dias = diasRestantes(exp.fecha_limite);
            return (
              <Card key={exp.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-blue-600">{exp.codigo}</span>
                      <EstadoBadge estado={exp.estado} size="sm" />
                    </div>
                    <p className="text-sm font-medium text-gray-800">{exp.tipoTramite.nombre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{exp.ciudadano.nombres} {exp.ciudadano.apellido_pat} · DNI {exp.ciudadano.dni}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock size={11} />{formatFecha(exp.fecha_registro)}</span>
                      <span className={`font-medium ${colorDiasRestantes(dias)}`}>{dias < 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d restantes`}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => verDetalle(exp.id)}>Ver</Button>
                    {!esJefe && exp.estado === 'DERIVADO'    && <Button size="sm" icon={<Play size={13} />} onClick={() => setConfirmTomar(exp)}>Tomar</Button>}
                    {!esJefe && exp.estado === 'OBSERVADO'   && <Button size="sm" icon={<CheckCircle size={13} />} onClick={() => setConfirmReactivar(exp)}>Reactivar</Button>}
                    {!esJefe && exp.estado === 'EN_PROCESO'  && (<>
                      <Button size="sm" variant="secondary" icon={<Paperclip size={13} />} onClick={() => { setExpAdjuntar(exp); setArchivoAdjunto(null); setModalAdjuntar(true); }}>Adjuntar</Button>
                      <Button size="sm" variant="secondary" icon={<AlertCircle size={13} />} onClick={() => { setExpAccion(exp); setComentario(''); setModalObservar(true); }}>Observar</Button>
                      <Button size="sm" variant="danger"    icon={<XCircle size={13} />}    onClick={() => { setExpAccion(exp); setComentario(''); setModalRechazar(true); }}>Rechazar</Button>
                      <Button size="sm"                     icon={<CheckCircle size={13} />} onClick={() => setConfirmVisto(exp)}>Enviar al Jefe</Button>
                    </>)}
                    {esJefe && exp.estado === 'EN_PROCESO'    && (<>
                      <Button size="sm" variant="secondary" icon={<Paperclip size={13} />}  onClick={() => { setExpAdjuntar(exp); setArchivoAdjunto(null); setModalAdjuntar(true); }}>Adjuntar</Button>
                      <Button size="sm"                     icon={<CheckCircle size={13} />} onClick={() => setConfirmVisto(exp)}>Visto bueno</Button>
                    </>)}
                    {esJefe && exp.estado === 'LISTO_DESCARGA' && <Button size="sm" icon={<PenLine size={13} />} onClick={() => abrirModalFirma(exp)}>Firmar expediente</Button>}
                    {esJefe && exp.estado === 'RESUELTO'       && <Button size="sm" variant="secondary" icon={<Archive size={13} />} onClick={() => setConfirmArchivar(exp)}>Archivar</Button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal detalle */}
      <Modal open={modalDetalle} onClose={() => setModalDetalle(false)} title="Detalle del expediente" size="lg">
        {cargandoDet ? <Spinner /> : detalle ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-gray-400">Código</p><p className="font-mono font-bold text-blue-600">{detalle.codigo}</p></div>
              <div><p className="text-xs text-gray-400">Estado</p><EstadoBadge estado={detalle.estado} /></div>
              <div><p className="text-xs text-gray-400">Ciudadano</p><p className="font-medium">{detalle.ciudadano.nombres} {detalle.ciudadano.apellido_pat}</p></div>
              <div><p className="text-xs text-gray-400">Trámite</p><p className="font-medium">{detalle.tipoTramite.nombre}</p></div>
              <div><p className="text-xs text-gray-400">Registrado</p><p>{formatFecha(detalle.fecha_registro)}</p></div>
              <div><p className="text-xs text-gray-400">Límite</p><p className={colorDiasRestantes(diasRestantes(detalle.fecha_limite))}>{formatFecha(detalle.fecha_limite)}</p></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <CardTitle>Documentos ({detalle.documentos?.length ?? 0})</CardTitle>
                {detalle.documentos && detalle.documentos.length > 0 && (
                  <Button size="sm" variant="primary" icon={<Package size={13} />} loading={loadingUnif} onClick={() => descargarUnificado(detalle.id, detalle.codigo)}>Descargar todo en PDF</Button>
                )}
              </div>
              {detalle.documentos && detalle.documentos.length > 0 ? (
                <div className="space-y-2">
                  {detalle.documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                      <FileText size={16} className="text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-700 truncate">{nombreDoc(doc.nombre)}</p><p className="text-xs text-gray-400">{formatFecha(doc.uploaded_at)}</p></div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => { setPreviewDoc(doc); setModalPreview(true); }} className="flex items-center gap-1 text-xs text-indigo-600 font-medium px-3 py-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                          <ZoomIn size={13} />Vista previa
                        </button>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                          <Download size={13} />Descargar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400 mt-2 bg-gray-50 rounded-lg p-3 text-center">No hay documentos adjuntos.</p>}
            </div>
            {detalle.url_pdf_firmado && (
              <div className="bg-green-50 rounded-lg p-3">
                <a href={detalle.url_pdf_firmado} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 flex items-center gap-1"><Download size={13} />Descargar PDF firmado →</a>
              </div>
            )}
            <div><CardTitle>Historial</CardTitle><div className="mt-3"><TimelineMovimientos movimientos={detalle.movimientos} /></div></div>
          </div>
        ) : null}
      </Modal>

      {/* Modal vista previa */}
      <Modal open={modalPreview} onClose={() => { setModalPreview(false); setPreviewDoc(null); }} title={previewDoc ? nombreDoc(previewDoc.nombre) : 'Vista previa'} size="lg">
        {previewDoc && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg"><Download size={14} />Descargar</a>
            </div>
            <div className="w-full rounded-lg overflow-hidden border border-gray-200" style={{ height: '65vh' }}>
              <iframe src={`${previewDoc.url}#toolbar=1&navpanes=0`} className="w-full h-full" title={nombreDoc(previewDoc.nombre)} />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal adjuntar */}
      <Modal open={modalAdjuntar} onClose={() => { setModalAdjuntar(false); setArchivoAdjunto(null); }} title="Adjuntar documento" size="sm"
        footer={<><Button variant="secondary" onClick={() => { setModalAdjuntar(false); setArchivoAdjunto(null); }}>Cancelar</Button><Button variant="primary" loading={loadingAdjunto} icon={<Paperclip size={14} />} onClick={handleAdjuntar} disabled={!archivoAdjunto}>Adjuntar</Button></>}>
        <div className="space-y-4">
          {archivoAdjunto ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <FileText size={16} className="text-green-600 shrink-0" />
              <p className="text-sm font-medium text-green-700 flex-1 truncate">{archivoAdjunto.name}</p>
              <button onClick={() => { setArchivoAdjunto(null); if (adjuntoRef.current) adjuntoRef.current.value = ''; }} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
            </div>
          ) : (
            <div onClick={() => adjuntoRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50">
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Haz clic para seleccionar un PDF</p>
            </div>
          )}
          <input ref={adjuntoRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setArchivoAdjunto(f); }} />
        </div>
      </Modal>

      {/* Modal observar */}
      <Modal open={modalObservar} onClose={() => setModalObservar(false)} title="Registrar observación" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalObservar(false)}>Cancelar</Button><Button variant="primary" loading={loading} onClick={handleObservar} disabled={!comentario.trim()}>Registrar</Button></>}>
        <Input label="Detalle" placeholder="Qué falta o qué debe corregirse..." value={comentario} onChange={(e) => setComentario(e.target.value)} required autoFocus />
      </Modal>

      {/* Modal rechazar */}
      <Modal open={modalRechazar} onClose={() => setModalRechazar(false)} title="Rechazar expediente" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalRechazar(false)}>Cancelar</Button><Button variant="danger" loading={loading} onClick={handleRechazar} disabled={!comentario.trim()}>Rechazar</Button></>}>
        <Input label="Motivo" placeholder="Describe el motivo..." value={comentario} onChange={(e) => setComentario(e.target.value)} required autoFocus />
      </Modal>

      {/* ── Modal firma con PDF real como fondo ── */}
      <Modal open={modalFirma} onClose={() => { setModalFirma(false); if (urlPdfFirma) window.URL.revokeObjectURL(urlPdfFirma); setUrlPdfFirma(''); }} title="Firmar expediente digitalmente" size="lg">
        {expFirma && (
          <div className="space-y-4">
            {/* Info expediente + email */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="bg-blue-50 rounded-lg px-4 py-2 flex-1">
                <p className="font-mono text-sm font-semibold text-blue-600">{expFirma.codigo}</p>
                <p className="text-xs text-gray-500">{expFirma.tipoTramite.nombre}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                <Mail size={14} className="text-blue-500 shrink-0" />
                <span className="text-xs">Código se enviará a: <strong>{emailJefe}</strong></span>
              </div>
            </div>

            {/* Página */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 shrink-0">Página donde firmar:</label>
              <input type="number" min={1} value={paginaFirma}
                onChange={(e) => setPaginaFirma(Math.max(1, Number(e.target.value)))}
                className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
              <p className="text-xs text-gray-400">Arrastra el recuadro azul sobre el PDF a la posición deseada</p>
            </div>

            {/* Visor PDF con recuadro arrastrable */}
            <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-100 mx-auto"
              style={{ width: VISOR_W, height: VISOR_H }}>

              {/* PDF real del expediente */}
              {loadingPdfFirma ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner text="Cargando PDF del expediente..." />
                </div>
              ) : urlPdfFirma ? (
                <iframe
                  src={`${urlPdfFirma}#page=${paginaFirma}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  className="absolute inset-0 w-full h-full border-none"
                  title="PDF del expediente"
                />
              ) : (
                <div className="absolute inset-0 bg-white flex items-center justify-center">
                  <p className="text-sm text-gray-400">No se pudo cargar el PDF</p>
                </div>
              )}

              {/* Capa transparente sobre el iframe para capturar eventos de mouse */}
              <div
                ref={visorRef}
                className="absolute inset-0"
                style={{ zIndex: 10, cursor: 'default', pointerEvents: 'none' }}
              />

              {/* Recuadro arrastrable de la firma */}
              <div
                onMouseDown={onMouseDown}
                className="absolute border-2 border-blue-500 rounded-lg shadow-lg cursor-grab active:cursor-grabbing select-none"
                style={{
                  left:            firmaPos.x,
                  top:             firmaPos.y,
                  width:           FIRMA_PX_W,
                  height:          FIRMA_PX_H,
                  zIndex:          20,
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  backdropFilter:  'blur(2px)',
                }}>
                {urlFirmaPreview ? (
                  <img src={urlFirmaPreview} alt="Tu firma" className="w-full h-full object-contain p-1" draggable={false} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs text-blue-600 font-medium">Tu firma</span>
                  </div>
                )}
                {/* Indicador de arrastre */}
                <div className="absolute -top-5 left-0 right-0 text-center">
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
                    ☰ Arrastra aquí
                  </span>
                </div>
              </div>
            </div>

            {/* Paso 1 o Paso 2 */}
            {!codigoEnviado ? (
              <div className="space-y-3">
                <Alert type="info" message="Cuando hayas posicionado tu firma, solicita el código de aprobación." />
                <Button variant="primary" icon={<ShieldCheck size={14} />} loading={loadingCodigo} onClick={solicitarCodigo} className="w-full justify-center">
                  Enviar código de aprobación a mi email
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Alert type="info" message={`Código enviado a ${emailJefe}. Tendrás 10 minutos para ingresarlo.`} />
                <Input label="Código de aprobación (6 dígitos)" placeholder="000000" value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6} autoFocus />
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setCodigoEnviado(false)} className="flex-1 justify-center">Reenviar código</Button>
                  <Button variant="primary" icon={<PenLine size={14} />} loading={loadingFirmar}
                    disabled={codigoInput.length !== 6} onClick={handleFirmar} className="flex-1 justify-center">
                    Firmar y resolver expediente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal Mi firma ── */}
      <Modal open={modalSubirFirma} onClose={() => { setModalSubirFirma(false); setArchivoFirma(null); setPreviewFirmaLocal(''); }}
        title="Mi firma digital" size="sm">
        <div className="space-y-4">

          {/* Email actualizable */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Mail size={14} className="text-blue-500" />
              Email para recibir el código de firma
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                value={emailEditable}
                onChange={(e) => setEmailEditable(e.target.value)}
                placeholder="tu@correo.com"
              />
              <Button
                size="sm"
                variant="secondary"
                icon={<Save size={13} />}
                loading={loadingEmail}
                disabled={emailEditable === emailJefe || !emailEditable.trim()}
                onClick={handleActualizarEmail}>
                Guardar
              </Button>
            </div>
            {emailEditable !== emailJefe && (
              <p className="text-xs text-amber-600">Email modificado — haz clic en Guardar para confirmar</p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <Alert type="info" message="Sube una imagen de tu firma manuscrita en fondo blanco. PNG o JPG con fondo transparente es ideal." />
          </div>

          {/* Preview firma actual */}
          {urlFirmaPreview && !previewFirmaLocal && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-center">
              <p className="text-xs text-gray-400 mb-2">Firma actual</p>
              <img src={urlFirmaPreview} alt="Firma actual" className="max-h-16 mx-auto object-contain" />
            </div>
          )}

          {previewFirmaLocal ? (
            <div className="space-y-3">
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
                <p className="text-xs text-gray-400 mb-2">Nueva firma</p>
                <img src={previewFirmaLocal} alt="Nueva firma" className="max-h-20 mx-auto object-contain" />
              </div>
              <button onClick={() => { setArchivoFirma(null); setPreviewFirmaLocal(''); if (firmaRef.current) firmaRef.current.value = ''; }}
                className="text-sm text-red-500 flex items-center gap-1 mx-auto"><X size={14} />Cambiar imagen</button>
            </div>
          ) : (
            <div onClick={() => firmaRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <ImagePlus size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 font-medium">{urlFirmaPreview ? 'Cambiar imagen de firma' : 'Haz clic para seleccionar tu firma'}</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG o WebP · Máximo 2MB</p>
            </div>
          )}
          <input ref={firmaRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFirmaChange} />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setModalSubirFirma(false); setArchivoFirma(null); setPreviewFirmaLocal(''); }} className="flex-1 justify-center">Cerrar</Button>
            {archivoFirma && (
              <Button variant="primary" icon={<Upload size={14} />} loading={loadingSubirFirma} onClick={handleSubirFirma} className="flex-1 justify-center">Guardar firma</Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Confirms */}
      <ConfirmModal open={!!confirmTomar}     onClose={() => setConfirmTomar(null)}     onConfirm={() => confirmTomar     && handleTomar(confirmTomar)}        title="Tomar expediente"    message={`¿Tomar ${confirmTomar?.codigo}?`}     confirmText="Tomar"           loading={loading} />
      <ConfirmModal open={!!confirmVisto}     onClose={() => setConfirmVisto(null)}     onConfirm={() => confirmVisto     && handleVistoBueno(confirmVisto)}   title="Dar visto bueno"     message={`¿Visto bueno para ${confirmVisto?.codigo}?`} confirmText="Dar visto bueno" loading={loading} />
      <ConfirmModal open={!!confirmArchivar}  onClose={() => setConfirmArchivar(null)}  onConfirm={() => confirmArchivar  && handleArchivar(confirmArchivar)}  title="Archivar expediente"  message={`¿Archivar ${confirmArchivar?.codigo}?`}  confirmText="Archivar"        loading={loading} danger />
      <ConfirmModal open={!!confirmReactivar} onClose={() => setConfirmReactivar(null)} onConfirm={() => confirmReactivar && handleReactivar(confirmReactivar)} title="Reactivar expediente" message={`¿Reactivar ${confirmReactivar?.codigo}?`} confirmText="Reactivar"       loading={loading} />
    </div>
  );
}