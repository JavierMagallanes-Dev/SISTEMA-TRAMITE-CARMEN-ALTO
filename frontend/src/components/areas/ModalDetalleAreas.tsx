// src/components/areas/ModalDetalleAreas.tsx

import Modal               from '../ui/Modal';
import Spinner             from '../ui/Spinner';
import Button              from '../ui/Button';
import EstadoBadge         from '../shared/EstadoBadge';
import TimelineMovimientos from '../shared/TimelineMovimientos';
import { CardTitle }       from '../ui/Card';
import { formatFecha, diasRestantes, colorDiasRestantes } from '../../utils/formato';
import { FileText, Download, Package, ZoomIn, CheckCircle } from 'lucide-react';
import type { DetalleExpediente, Documento } from '../../hooks/useAreas';

interface Props {
  open:            boolean;
  onClose:         () => void;
  detalle:         DetalleExpediente | null;
  cargando:        boolean;
  loadingUnif:     boolean;
  nombreDoc:       (n: string) => string;
  onDescargarUnif: (id: number, codigo: string) => void;
  onAbrirPreview:  (doc: Documento) => void;
}

export default function ModalDetalleAreas({
  open, onClose, detalle, cargando, loadingUnif,
  nombreDoc, onDescargarUnif, onAbrirPreview,
}: Props) {

  // Separar el PDF firmado por el técnico de los documentos originales
  const docFirmadoTecnico = detalle?.documentos?.find(d =>
    d.nombre.startsWith('FIRMADO_TECNICO:')
  ) ?? null;

  const docsOriginales = detalle?.documentos?.filter(d =>
    !d.nombre.startsWith('FIRMADO_TECNICO:')
  ) ?? [];

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

          {/* ── PDF firmado por el Técnico ── */}
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
                  <a
                    href={docFirmadoTecnico.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-emerald-700 font-medium px-3 py-1.5 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                    <Download size={13} />Descargar
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* Si no hay firma del técnico, mostrar el PDF unificado normal */
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
                  {docsOriginales.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                      <FileText size={16} className="text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{nombreDoc(doc.nombre)}</p>
                        <p className="text-xs text-gray-400">{formatFecha(doc.uploaded_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => onAbrirPreview(doc)}
                          className="flex items-center gap-1 text-xs text-indigo-600 font-medium px-3 py-1.5 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                          <ZoomIn size={13} />Vista previa
                        </button>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                          <Download size={13} />Descargar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2 bg-gray-50 rounded-lg p-3 text-center">No hay documentos adjuntos.</p>
              )}
            </div>
          )}

          {/* PDF firmado final (por el Jefe) */}
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