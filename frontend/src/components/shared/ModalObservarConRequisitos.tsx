// src/components/shared/ModalObservarConRequisitos.tsx
// Modal de observación que permite marcar qué requisitos están mal.

import { useState, useEffect } from 'react';
import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import { AlertCircle, CheckSquare, Square } from 'lucide-react';

interface Requisito {
  id:     number;
  nombre: string;
}

interface Props {
  open:           boolean;
  onClose:        () => void;
  title:          string;
  comentario:     string;
  setComentario:  (v: string) => void;
  loading:        boolean;
  onConfirmar:    (requisitosObservados: number[]) => void;
  variant:        'primary' | 'danger';
  confirmText:    string;
  requisitos?:    Requisito[];
}

export default function ModalObservarConRequisitos({
  open, onClose, title, comentario, setComentario,
  loading, onConfirmar, variant, confirmText, requisitos = [],
}: Props) {
  const [seleccionados, setSeleccionados] = useState<number[]>([]);

  // Limpiar selección al abrir
  useEffect(() => {
    if (open) setSeleccionados([]);
  }, [open]);

  const toggleRequisito = (id: number) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const puedeConfirmar = comentario.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            variant={variant}
            loading={loading}
            onClick={() => onConfirmar(seleccionados)}
            disabled={!puedeConfirmar}
          >
            {confirmText}
          </Button>
        </>
      }>
      <div className="space-y-4">

        {/* Requisitos con problemas */}
        {requisitos.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
              Marca los documentos con problemas
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {requisitos.map((req) => {
                const activo = seleccionados.includes(req.id);
                return (
                  <div
                    key={req.id}
                    onClick={() => toggleRequisito(req.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      activo
                        ? 'bg-red-50 border-red-300'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {activo
                      ? <CheckSquare size={16} className="text-red-500 shrink-0" />
                      : <Square size={16} className="text-gray-400 shrink-0" />
                    }
                    <span className={`text-sm ${activo ? 'text-red-700 font-medium' : 'text-gray-600'}`}>
                      {req.nombre}
                    </span>
                  </div>
                );
              })}
            </div>
            {seleccionados.length > 0 && (
              <p className="text-xs text-red-600 mt-2 font-medium">
                {seleccionados.length} documento(s) marcado(s) con observación
              </p>
            )}
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
          {!puedeConfirmar && (
            <p className="text-xs text-red-500 mt-1">El comentario es obligatorio.</p>
          )}
        </div>

        {/* Aviso */}
        {seleccionados.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              El ciudadano verá exactamente qué documentos debe corregir y podrá subirlos desde el portal.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}