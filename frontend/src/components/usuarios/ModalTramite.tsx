// src/components/usuarios/ModalTramite.tsx
import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import Input  from '../ui/Input';
import type { TipoTramiteRow, FormTramite } from '../../hooks/useUsuarios';

interface Props {
  open:       boolean;
  onClose:    () => void;
  editando:   TipoTramiteRow | null;
  form:       FormTramite;
  setFT:      (field: string, value: string) => void;
  loading:    boolean;
  onGuardar:  () => void;
}

export default function ModalTramite({ open, onClose, editando, form, setFT, loading, onGuardar }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar trámite' : 'Nuevo trámite'} size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={loading} onClick={onGuardar}>{editando ? 'Guardar cambios' : 'Crear trámite'}</Button></>}>
      <div className="space-y-3">
        <Input label="Nombre del trámite" placeholder="Ej: Licencia de Construcción" value={form.nombre} onChange={(e) => setFT('nombre', e.target.value)} required autoFocus />
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Descripción <span className="text-gray-400 font-normal">— opcional</span></label>
          <textarea value={form.descripcion} onChange={(e) => setFT('descripcion', e.target.value)}
            placeholder="Descripción breve del trámite para el ciudadano..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
            rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Plazo (días hábiles)" type="number" placeholder="15" value={form.plazo_dias} onChange={(e) => setFT('plazo_dias', e.target.value)} required helper="Días hábiles para resolver" />
          <Input label="Costo (S/)" type="number" placeholder="0.00" value={form.costo_soles} onChange={(e) => setFT('costo_soles', e.target.value)} required helper="Monto en soles" />
        </div>
      </div>
    </Modal>
  );
}