// src/components/mesa-partes/ModalDetalleMDP.tsx
// Modal de detalle del expediente en Mesa de Partes.

import Modal              from '../ui/Modal';
import Button             from '../ui/Button';
import Spinner            from '../ui/Spinner';
import EstadoBadge        from '../shared/EstadoBadge';
import TimelineMovimientos from '../shared/TimelineMovimientos';
import { CardTitle }      from '../ui/Card';
import { formatFecha, diasRestantes, colorDiasRestantes } from '../../utils/formato';
import {
  FileText, Download, Package, ZoomIn, AlertCircle, CheckCircle,
} from 'lucide-react';
import type { DetalleExpediente, Documento } from '../../hooks/useMesaPartes';
import type { EstadoExpediente } from '../../types';

interface Props {
  open:                  boolean;
  onClose:               () => void;
  detalle:               DetalleExpediente | null;
  cargando:              boolean;
  loadingUnificado:      boolean;
  loadingReactivar:      boolean;
  nombreDoc:             (n: string) => string;
  puedeObservar:         (estado: EstadoExpediente) => boolean;
  onDescargarUnificado:  (id: number, codigo: string) => void;
  onAbrirPreview:        (doc: Documento) => void;
  onObservar:            () => void;
  onReactivar:           () => void;
}

export default function ModalDetalleMDP({
  open, onClose, detalle, cargando, loadingUnificado, loadingReactivar,
  nombreDoc, puedeObservar, onDescargarUnificado, onAbrirPreview,
  onObservar, onReactivar,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Detalle del expediente" size="lg">
      {cargando ? <Spinner text="Cargando..." /> : detalle ? (
        <div className="space-y-5">
          {/* Info general */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-gray-400">Código</p><p className="font-mono font-bold text-blue-600">{detalle.codigo}</p></div>
            <div><p className="text-xs text-gray-400">Estado</p><EstadoBadge estado={detalle.estado} /></div>
            <div>
              <p className="text-xs text-gray-400">Ciudadano</p>
              <p className="font-medium">{detalle.ciudadano.nombres} {detalle.ciudadano.apellido_pat}</p>
              <p className="text-xs text-gray-500">DNI: {detalle.ciudadano.dni} · {detalle.ciudadano.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Trámite</p>
              <p className="font-medium">{detalle.tipoTramite.nombre}</p>
              <p className="text-xs text-gray-500">{detalle.tipoTramite.plazo_dias} días · S/ {Number(detalle.tipoTramite.costo_soles).toFixed(2)}</p>
            </div>
            <div><p className="text-xs text-gray-400">Registrado</p><p>{formatFecha(detalle.fecha_registro)}</p></div>
            <div>
              <p className="text-xs text-gray-400">Fecha límite</p>
              <p className={colorDiasRestantes(diasRestantes(detalle.fecha_limite))}>{formatFecha(detalle.fecha_limite)}</p>
            </div>
          </div>

          {/* Documentos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <CardTitle>Documentos ({detalle.documentos?.length ?? 0})</CardTitle>
              {detalle.documentos && detalle.documentos.length > 0 && (
                <Button size="sm" variant="primary" icon={<Package size={13} />}
                  loading={loadingUnificado}
                  onClick={() => onDescargarUnificado(detalle.id, detalle.codigo)}>
                  Descargar todo en PDF
                </Button>
              )}
            </div>
            {detalle.documentos && detalle.documentos.length > 0 ? (
              <div className="space-y-2">
                {detalle.documentos.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                    <FileText size={16} className="text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{nombreDoc(doc.nombre)}</p>
                      <p className="text-xs text-gray-400">{formatFecha(doc.uploaded_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onAbrirPreview(doc)}
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
              <p className="text-sm text-gray-400 mt-2 bg-gray-50 rounded-lg p-3 text-center">El ciudadano no adjuntó documentos.</p>
            )}
          </div>

          {/* Acciones */}
          <div className="space-y-2">
            {puedeObservar(detalle.estado) && (
              <div className="pt-2 border-t border-gray-100">
                <Button variant="secondary" icon={<AlertCircle size={14} />} onClick={onObservar} className="w-full justify-center">
                  Observar expediente
                </Button>
              </div>
            )}
            {detalle.estado === 'OBSERVADO' && (
              <div className="pt-2 border-t border-gray-100">
                <Button variant="primary" icon={<CheckCircle size={14} />} onClick={onReactivar} loading={loadingReactivar} className="w-full justify-center">
                  Reactivar expediente
                </Button>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <CardTitle>Historial</CardTitle>
            <div className="mt-3"><TimelineMovimientos movimientos={detalle.movimientos} /></div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}