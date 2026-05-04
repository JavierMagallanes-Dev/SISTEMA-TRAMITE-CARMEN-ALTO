// src/components/usuarios/ModalRequisito.tsx
import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import Input  from '../ui/Input';
import type { TipoTramiteRow, Requisito, FormRequisito } from '../../hooks/useUsuarios';

interface Props {
  open:        boolean;
  onClose:     () => void;
  tramiteReq:  TipoTramiteRow | null;
  editandoReq: Requisito | null;
  form:        FormRequisito;
  setForm:     (f: FormRequisito) => void;
  loading:     boolean;
  onGuardar:   () => void;
}

export default function ModalRequisito({
  open, onClose, tramiteReq, editandoReq, form, setForm, loading, onGuardar,
}: Props) {
  return (
    <Modal open={open} onClose={onClose}
      title={editandoReq ? 'Editar requisito' : `Nuevo requisito — ${tramiteReq?.nombre}`}
      size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={loading} onClick={onGuardar}>{editandoReq ? 'Guardar' : 'Agregar requisito'}</Button></>}>
      <div className="space-y-3">
        <Input label="Nombre del requisito" placeholder="Ej: Copia del DNI"
          value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required autoFocus />
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Descripción <span className="text-gray-400 font-normal">— opcional</span></label>
          <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Instrucciones adicionales para el ciudadano..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
            rows={2} />
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <input type="checkbox" id="obligatorio" checked={form.obligatorio}
            onChange={(e) => setForm({ ...form, obligatorio: e.target.checked })}
            className="w-4 h-4 accent-blue-600" />
          <label htmlFor="obligatorio" className="text-sm text-gray-700 cursor-pointer">
            <strong>Obligatorio</strong> — el ciudadano debe adjuntarlo para continuar
          </label>
        </div>
      </div>
    </Modal>
  );
}