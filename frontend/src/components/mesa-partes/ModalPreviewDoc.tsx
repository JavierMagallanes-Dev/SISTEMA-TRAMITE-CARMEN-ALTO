// src/components/mesa-partes/ModalPreviewDoc.tsx
// Modal reutilizable para previsualizar un PDF en iframe.

import Modal  from '../ui/Modal';
import { Download } from 'lucide-react';
import type { Documento } from '../../hooks/useMesaPartes';

interface Props {
  open:      boolean;
  onClose:   () => void;
  doc:       Documento | null;
  nombreDoc: (n: string) => string;
}

export default function ModalPreviewDoc({ open, onClose, doc, nombreDoc }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={doc ? nombreDoc(doc.nombre) : 'Vista previa'}
      size="lg">
      {doc && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100">
              <Download size={14} />Descargar
            </a>
          </div>
          <div className="w-full rounded-lg overflow-hidden border border-gray-200" style={{ height: '70vh' }}>
            <iframe
              src={`${doc.url}#toolbar=1&navpanes=0`}
              className="w-full h-full"
              title={nombreDoc(doc.nombre)}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}