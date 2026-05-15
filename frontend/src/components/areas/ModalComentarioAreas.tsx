// src/components/areas/ModalComentarioAreas.tsx
// Modal reutilizable para observar o rechazar un expediente.
// Ahora incluye selección de documentos con problemas.

import { useState, useEffect } from 'react';
import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import { CheckSquare, Square } from 'lucide-react';

interface DocItem {
  id:     number;
  nombre: string;
}

interface Props {
  open:        boolean;
  onClose:     () => void;
  title:       string;
  label:       string;
  placeholder: string;
  comentario:  string;
  setComentario: (v: string) => void;
  loading:     boolean;
  onConfirmar: (docsObservados?: { id: number; nombre: string }[]) => void;
  variant:     'primary' | 'danger';
  confirmText: string;
  documentos?: DocItem[];
  mostrarDocs?: boolean;
}

export default function ModalComentarioAreas({
  open, onClose, title, label, placeholder,
  comentario, setComentario, loading, onConfirmar,
  variant, confirmText, documentos = [], mostrarDocs = false,
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

  const docsReq = documentos.filter(d => d.nombre.startsWith('REQ-'));

  const handleConfirmar = () => {
    if (mostrarDocs) {
      const docsObservados = docsReq.filter(d => seleccionados.includes(d.id));
      onConfirmar(docsObservados);
    } else {
      onConfirmar();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant={variant} loading={loading} onClick={handleConfirmar} disabled={!comentario.trim()}>
            {confirmText}
          </Button>
        </>
      }>
      <div className="space-y-4">

        {/* Documentos con problemas — solo en observación */}
        {mostrarDocs && docsReq.length > 0 && (
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
            {label} <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
            rows={3}
            placeholder={placeholder}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            autoFocus
          />
        </div>
      </div>
    </Modal>
  );
}