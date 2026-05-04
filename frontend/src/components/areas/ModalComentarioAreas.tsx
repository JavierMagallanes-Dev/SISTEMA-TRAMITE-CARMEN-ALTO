// src/components/areas/ModalComentarioAreas.tsx
// Modal reutilizable para observar o rechazar un expediente.

import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import Input  from '../ui/Input';

interface Props {
  open:       boolean;
  onClose:    () => void;
  title:      string;
  label:      string;
  placeholder:string;
  comentario: string;
  setComentario: (v: string) => void;
  loading:    boolean;
  onConfirmar:() => void;
  variant:    'primary' | 'danger';
  confirmText:string;
}

export default function ModalComentarioAreas({
  open, onClose, title, label, placeholder,
  comentario, setComentario, loading, onConfirmar, variant, confirmText,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant={variant} loading={loading} onClick={onConfirmar} disabled={!comentario.trim()}>
            {confirmText}
          </Button>
        </>
      }>
      <Input
        label={label}
        placeholder={placeholder}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        required
        autoFocus
      />
    </Modal>
  );
}