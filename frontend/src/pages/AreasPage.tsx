// src/pages/AreasPage.tsx

import { useEffect, useState } from 'react';
import { areasService }        from '../services/areas.service';
import { useAuth }             from '../context/AuthContext';
import { Card, CardTitle }     from '../components/ui/Card';
import Button                  from '../components/ui/Button';
import Modal                   from '../components/ui/Modal';
import Alert                   from '../components/ui/Alert';
import Spinner                 from '../components/ui/Spinner';
import Input                   from '../components/ui/Input';
import EstadoBadge             from '../components/shared/EstadoBadge';
import TimelineMovimientos     from '../components/shared/TimelineMovimientos';
import ConfirmModal            from '../components/shared/ConfirmModal';
import { formatFecha, diasRestantes, colorDiasRestantes } from '../utils/formato';
import type { EstadoExpediente, Movimiento } from '../types';
import {
  RefreshCw, Eye, Play, AlertCircle,
  XCircle, CheckCircle, Upload, Archive,
  Clock, FileText,
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

interface DetalleExpediente extends ExpedienteBandeja {
  areaActual:               { nombre: string; sigla: string } | null;
  fecha_resolucion:         string | null;
  url_pdf_firmado:          string | null;
  codigo_verificacion_firma: string | null;
  pagos:      { boleta: string; monto_cobrado: number; fecha_pago: string }[];
  movimientos: Movimiento[];
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

  // Modal PDF firmado
  const [modalPdf, setModalPdf] = useState(false);
  const [urlPdf,   setUrlPdf]   = useState('');
  const [expPdf,   setExpPdf]   = useState<ExpedienteBandeja | null>(null);

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
      setDetalle(await areasService.detalle(id));
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
      setError(err?.response?.data?.error ?? 'Error al tomar el expediente.');
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

  const handleSubirPdf = async () => {
    if (!expPdf || !urlPdf.trim()) return;
    setLoading(true);
    try {
      const res = await areasService.subirPdfFirmado(expPdf.id, urlPdf.trim());
      setSuccess(`PDF firmado subido. Código: ${res.codigo_verificacion_firma}`);
      setModalPdf(false);
      setUrlPdf('');
      cargarBandeja();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al subir el PDF.');
    } finally { setLoading(false); }
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
                        <Clock size={11} />
                        {formatFecha(exp.fecha_registro)}
                      </span>
                      <span className={`font-medium ${colorDiasRestantes(dias)}`}>
                        {dias < 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d restantes`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => verDetalle(exp.id)}>
                      Ver
                    </Button>

                    {!esJefe && exp.estado === 'DERIVADO' && (
                      <Button size="sm" icon={<Play size={13} />} onClick={() => setConfirmTomar(exp)}>
                        Tomar
                      </Button>
                    )}

                    {!esJefe && exp.estado === 'EN_PROCESO' && (
                      <>
                        <Button size="sm" variant="secondary" icon={<AlertCircle size={13} />} onClick={() => { setExpAccion(exp); setComentario(''); setModalObservar(true); }}>
                          Observar
                        </Button>
                        <Button size="sm" variant="danger" icon={<XCircle size={13} />} onClick={() => { setExpAccion(exp); setComentario(''); setModalRechazar(true); }}>
                          Rechazar
                        </Button>
                      </>
                    )}

                    {esJefe && exp.estado === 'EN_PROCESO' && (
                      <Button size="sm" icon={<CheckCircle size={13} />} onClick={() => setConfirmVisto(exp)}>
                        Visto bueno
                      </Button>
                    )}

                    {esJefe && exp.estado === 'LISTO_DESCARGA' && (
                      <Button size="sm" icon={<Upload size={13} />} onClick={() => { setExpPdf(exp); setUrlPdf(''); setModalPdf(true); }}>
                        Subir PDF firmado
                      </Button>
                    )}

                    {esJefe && exp.estado === 'RESUELTO' && (
                      <Button size="sm" variant="secondary" icon={<Archive size={13} />} onClick={() => setConfirmArchivar(exp)}>
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

      {/* Modal detalle */}
      <Modal open={modalDetalle} onClose={() => setModalDetalle(false)} title="Detalle del expediente" size="lg">
        {cargandoDet ? <Spinner /> : detalle ? (
          <div className="space-y-4">
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
              </div>
              <div><p className="text-xs text-gray-400">Registrado</p><p>{formatFecha(detalle.fecha_registro)}</p></div>
              <div>
                <p className="text-xs text-gray-400">Límite</p>
                <p className={colorDiasRestantes(diasRestantes(detalle.fecha_limite))}>
                  {formatFecha(detalle.fecha_limite)}
                </p>
              </div>
            </div>

            {detalle.url_pdf_firmado && (
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">PDF firmado</p>
                <a href={detalle.url_pdf_firmado} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  Descargar PDF firmado →
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

      {/* Modal observar */}
      <Modal open={modalObservar} onClose={() => setModalObservar(false)} title="Registrar observación" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setModalObservar(false)}>Cancelar</Button>
          <Button variant="primary" loading={loading} onClick={handleObservar} disabled={!comentario.trim()}>Registrar</Button>
        </>}
      >
        <Input label="Detalle de la observación" placeholder="Qué falta o qué debe corregirse..." value={comentario} onChange={(e) => setComentario(e.target.value)} required autoFocus />
      </Modal>

      {/* Modal rechazar */}
      <Modal open={modalRechazar} onClose={() => setModalRechazar(false)} title="Rechazar expediente" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setModalRechazar(false)}>Cancelar</Button>
          <Button variant="danger" loading={loading} onClick={handleRechazar} disabled={!comentario.trim()}>Rechazar</Button>
        </>}
      >
        <Input label="Motivo de rechazo" placeholder="Describe el motivo..." value={comentario} onChange={(e) => setComentario(e.target.value)} required autoFocus />
      </Modal>

      {/* Modal PDF firmado */}
      <Modal open={modalPdf} onClose={() => setModalPdf(false)} title="Subir PDF firmado con FirmaPeru" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setModalPdf(false)}>Cancelar</Button>
          <Button variant="primary" loading={loading} icon={<Upload size={14} />} onClick={handleSubirPdf} disabled={!urlPdf.trim()}>Subir PDF</Button>
        </>}
      >
        <div className="space-y-3">
          <Alert type="info" message="Firma el PDF con FirmaPeru usando tu DNI electrónico, súbelo a Supabase Storage y pega la URL aquí." />
          <Input label="URL del PDF firmado" placeholder="https://...supabase.co/storage/..." value={urlPdf} onChange={(e) => setUrlPdf(e.target.value)} required autoFocus />
        </div>
      </Modal>

      {/* Confirms */}
      <ConfirmModal open={!!confirmTomar} onClose={() => setConfirmTomar(null)} onConfirm={() => confirmTomar && handleTomar(confirmTomar)}
        title="Tomar expediente" message={`¿Tomar el expediente ${confirmTomar?.codigo} para evaluación?`} confirmText="Tomar" loading={loading} />

      <ConfirmModal open={!!confirmVisto} onClose={() => setConfirmVisto(null)} onConfirm={() => confirmVisto && handleVistoBueno(confirmVisto)}
        title="Dar visto bueno" message={`¿Confirmas el visto bueno para ${confirmVisto?.codigo}?`} confirmText="Dar visto bueno" loading={loading} />

      <ConfirmModal open={!!confirmArchivar} onClose={() => setConfirmArchivar(null)} onConfirm={() => confirmArchivar && handleArchivar(confirmArchivar)}
        title="Archivar expediente" message={`¿Archivar permanentemente el expediente ${confirmArchivar?.codigo}?`} confirmText="Archivar" loading={loading} danger />
    </div>
  );
}