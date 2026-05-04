// src/components/mesa-partes/ModalDerivar.tsx
// Modal para derivar un expediente con PIN de seguridad.

import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import Input  from '../ui/Input';
import { Send, ShieldCheck } from 'lucide-react';
import type { Area }               from '../../types';
import type { ExpedienteBandeja }  from '../../hooks/useMesaPartes';

interface Props {
  open:            boolean;
  onClose:         () => void;
  expDerivar:      ExpedienteBandeja | null;
  areas:           Area[];
  areaDestino:     string;
  setAreaDestino:  (v: string) => void;
  instrucciones:   string;
  setInstrucciones:(v: string) => void;
  pinInput:        string;
  setPinInput:     (v: string) => void;
  loading:         boolean;
  onConfirmar:     () => void;
}

export default function ModalDerivar({
  open, onClose, expDerivar, areas,
  areaDestino, setAreaDestino,
  instrucciones, setInstrucciones,
  pinInput, setPinInput,
  loading, onConfirmar,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Derivar expediente al área técnica"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            loading={loading}
            icon={<Send size={14} />}
            onClick={onConfirmar}
            disabled={!areaDestino || pinInput.length < 4}>
            Confirmar derivación
          </Button>
        </>
      }
    >
      {expDerivar && (
        <div className="space-y-4">
          {/* Info expediente */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Expediente a derivar</p>
            <p className="font-mono text-sm font-semibold text-blue-600">{expDerivar.codigo}</p>
            <p className="text-sm text-gray-700">{expDerivar.ciudadano.nombres} {expDerivar.ciudadano.apellido_pat}</p>
            <p className="text-sm text-gray-500">{expDerivar.tipoTramite.nombre}</p>
          </div>

          {/* Área destino */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Área destino <span className="text-red-500">*</span>
            </label>
            <select
              value={areaDestino}
              onChange={(e) => setAreaDestino(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
              <option value="">Seleccionar área...</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.sigla})</option>)}
            </select>
          </div>

          {/* Instrucciones */}
          <Input
            label="Instrucciones (opcional)"
            placeholder="Instrucciones para el área técnica..."
            value={instrucciones}
            onChange={(e) => setInstrucciones(e.target.value)}
          />

          {/* PIN */}
          <div>
            <Input
              label="PIN de seguridad"
              type="password"
              placeholder="Ingresa tu PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              helper="PIN asignado por el Administrador del sistema."
            />
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <ShieldCheck size={13} className="text-blue-500" />
              <span>El PIN confirma tu identidad para derivar el expediente.</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}