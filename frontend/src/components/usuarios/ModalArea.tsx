// src/components/usuarios/ModalArea.tsx
import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import Input  from '../ui/Input';
import type { Area }      from '../../types';
import type { FormArea }  from '../../hooks/useUsuarios';

interface Props {
  open:       boolean;
  onClose:    () => void;
  editando:   Area | null;
  form:       FormArea;
  setFA:      (field: string, value: string) => void;
  loading:    boolean;
  onGuardar:  () => void;
}

export default function ModalArea({ open, onClose, editando, form, setFA, loading, onGuardar }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar área' : 'Nueva área'} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={loading} onClick={onGuardar}>{editando ? 'Guardar cambios' : 'Crear área'}</Button></>}>
      <div className="space-y-3">
        <Input label="Nombre del área" placeholder="Ej: Área de Urbanismo" value={form.nombre} onChange={(e) => setFA('nombre', e.target.value)} required autoFocus />
        <Input label="Sigla" placeholder="Ej: URB" value={form.sigla} onChange={(e) => setFA('sigla', e.target.value.toUpperCase())} maxLength={10} required helper="Identificador corto (máx 10 caracteres)" />
      </div>
    </Modal>
  );
}