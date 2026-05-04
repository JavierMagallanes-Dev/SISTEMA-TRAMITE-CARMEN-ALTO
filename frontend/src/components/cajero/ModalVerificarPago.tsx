// src/components/cajero/ModalVerificarPago.tsx

import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import Input  from '../ui/Input';
import { CreditCard, CheckCircle, Eye } from 'lucide-react';
import { formatMoneda } from '../../utils/formato';
import type { ExpedientePendiente } from '../../hooks/useCajero';

interface Props {
  open:             boolean;
  onClose:          () => void;
  expSeleccionado:  ExpedientePendiente | null;
  boleta:           string; setBoleta: (v: string) => void;
  monto:            string; setMonto:  (v: string) => void;
  loading:          boolean;
  onConfirmar:      () => void;
  onVerComprobante: (url: string) => void;
}

export default function ModalVerificarPago({
  open, onClose, expSeleccionado, boleta, setBoleta, monto, setMonto,
  loading, onConfirmar, onVerComprobante,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Verificar pago" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={loading} icon={<CreditCard size={14} />} onClick={onConfirmar} disabled={!boleta.trim() || !monto}>Confirmar pago</Button></>}>
      {expSeleccionado && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-gray-500">Expediente</p>
            <p className="font-mono text-sm font-semibold text-blue-600">{expSeleccionado.codigo}</p>
            <p className="text-sm text-gray-700">{expSeleccionado.ciudadano.nombres} {expSeleccionado.ciudadano.apellido_pat}</p>
            <p className="text-sm text-gray-600">{expSeleccionado.tipoTramite.nombre}</p>
            <p className="text-base font-bold text-green-600">Monto: {formatMoneda(expSeleccionado.tipoTramite.costo_soles)}</p>
          </div>

          {expSeleccionado.pagos?.[0]?.url_comprobante && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-green-800">El ciudadano adjuntó comprobante</p>
                    <p className="text-xs text-green-600 mt-0.5">Revísalo antes de verificar el pago</p>
                  </div>
                </div>
                <button
                  onClick={() => onVerComprobante(expSeleccionado.pagos[0].url_comprobante!)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline bg-white border border-blue-200 px-3 py-1.5 rounded-lg">
                  <Eye size={12} />Ver comprobante
                </button>
              </div>
            </div>
          )}

          <Input label="Número de boleta" placeholder="B001-000123" value={boleta} onChange={(e) => setBoleta(e.target.value)} required autoFocus />
          <Input label="Monto cobrado (S/)" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} required />
        </div>
      )}
    </Modal>
  );
}