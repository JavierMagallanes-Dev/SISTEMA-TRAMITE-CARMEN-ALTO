// src/components/cajero/ModalAnularPago.tsx

import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import Input  from '../ui/Input';
import { Ban } from 'lucide-react';
import { formatMoneda } from '../../utils/formato';
import type { PagoHistorial } from '../../hooks/useCajero';

interface Props {
  open:             boolean;
  onClose:          () => void;
  pagoSeleccionado: PagoHistorial | null;
  motivo:           string;
  setMotivo:        (v: string) => void;
  loading:          boolean;
  onAnular:         () => void;
}

export default function ModalAnularPago({
  open, onClose, pagoSeleccionado, motivo, setMotivo, loading, onAnular,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Anular pago" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" loading={loading} icon={<Ban size={14} />} onClick={onAnular} disabled={!motivo.trim()}>Anular pago</Button></>}>
      {pagoSeleccionado && (
        <div className="space-y-4">
          <div className="bg-red-50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-gray-500">Pago a anular</p>
            <p className="font-mono text-sm text-blue-600">{pagoSeleccionado.expediente.codigo}</p>
            <p className="text-sm text-gray-700">Boleta: {pagoSeleccionado.boleta}</p>
            <p className="text-sm font-bold text-red-600">{formatMoneda(pagoSeleccionado.monto_cobrado)}</p>
          </div>
          <Input label="Motivo de anulación" placeholder="Describe el motivo..." value={motivo} onChange={(e) => setMotivo(e.target.value)} required autoFocus />
        </div>
      )}
    </Modal>
  );
}