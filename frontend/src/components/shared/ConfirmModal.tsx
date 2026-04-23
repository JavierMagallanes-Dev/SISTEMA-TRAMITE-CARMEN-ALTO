// src/components/shared/ConfirmModal.tsx
import Modal   from '../ui/Modal';
import Button  from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  open:        boolean;
  onClose:     () => void;
  onConfirm:   () => void;
  title:       string;
  message:     string;
  confirmText?: string;
  loading?:    boolean;
  danger?:     boolean;
}

export default function ConfirmModal({
  open, onClose, onConfirm,
  title, message,
  confirmText = 'Confirmar',
  loading     = false,
  danger      = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && (
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
        )}
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </Modal>
  );
}