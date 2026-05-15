// src/components/areas/ModalDetalleAreas.tsx

import { useRef }          from 'react';
import Modal               from '../ui/Modal';
import Spinner             from '../ui/Spinner';
import Button              from '../ui/Button';
import EstadoBadge         from '../shared/EstadoBadge';
import TimelineMovimientos from '../shared/TimelineMovimientos';
import { CardTitle }       from '../ui/Card';
import { formatFecha, diasRestantes, colorDiasRestantes } from '../../utils/formato';
import { FileText, Download, Package, ZoomIn, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import type { DetalleExpediente, Documento } from '../../hooks/useAreas';

interface Props {
  open:              boolean;
  onClose:           () => void;
  detalle:           DetalleExpediente | null;
  cargando:          boolean;
  loadingUnif:       boolean;
  nombreDoc:         (n: string) => string;
  onDescargarUnif:   (id: number, codigo: string) => void;
  onAbrirPreview:    (doc: Documento) => void;
  onReemplazarDoc?:  (docId: number, nombre: string, archivo: File) => void;
  loadingReemplazar?: number | null;
}

export default function ModalDetalleAreas({
  open, onClose, detalle, cargando, loadingUnif,
  nombreDoc, onDescargarUnif, onAbrirPreview,
  onReemplazarDoc, loadingReemplazar,
}: Props) {

  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const docFirmadoTecnico = detalle?.documentos?.find(d =>
    d.nombre.startsWith('FIRMADO_TECNICO:')
  ) ?? null;

  const docsOriginales = detalle?.documentos?.filter(d =>
    !d.nombre.startsWith('FIRMADO_TECNICO:') &&
    !d.nombre.startsWith('PDF_UNIFICADO:')
  ) ?? [];

  const esObservado = detalle?.estado === 'OBSERVADO';

  // ── Extraer IDs observados y fecha de observación ──────────
  const ultimaObservacion = detalle?.movimientos
    ?.filter(m => m.tipo_accion === 'OBSERVACION').slice(-1)[0];

  const idsObservados = (() => {
    if (!ultimaObservacion?.comentario) return [];
    const match = ultimaObservacion.comentario.match(/^\[DOC:([^\]]+)\]/);
    if (!match) return [];
    return match[1].split(',').map(Number);
  })();

  const fechaObservacion = ultimaObservacion?.fecha_hora ?? null;

  const getEstadoDoc = (doc: Documento): 'observado' | 'subsanado' | 'normal' => {
    if (!idsObservados.includes(doc.id)) return 'normal';
    if (fechaObservacion && new Date(doc.uploaded_at) > new Date(fechaObservacion)) {
      return 'subsanado';
    }
    return 'observado';
  };

  const handleFileChange = (docId: number, nombre: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onReemplazarDoc?.(docId, nombre, file);
    if (fileRefs.current[docId]) fileRefs.current[docId]!.value = '';
  };

  return (
    <Modal open={open} onClose={onClose} title="Detalle del expediente" size="lg">
      {cargando ? <Spinner /> : detalle ? (
        <div className="space-y-5">

          {/* Info general */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-gray-400">Código</p><p className="font-mono font-bold text-blue-600">{detalle.codigo}</p></div>
            <div><p className="text-xs text-gray-400">Estado</p><EstadoBadge estado={detalle.estado} /></div>
            <div><p className="text-xs text-gray-400">Ciudadano</p><p className="font-medium">{detalle.ciudadano.nombres} {detalle.ciudadano.apellido_pat}</p></div>
            <div>
              <p className="text-xs text-gray-400">Trámite</p>
              <p className="font-medium">{detalle.tipoTramite.nombre}</p>
              <p className="text-xs text-gray-500">{detalle.tipoTramite.plazo_dias} días de plazo</p>
            </div>
            <div><p className="text-xs text-gray-400">Registrado</p><p>{formatFecha(detalle.fecha_registro)}</p></div>
            <div>
              <p className="text-xs text-gray-400">Límite</p>
              <p className={colorDiasRestantes(diasRestantes(detalle.fecha_limite))}>{formatFecha(detalle.fecha_limite)}</p>
            </div>
          </div>

          {/* Aviso de observación */}
          {esObservado && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500 shrink-0" />
              <span className="text-amber-600 text-xs font-semibold">
                Expediente observado — revisa los documentos marcados. Los verdes ya fueron subsanados por el ciudadano.
              </span>
            </div>
          )}

          {/* PDF firmado por el Técnico */}
          {docFirmadoTecnico ? (
            <div className="rounded-xl border border-emerald-200 overflow-hidden">
              <div className="bg-emerald-50 px-4 py-3 flex items-center gap-3 border-b border-emerald-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle size={16} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-800">Expediente revisado por el Técnico</p>
                  <p className="text-xs text-emerald-600">El técnico firmó el expediente dando conformidad técnica.</p>
                </div>
              </div>
              <div className="p-4 bg-white flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Expediente con firma técnica</p>
                    <p className="text-xs text-gray-400">{formatFecha(docFirmadoTecnico.uploaded_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onAbrirPreview(docFirmadoTecnico)}
                    className="flex items-center gap-1 text-xs text-indigo-600 font-medium px-3 py-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                    <ZoomIn size={13} />Vista previa
                  </button>
                  <a href={docFirmadoTecnico.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-emerald-700 font-medium px-3 py-1.5 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                    <Download size={13} />Descargar
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <CardTitle>Documentos ({docsOriginales.length})</CardTitle>
                {docsOriginales.length > 0 && (
                  <Button size="sm" variant="primary" icon={<Package size={13} />} loading={loadingUnif}
                    onClick={() => onDescargarUnif(detalle.id, detalle.codigo)}>
                    Descargar todo en PDF
                  </Button>
                )}
              </div>
              {docsOriginales.length > 0 ? (
                <div className="space-y-2">
                  {docsOriginales.map((doc) => {
                    const estadoDoc = getEstadoDoc(doc);
                    return (
                      <div
                        key={doc.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          estadoDoc === 'subsanado'
                            ? 'bg-green-50 border-green-300'
                            : estadoDoc === 'observado'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200 hover:border-blue-200'
                        }`}
                      >
                        <FileText size={16} className={
                          estadoDoc === 'subsanado' ? 'text-green-500 shrink-0' :
                          estadoDoc === 'observado' ? 'text-red-400 shrink-0' :
                          'text-blue-500 shrink-0'
                        } />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-700 truncate">{nombreDoc(doc.nombre)}</p>
                            {estadoDoc === 'subsanado' && (
                              <span className="text-xs font-semibold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                ✓ Subsanado
                              </span>
                            )}
                            {estadoDoc === 'observado' && (
                              <span className="text-xs font-semibold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                ❌ Observado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{formatFecha(doc.uploaded_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <button onClick={() => onAbrirPreview(doc)}
                            className="flex items-center gap-1 text-xs text-indigo-600 font-medium px-3 py-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                            <ZoomIn size={13} />Vista previa
                          </button>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                            <Download size={13} />Descargar
                          </a>
                          {esObservado && doc.nombre.startsWith('REQ-') && onReemplazarDoc && (
                            <>
                              <button
                                onClick={() => fileRefs.current[doc.id]?.click()}
                                disabled={loadingReemplazar === doc.id}
                                className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                                  estadoDoc === 'subsanado'
                                    ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                                    : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                }`}
                              >
                                {loadingReemplazar === doc.id
                                  ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  : <RefreshCw size={13} />
                                }
                                {estadoDoc === 'subsanado' ? 'Actualizar' : 'Reemplazar'}
                              </button>
                              <input
                                ref={el => { fileRefs.current[doc.id] = el; }}
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={(e) => handleFileChange(doc.id, doc.nombre, e)}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2 bg-gray-50 rounded-lg p-3 text-center">No hay documentos adjuntos.</p>
              )}
            </div>
          )}

          {/* PDF firmado final */}
          {detalle.url_pdf_firmado && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-xs font-semibold text-green-700 mb-1">PDF firmado oficialmente</p>
              <a href={detalle.url_pdf_firmado} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 flex items-center gap-1">
                <Download size={13} />Descargar resolución firmada →
              </a>
            </div>
          )}

          {/* Historial */}
          <div>
            <CardTitle>Historial</CardTitle>
            <div className="mt-3">
              <TimelineMovimientos movimientos={detalle.movimientos} />
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}