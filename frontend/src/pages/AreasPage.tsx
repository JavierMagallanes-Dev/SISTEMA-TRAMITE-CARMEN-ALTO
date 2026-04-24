// src/pages/AreasPage.tsx

import { useEffect, useState, useRef } from 'react';
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
import { formatFecha, diasRestantes, colorDiasRestantes } from '../utils/formato';
import type { EstadoExpediente, Movimiento } from '../types';
import {
  RefreshCw, Eye, Play, AlertCircle,
  XCircle, CheckCircle, Upload, Archive,
  Clock, FileText, Download, X, Paperclip,
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
  id:          number;
  nombre:      string;
  url:         string;
  tipo_mime:   string;
  uploaded_at: string;
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

export default function AreasPage() {
  const { usuario }  = useAuth();
  const rol          = usuario?.rol?.nombre;
  const esJefe       = rol === 'JEFE_AREA';

  const [bandeja,  setBandeja]  = useState<ExpedienteBandeja[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [loading,  setLoading]  = useState(false);

  // Detalle
  const [modalDetalle, setModalDetalle] = useState(false);
  const [detalle,      setDetalle]      = useState<DetalleExpediente | null>(null);
  const [cargandoDet,  setCargandoDet]  = useState(false);

  // Modales con comentario
  const [modalObservar, setModalObservar] = useState(false);
  const [modalRechazar, setModalRechazar] = useState(false);
  const [comentario,    setComentario]    = useState('');
  const [expAccion,     setExpAccion]     = useState<ExpedienteBandeja | null>(null);

  // Modal adjuntar documento (técnico/jefe)
  const [modalAdjuntar,    setModalAdjuntar]    = useState(false);
  const [expAdjuntar,      setExpAdjuntar]      = useState<ExpedienteBandeja | null>(null);
  const [archivoAdjunto,   setArchivoAdjunto]   = useState<File | null>(null);
  const [loadingAdjunto,   setLoadingAdjunto]   = useState(false);
  const adjuntoRef                              = useRef<HTMLInputElement>(null);

  // Modal PDF firmado con archivo real
  const [modalPdf,   setModalPdf]   = useState(false);
  const [expPdf,     setExpPdf]     = useState<ExpedienteBandeja | null>(null);
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // Confirms
  const [confirmTomar,    setConfirmTomar]    = useState<ExpedienteBandeja | null>(null);
  const [confirmVisto,    setConfirmVisto]    = useState<ExpedienteBandeja | null>(null);
  const [confirmArchivar, setConfirmArchivar] = useState<ExpedienteBandeja | null>(null);

  const cargarBandeja = async () => {
    setCargando(true);
    try {
      setBandeja(await areasService.bandeja());
    } catch {
      setError('Error al cargar la bandeja.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarBandeja(); }, []);

  const verDetalle = async (id: number) => {
    setModalDetalle(true);
    setCargandoDet(true);
    try {
      const [det, docs] = await Promise.all([
        areasService.detalle(id),
        documentosService.listar(id),
      ]);
      setDetalle({ ...det, documentos: docs });
    } catch {
      setError('Error al cargar el detalle.');
    } finally {
      setCargandoDet(false);
    }
  };

  const handleTomar = async (exp: ExpedienteBandeja) => {
    setLoading(true);
    try {
      await areasService.tomar(exp.id);
      setSuccess(`Expediente ${exp.codigo} tomado para evaluación.`);
      setConfirmTomar(null);
      cargarBandeja();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al tomar.');
    } finally { setLoading(false); }
  };

  const handleObservar = async () => {
    if (!expAccion || !comentario.trim()) return;
    setLoading(true);
    try {
      await areasService.observar(expAccion.id, comentario.trim());
      setSuccess(`Expediente ${expAccion.codigo} marcado como OBSERVADO.`);
      setModalObservar(false);
      setComentario('');
      cargarBandeja();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al observar.');
    } finally { setLoading(false); }
  };

  const handleRechazar = async () => {
    if (!expAccion || !comentario.trim()) return;
    setLoading(true);
    try {
      await areasService.rechazar(expAccion.id, comentario.trim());
      setSuccess(`Expediente ${expAccion.codigo} rechazado.`);
      setModalRechazar(false);
      setComentario('');
      cargarBandeja();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al rechazar.');
    } finally { setLoading(false); }
  };

  const handleVistoBueno = async (exp: ExpedienteBandeja) => {
    setLoading(true);
    try {
      await areasService.vistoBueno(exp.id);
      setSuccess(`Visto bueno otorgado a ${exp.codigo}.`);
      setConfirmVisto(null);
      cargarBandeja();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al dar visto bueno.');
    } finally { setLoading(false); }
  };

  // ── Adjuntar documento adicional ────────────────────────────
  const handleArchivoAdjuntoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Solo se aceptan archivos PDF.'); return; }
    if (file.size > 10 * 1024 * 1024)   { setError('El archivo no puede superar 10MB.'); return; }
    setArchivoAdjunto(file);
  };

  const handleAdjuntar = async () => {
    if (!expAdjuntar || !archivoAdjunto) return;
    setLoadingAdjunto(true);
    try {
      await documentosService.subirDocumento(expAdjuntar.id, archivoAdjunto);
      setSuccess(`Documento adjuntado al expediente ${expAdjuntar.codigo}.`);
      setModalAdjuntar(false);
      setArchivoAdjunto(null);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al adjuntar el documento.');
    } finally { setLoadingAdjunto(false); }
  };

  // ── Subir PDF firmado ────────────────────────────────────────
  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Solo se aceptan archivos PDF.'); return; }
    if (file.size > 10 * 1024 * 1024)   { setError('El archivo no puede superar 10MB.'); return; }
    setArchivoPdf(file);
  };

  const handleSubirPdfFirmado = async () => {
    if (!expPdf || !archivoPdf) return;
    setLoadingPdf(true);
    try {
      const res = await documentosService.subirPdfFirmado(expPdf.id, archivoPdf);
      setSuccess(`PDF firmado subido. Código: ${res.codigo_verificacion_firma}`);
      setModalPdf(false);
      setArchivoPdf(null);
      cargarBandeja();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al subir el PDF firmado.');
    } finally { setLoadingPdf(false); }
  };

  const handleArchivar = async (exp: ExpedienteBandeja) => {
    setLoading(true);
    try {
      await areasService.archivar(exp.id);
      setSuccess(`Expediente ${exp.codigo} archivado.`);
      setConfirmArchivar(null);
      cargarBandeja();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al archivar.');
    } finally { setLoading(false); }
  };

  if (cargando) return <Spinner text="Cargando bandeja..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {esJefe ? 'Bandeja Jefe de Área' : 'Bandeja Técnica'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {usuario?.area?.nombre} — {bandeja.length} expediente(s)
          </p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={cargarBandeja}>
          Actualizar
        </Button>
      </div>

      {error   && <Alert type="error"   message={error}   onClose={() => setError('')}   />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Bandeja */}
      {bandeja.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-400">
            <FileText size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay expedientes en tu bandeja.</p>
          </div>
        </Card>
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
                    <p className="text-xs text-gray-500 mt-0.5">
                      {exp.ciudadano.nombres} {exp.ciudadano.apellido_pat} · DNI {exp.ciudadano.dni}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />{formatFecha(exp.fecha_registro)}
                      </span>
                      <span className={`font-medium ${colorDiasRestantes(dias)}`}>
                        {dias < 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d restantes`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {/* Ver detalle siempre visible */}
                    <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => verDetalle(exp.id)}>
                      Ver
                    </Button>

                    {/* Técnico: tomar */}
                    {!esJefe && exp.estado === 'DERIVADO' && (
                      <Button size="sm" icon={<Play size={13} />} onClick={() => setConfirmTomar(exp)}>
                        Tomar
                      </Button>
                    )}

                    {/* Técnico: acciones en proceso */}
                    {!esJefe && exp.estado === 'EN_PROCESO' && (
                      <>
                        <Button size="sm" variant="secondary" icon={<Paperclip size={13} />}
                          onClick={() => { setExpAdjuntar(exp); setArchivoAdjunto(null); setModalAdjuntar(true); }}>
                          Adjuntar
                        </Button>
                        <Button size="sm" variant="secondary" icon={<AlertCircle size={13} />}
                          onClick={() => { setExpAccion(exp); setComentario(''); setModalObservar(true); }}>
                          Observar
                        </Button>
                        <Button size="sm" variant="danger" icon={<XCircle size={13} />}
                          onClick={() => { setExpAccion(exp); setComentario(''); setModalRechazar(true); }}>
                          Rechazar
                        </Button>
                      </>
                    )}

                    {/* Jefe: visto bueno */}
                    {esJefe && exp.estado === 'EN_PROCESO' && (
                      <>
                        <Button size="sm" variant="secondary" icon={<Paperclip size={13} />}
                          onClick={() => { setExpAdjuntar(exp); setArchivoAdjunto(null); setModalAdjuntar(true); }}>
                          Adjuntar
                        </Button>
                        <Button size="sm" icon={<CheckCircle size={13} />} onClick={() => setConfirmVisto(exp)}>
                          Visto bueno
                        </Button>
                      </>
                    )}

                    {/* Jefe: subir PDF firmado */}
                    {esJefe && exp.estado === 'LISTO_DESCARGA' && (
                      <Button size="sm" icon={<Upload size={13} />}
                        onClick={() => { setExpPdf(exp); setArchivoPdf(null); setModalPdf(true); }}>
                        Subir PDF firmado
                      </Button>
                    )}

                    {/* Jefe: archivar */}
                    {esJefe && exp.estado === 'RESUELTO' && (
                      <Button size="sm" variant="secondary" icon={<Archive size={13} />}
                        onClick={() => setConfirmArchivar(exp)}>
                        Archivar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Modal detalle + documentos ─────────────────────── */}
      <Modal open={modalDetalle} onClose={() => setModalDetalle(false)} title="Detalle del expediente" size="lg">
        {cargandoDet ? <Spinner /> : detalle ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-gray-400">Código</p><p className="font-mono font-bold text-blue-600">{detalle.codigo}</p></div>
              <div><p className="text-xs text-gray-400">Estado</p><EstadoBadge estado={detalle.estado} /></div>
              <div>
                <p className="text-xs text-gray-400">Ciudadano</p>
                <p className="font-medium">{detalle.ciudadano.nombres} {detalle.ciudadano.apellido_pat}</p>
                <p className="text-xs text-gray-500">DNI: {detalle.ciudadano.dni}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Trámite</p>
                <p className="font-medium">{detalle.tipoTramite.nombre}</p>
                <p className="text-xs text-gray-500">{detalle.tipoTramite.plazo_dias} días de plazo</p>
              </div>
              <div><p className="text-xs text-gray-400">Registrado</p><p>{formatFecha(detalle.fecha_registro)}</p></div>
              <div>
                <p className="text-xs text-gray-400">Límite</p>
                <p className={colorDiasRestantes(diasRestantes(detalle.fecha_limite))}>
                  {formatFecha(detalle.fecha_limite)}
                </p>
              </div>
            </div>

            {/* Todos los documentos adjuntos */}
            <div>
              <CardTitle>Documentos adjuntos ({detalle.documentos?.length ?? 0})</CardTitle>
              {detalle.documentos && detalle.documentos.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {detalle.documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <FileText size={16} className="text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{doc.nombre}</p>
                        <p className="text-xs text-gray-400">{formatFecha(doc.uploaded_at)}</p>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 bg-blue-50 rounded-lg">
                        <Download size={13} />
                        Descargar
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2 bg-gray-50 rounded-lg p-3 text-center">
                  No hay documentos adjuntos.
                </p>
              )}
            </div>

            {/* PDF firmado */}
            {detalle.url_pdf_firmado && (
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">PDF firmado digitalmente con FirmaPeru</p>
                <a href={detalle.url_pdf_firmado} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Download size={13} /> Descargar PDF firmado →
                </a>
                {detalle.codigo_verificacion_firma && (
                  <p className="text-xs text-gray-400 mt-1 font-mono">Código: {detalle.codigo_verificacion_firma}</p>
                )}
              </div>
            )}

            <div>
              <CardTitle>Historial de movimientos</CardTitle>
              <div className="mt-3"><TimelineMovimientos movimientos={detalle.movimientos} /></div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ── Modal adjuntar documento ───────────────────────── */}
      <Modal
        open={modalAdjuntar}
        onClose={() => { setModalAdjuntar(false); setArchivoAdjunto(null); }}
        title="Adjuntar documento al expediente"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalAdjuntar(false); setArchivoAdjunto(null); }}>
              Cancelar
            </Button>
            <Button variant="primary" loading={loadingAdjunto} icon={<Paperclip size={14} />}
              onClick={handleAdjuntar} disabled={!archivoAdjunto}>
              Adjuntar documento
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {expAdjuntar && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Expediente</p>
              <p className="font-mono text-sm font-semibold text-blue-600">{expAdjuntar.codigo}</p>
              <p className="text-sm text-gray-600">{expAdjuntar.tipoTramite.nombre}</p>
            </div>
          )}
          <Alert type="info" message="Puedes adjuntar informes técnicos, dictámenes u otros documentos relacionados al expediente." />

          {archivoAdjunto ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <FileText size={16} className="text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-700 truncate">{archivoAdjunto.name}</p>
                <p className="text-xs text-green-500">{(archivoAdjunto.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => { setArchivoAdjunto(null); if (adjuntoRef.current) adjuntoRef.current.value = ''; }}
                className="text-gray-400 hover:text-red-500">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div onClick={() => adjuntoRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Haz clic para seleccionar un PDF</p>
              <p className="text-xs text-gray-400 mt-1">Máximo 10MB</p>
            </div>
          )}
          <input ref={adjuntoRef} type="file" accept="application/pdf" className="hidden" onChange={handleArchivoAdjuntoChange} />
        </div>
      </Modal>

      {/* ── Modal observar ─────────────────────────────────── */}
      <Modal open={modalObservar} onClose={() => setModalObservar(false)} title="Registrar observación" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setModalObservar(false)}>Cancelar</Button>
          <Button variant="primary" loading={loading} onClick={handleObservar} disabled={!comentario.trim()}>Registrar</Button>
        </>}
      >
        <Input label="Detalle de la observación" placeholder="Qué falta o qué debe corregirse..."
          value={comentario} onChange={(e) => setComentario(e.target.value)} required autoFocus />
      </Modal>

      {/* ── Modal rechazar ─────────────────────────────────── */}
      <Modal open={modalRechazar} onClose={() => setModalRechazar(false)} title="Rechazar expediente" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setModalRechazar(false)}>Cancelar</Button>
          <Button variant="danger" loading={loading} onClick={handleRechazar} disabled={!comentario.trim()}>Rechazar</Button>
        </>}
      >
        <Input label="Motivo de rechazo" placeholder="Describe el motivo..."
          value={comentario} onChange={(e) => setComentario(e.target.value)} required autoFocus />
      </Modal>

      {/* ── Modal subir PDF firmado ────────────────────────── */}
      <Modal
        open={modalPdf}
        onClose={() => { setModalPdf(false); setArchivoPdf(null); }}
        title="Subir PDF firmado con FirmaPeru"
        size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => { setModalPdf(false); setArchivoPdf(null); }}>Cancelar</Button>
          <Button variant="primary" loading={loadingPdf} icon={<Upload size={14} />}
            onClick={handleSubirPdfFirmado} disabled={!archivoPdf}>
            Subir PDF firmado
          </Button>
        </>}
      >
        <div className="space-y-4">
          <Alert type="info" message="Firma el PDF con FirmaPeru usando tu DNI electrónico y luego súbelo aquí." />
          {archivoPdf ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <FileText size={16} className="text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-700 truncate">{archivoPdf.name}</p>
                <p className="text-xs text-green-500">{(archivoPdf.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => { setArchivoPdf(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="text-gray-400 hover:text-red-500">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Seleccionar PDF firmado</p>
              <p className="text-xs text-gray-400 mt-1">Solo PDF · Máximo 10MB</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleArchivoChange} />
        </div>
      </Modal>

      {/* ── Confirms ───────────────────────────────────────── */}
      <ConfirmModal open={!!confirmTomar} onClose={() => setConfirmTomar(null)}
        onConfirm={() => confirmTomar && handleTomar(confirmTomar)}
        title="Tomar expediente" message={`¿Tomar el expediente ${confirmTomar?.codigo}?`}
        confirmText="Tomar" loading={loading} />

      <ConfirmModal open={!!confirmVisto} onClose={() => setConfirmVisto(null)}
        onConfirm={() => confirmVisto && handleVistoBueno(confirmVisto)}
        title="Dar visto bueno" message={`¿Confirmas el visto bueno para ${confirmVisto?.codigo}?`}
        confirmText="Dar visto bueno" loading={loading} />

      <ConfirmModal open={!!confirmArchivar} onClose={() => setConfirmArchivar(null)}
        onConfirm={() => confirmArchivar && handleArchivar(confirmArchivar)}
        title="Archivar expediente" message={`¿Archivar permanentemente ${confirmArchivar?.codigo}?`}
        confirmText="Archivar" loading={loading} danger />
    </div>
  );
}