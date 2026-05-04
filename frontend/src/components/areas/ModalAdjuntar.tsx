// src/components/areas/ModalAdjuntar.tsx
// Modal para adjuntar un documento PDF al expediente.

import { useRef }  from 'react';
import Modal       from '../ui/Modal';
import Button      from '../ui/Button';
import Alert       from '../ui/Alert';
import { FileText, Upload, X, Paperclip } from 'lucide-react';
import type { ExpedienteBandeja } from '../../hooks/useAreas';

interface Props {
  open:            boolean;
  onClose:         () => void;
  expAdjuntar:     ExpedienteBandeja | null;
  archivoAdjunto:  File | null;
  setArchivo:      (f: File | null) => void;
  loading:         boolean;
  onAdjuntar:      () => void;
}

export default function ModalAdjuntar({
  open, onClose, expAdjuntar, archivoAdjunto, setArchivo, loading, onAdjuntar,
}: Props) {
  const adjuntoRef = useRef<HTMLInputElement>(null);

  const handleClose = () => { setArchivo(null); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Adjuntar documento al expediente" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button variant="primary" loading={loading} icon={<Paperclip size={14} />}
            onClick={onAdjuntar} disabled={!archivoAdjunto}>
            Adjuntar documento
          </Button>
        </>
      }>
      <div className="space-y-4">
        {expAdjuntar && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Expediente</p>
            <p className="font-mono text-sm font-semibold text-blue-600">{expAdjuntar.codigo}</p>
            <p className="text-sm text-gray-600">{expAdjuntar.tipoTramite.nombre}</p>
          </div>
        )}
        <Alert type="info" message="Puedes adjuntar informes técnicos, dictámenes u otros documentos relacionados." />
        {archivoAdjunto ? (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <FileText size={16} className="text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-700 truncate">{archivoAdjunto.name}</p>
              <p className="text-xs text-green-500">{(archivoAdjunto.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={() => { setArchivo(null); if (adjuntoRef.current) adjuntoRef.current.value = ''; }}
              className="text-gray-400 hover:text-red-500"><X size={16} /></button>
          </div>
        ) : (
          <div onClick={() => adjuntoRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Haz clic para seleccionar un PDF</p>
            <p className="text-xs text-gray-400 mt-1">Máximo 10MB</p>
          </div>
        )}
        <input ref={adjuntoRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setArchivo(f); }} />
      </div>
    </Modal>
  );
}