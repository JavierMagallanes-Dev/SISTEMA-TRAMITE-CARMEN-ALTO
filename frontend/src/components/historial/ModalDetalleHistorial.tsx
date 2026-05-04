// src/components/historial/ModalDetalleHistorial.tsx
import Modal              from '../ui/Modal';
import Spinner            from '../ui/Spinner';
import EstadoBadge        from '../shared/EstadoBadge';
import TimelineMovimientos from '../shared/TimelineMovimientos';
import { formatFecha }    from '../../utils/formato';
import { FileText, Download } from 'lucide-react';
import type { ExpedienteHistorial } from '../../hooks/useHistorial';

interface Props {
  open:      boolean;
  onClose:   () => void;
  detalle:   ExpedienteHistorial | null;
  cargando:  boolean;
}

export default function ModalDetalleHistorial({ open, onClose, detalle, cargando }: Props) {
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
              <p className="text-xs text-gray-400">Resuelto</p>
              <p className="text-green-600 font-medium">{detalle.fecha_resolucion ? formatFecha(detalle.fecha_resolucion) : '—'}</p>
            </div>
          </div>

          {/* PDF firmado */}
          {detalle.url_pdf_firmado && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-800">✅ Documento firmado digitalmente</p>
                  {detalle.codigo_verificacion_firma && (
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">Código: {detalle.codigo_verificacion_firma}</p>
                  )}
                </div>
                <a href={detalle.url_pdf_firmado} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-green-700">
                  <Download size={13} />Descargar
                </a>
              </div>
            </div>
          )}

          {/* Documentos */}
          <div>
            <p className="text-sm font-bold text-gray-800 mb-2">Documentos adjuntos ({detalle.documentos?.length ?? 0})</p>
            {detalle.documentos?.length > 0 ? (
              <div className="space-y-2">
                {detalle.documentos.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <FileText size={15} className="text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{doc.nombre}</p>
                      <p className="text-xs text-gray-400">{formatFecha(doc.uploaded_at)}</p>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Download size={12} />Descargar
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-lg">Sin documentos adjuntos.</p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <p className="text-sm font-bold text-gray-800 mb-3">Historial de movimientos</p>
            <TimelineMovimientos movimientos={detalle.movimientos} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}