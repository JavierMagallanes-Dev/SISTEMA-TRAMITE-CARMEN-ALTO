// src/components/areas/ModalAdjuntar.tsx
// Modal para adjuntar un documento PDF al expediente.
// Permite descargar el expediente actual, modificarlo y resubirlo.

import { useRef }  from 'react';
import Modal       from '../ui/Modal';
import Button      from '../ui/Button';
import { FileText, Upload, X, Paperclip, Download, RefreshCw} from 'lucide-react';
import type { ExpedienteBandeja } from '../../hooks/useAreas';


interface Props {
  open:              boolean;
  onClose:           () => void;
  expAdjuntar:       ExpedienteBandeja | null;
  archivoAdjunto:    File | null;
  setArchivo:        (f: File | null) => void;
  loading:           boolean;
  loadingUnif?:      boolean;
  onAdjuntar:        () => void;
  onDescargarUnif?:  (id: number, codigo: string) => void;
  onReemplazarPdf?:  () => void;
  archivoReemplazo?: File | null;
  setArchivoReemplazo?: (f: File | null) => void;
  loadingReemplazo?: boolean;
}

export default function ModalAdjuntar({
  open, onClose, expAdjuntar, archivoAdjunto, setArchivo, loading, onAdjuntar,
  loadingUnif, onDescargarUnif, onReemplazarPdf,
  archivoReemplazo, setArchivoReemplazo, loadingReemplazo,
}: Props) {
  const adjuntoRef    = useRef<HTMLInputElement>(null);
  const reemplazoRef  = useRef<HTMLInputElement>(null);

  const handleClose = () => { setArchivo(null); setArchivoReemplazo?.(null); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Gestionar documentos del expediente" size="sm">
      <div className="space-y-4">

        {/* Info expediente */}
        {expAdjuntar && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Expediente</p>
            <p className="font-mono text-sm font-semibold text-blue-600">{expAdjuntar.codigo}</p>
            <p className="text-sm text-gray-600">{expAdjuntar.tipoTramite.nombre}</p>
          </div>
        )}

        {/* ── Sección 1: Descargar y reemplazar PDF ── */}
        {onDescargarUnif && expAdjuntar && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <RefreshCw size={14} className="text-blue-500" />
                Reemplazar expediente
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Descarga el PDF actual, realiza tus cambios y súbelo de nuevo.
              </p>
            </div>
            <div className="p-4 space-y-3">
              {/* Botón descargar */}
              <Button
                size="sm" variant="secondary"
                icon={<Download size={13} />}
                loading={loadingUnif}
                onClick={() => onDescargarUnif(expAdjuntar.id, expAdjuntar.codigo)}
                className="w-full justify-center">
                Descargar PDF actual del expediente
              </Button>

              {/* Subir reemplazo */}
              {archivoReemplazo ? (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <FileText size={16} className="text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-700 truncate">{archivoReemplazo.name}</p>
                    <p className="text-xs text-amber-500">{(archivoReemplazo.size / 1024).toFixed(1)} KB · PDF modificado</p>
                  </div>
                  <button
                    onClick={() => { setArchivoReemplazo?.(null); if (reemplazoRef.current) reemplazoRef.current.value = ''; }}
                    className="text-gray-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => reemplazoRef.current?.click()}
                  className="border-2 border-dashed border-amber-300 rounded-lg p-4 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors">
                  <Upload size={20} className="mx-auto text-amber-400 mb-1" />
                  <p className="text-sm text-amber-600 font-medium">Subir PDF modificado</p>
                  <p className="text-xs text-gray-400 mt-0.5">Reemplazará el expediente actual</p>
                </div>
              )}
              <input
                ref={reemplazoRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setArchivoReemplazo?.(f); }} />

              {archivoReemplazo && onReemplazarPdf && (
                <Button
                  variant="primary" size="sm"
                  icon={<RefreshCw size={13} />}
                  loading={loadingReemplazo}
                  onClick={onReemplazarPdf}
                  className="w-full justify-center">
                  Confirmar reemplazo del expediente
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Sección 2: Adjuntar documento adicional ── */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Paperclip size={14} className="text-blue-500" />
              Adjuntar documento adicional
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Informes técnicos, dictámenes u otros documentos complementarios.
            </p>
          </div>
          <div className="p-4 space-y-3">
            {archivoAdjunto ? (
  <div className="space-y-2">
    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <FileText size={16} className="text-green-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-green-700 truncate">{archivoAdjunto.name}</p>
        <p className="text-xs text-green-500">{(archivoAdjunto.size / 1024).toFixed(1)} KB</p>
      </div>
      <button
        onClick={() => {
          const url = URL.createObjectURL(archivoAdjunto);
          window.open(url, '_blank');
        }}
        className="text-blue-500 hover:text-blue-700 text-xs font-medium px-2 py-1 bg-blue-50 rounded-lg border border-blue-200"
        title="Previsualizar PDF"
      >
        Ver
      </button>
      <button
        onClick={() => { setArchivo(null); if (adjuntoRef.current) adjuntoRef.current.value = ''; }}
        className="text-gray-400 hover:text-red-500">
        <X size={16} />
      </button>
    </div>
  </div>
            ) : (
              <div
                onClick={() => adjuntoRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <Upload size={22} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Haz clic para seleccionar un PDF</p>
                <p className="text-xs text-gray-400 mt-1">Máximo 10MB</p>
              </div>
            )}
            <input
              ref={adjuntoRef} type="file" accept="application/pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setArchivo(f); }} />

            {archivoAdjunto && (
              <Button
                variant="primary" size="sm"
                icon={<Paperclip size={13} />}
                loading={loading}
                onClick={onAdjuntar}
                className="w-full justify-center">
                Adjuntar documento
              </Button>
            )}
          </div>
        </div>

        {/* Cerrar */}
        <Button variant="secondary" onClick={handleClose} className="w-full justify-center">
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}