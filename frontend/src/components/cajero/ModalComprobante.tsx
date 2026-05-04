// src/components/cajero/ModalComprobante.tsx

import Modal from '../ui/Modal';
import { ExternalLink } from 'lucide-react';

interface Props {
  open:           boolean;
  onClose:        () => void;
  urlComprobante: string;
  esImagen:       boolean;
}

export default function ModalComprobante({ open, onClose, urlComprobante, esImagen }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Comprobante de pago" size="lg"
      footer={
        <a href={urlComprobante} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium">
          <ExternalLink size={14} />Abrir en nueva pestaña
        </a>
      }>
      <div className="flex flex-col items-center gap-4">
        {esImagen ? (
          <img src={urlComprobante} alt="Comprobante de pago"
            className="max-w-full max-h-[60vh] object-contain rounded-lg border border-gray-200" />
        ) : (
          <div className="w-full h-[60vh]">
            <iframe src={urlComprobante} className="w-full h-full rounded-lg border border-gray-200" title="Comprobante PDF" />
          </div>
        )}
      </div>
    </Modal>
  );
}