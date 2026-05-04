// src/components/mesa-partes/ModalObservarMDP.tsx
// Modal para registrar una observación en Mesa de Partes.

import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import Alert  from '../ui/Alert';
import Input  from '../ui/Input';
import { AlertCircle } from 'lucide-react';

interface Props {
  open:           boolean;
  onClose:        () => void;
  comentario:     string;
  setComentario:  (v: string) => void;
  loading:        boolean;
  onObservar:     () => void;
}

export default function ModalObservarMDP({
  open, onClose, comentario, setComentario, loading, onObservar,
}: Props) {
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
            onClick={onObservar}
            disabled={!comentario.trim()}
            className="border-orange-300 text-orange-600 hover:bg-orange-50">
            Marcar como Observado
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert type="warning" message="El ciudadano recibirá un email con la observación." />
        <Input
          label="Detalle de la observación"
          placeholder="Ej: Falta fotocopia del DNI..."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          required
          autoFocus
        />
      </div>
    </Modal>
  );
}