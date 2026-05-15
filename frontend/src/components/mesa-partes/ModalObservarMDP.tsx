// src/components/mesa-partes/ModalObservarMDP.tsx
// Modal para registrar una observación con documentos específicos marcados.

import { useState, useEffect } from 'react';
import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import Alert  from '../ui/Alert';
import { AlertCircle, CheckSquare, Square } from 'lucide-react';

interface DocItem {
  id:     number;
  nombre: string;
}

interface Props {
  open:           boolean;
  onClose:        () => void;
  comentario:     string;
  setComentario:  (v: string) => void;
  loading:        boolean;
  onObservar:     (docsObservados: { id: number; nombre: string }[]) => void;
  documentos?:    DocItem[];
}

export default function ModalObservarMDP({
  open, onClose, comentario, setComentario, loading, onObservar, documentos = [],
}: Props) {
  const [seleccionados, setSeleccionados] = useState<number[]>([]);

  useEffect(() => {
    if (open) setSeleccionados([]);
  }, [open]);

  const toggleDoc = (id: number) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  // Solo mostrar docs REQ- (los del ciudadano)
  const docsReq = documentos.filter(d => d.nombre.startsWith('REQ-'));

  const handleConfirmar = () => {
    const docsObservados = docsReq.filter(d => seleccionados.includes(d.id));
    onObservar(docsObservados);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Observar expediente"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            variant="secondary"
            icon={<AlertCircle size={14} />}
            loading={loading}
            onClick={handleConfirmar}
            disabled={!comentario.trim()}
            className="border-orange-300 text-orange-600 hover:bg-orange-50">
            Marcar como Observado
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert type="warning" message="El ciudadano verá qué documentos debe corregir y podrá subirlos desde el portal." />

        {/* Documentos con problemas */}
        {docsReq.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
              Documentos con problemas (opcional)
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {docsReq.map((doc) => {
                const activo = seleccionados.includes(doc.id);
                const nombre = doc.nombre.replace(/^REQ-\d+:\s*/, '');
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      activo
                        ? 'bg-red-50 border-red-300'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {activo
                      ? <CheckSquare size={15} className="text-red-500 shrink-0" />
                      : <Square size={15} className="text-gray-400 shrink-0" />
                    }
                    <span className={`text-sm truncate ${activo ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
                      {nombre}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comentario */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
            Detalle de la observación <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
            rows={3}
            placeholder="Describe qué debe corregirse..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            autoFocus
          />
        </div>
      </div>
    </Modal>
  );
}