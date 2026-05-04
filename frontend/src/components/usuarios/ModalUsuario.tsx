// src/components/usuarios/ModalUsuario.tsx
import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import Input  from '../ui/Input';
import type { Area }        from '../../types';
import type { UsuarioRow, FormUsuario } from '../../hooks/useUsuarios';

interface Props {
  open:       boolean;
  onClose:    () => void;
  editando:   UsuarioRow | null;
  form:       FormUsuario;
  setF:       (field: string, value: string) => void;
  areas:      Area[];
  roles:      string[];
  ROL_LABEL:  Record<string, string>;
  loading:    boolean;
  onGuardar:  () => void;
}

export default function ModalUsuario({
  open, onClose, editando, form, setF, areas, roles, ROL_LABEL, loading, onGuardar,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar usuario' : 'Nuevo usuario'} size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={loading} onClick={onGuardar}>{editando ? 'Guardar cambios' : 'Crear usuario'}</Button></>}>
      <div className="space-y-3">
        {!editando && <Input label="DNI" placeholder="12345678" value={form.dni} onChange={(e) => setF('dni', e.target.value)} maxLength={8} required />}
        <Input label="Nombre completo" value={form.nombre_completo} onChange={(e) => setF('nombre_completo', e.target.value)} required />
        <Input label="Email institucional" type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} required />
        {!editando && <Input label="Contraseña" type="password" value={form.password} onChange={(e) => setF('password', e.target.value)} required />}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Rol <span className="text-red-500">*</span></label>
          <select value={form.rolNombre} onChange={(e) => setF('rolNombre', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
            <option value="">Seleccionar rol...</option>
            {roles.map((r) => <option key={r} value={r}>{ROL_LABEL[r] ?? r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Área</label>
          <select value={form.areaId} onChange={(e) => setF('areaId', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
            <option value="">Sin área asignada</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.sigla})</option>)}
          </select>
        </div>
        {(form.rolNombre === 'MESA_DE_PARTES' || editando?.rol?.nombre === 'MESA_DE_PARTES') && (
          <Input
            label={editando ? 'Nuevo PIN de derivación (vacío = no cambiar)' : 'PIN de derivación'}
            placeholder="4 a 6 dígitos" type="password"
            value={form.pin_derivacion}
            onChange={(e) => setF('pin_derivacion', e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            helper="PIN numérico que el funcionario usará para confirmar derivaciones."
          />
        )}
      </div>
    </Modal>
  );
}