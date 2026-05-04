// src/components/usuarios/TabUsuarios.tsx

import { Card }    from '../ui/Card';
import Button      from '../ui/Button';
import Table       from '../ui/Table';
import { formatFecha } from '../../utils/formato';
import { Pencil, KeyRound, UserX, UserCheck } from 'lucide-react';
import type { UsuarioRow } from '../../hooks/useUsuarios';

interface Props {
  usuarios:           UsuarioRow[];
  filtro:             'todos' | 'activos' | 'inactivos';
  setFiltro:          (f: 'todos' | 'activos' | 'inactivos') => void;
  ROL_LABEL:          Record<string, string>;
  onEditar:           (u: UsuarioRow) => void;
  onResetPassword:    (u: UsuarioRow) => void;
  onDesactivar:       (u: UsuarioRow) => void;
  onActivar:          (u: UsuarioRow) => void;
}

export default function TabUsuarios({
  usuarios, filtro, setFiltro, ROL_LABEL,
  onEditar, onResetPassword, onDesactivar, onActivar,
}: Props) {
  return (
    <>
      <div className="flex gap-1 border-b border-gray-100">
        {(['activos', 'inactivos', 'todos'] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              filtro === f ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{f}</button>
        ))}
      </div>

      <Card padding={false}>
        <Table keyField="id" data={usuarios} emptyText="No hay usuarios"
          columns={[
            { key: 'nombre_completo', header: 'Nombre', render: (r) => (
              <div>
                <p className="text-sm font-medium text-gray-800">{r.nombre_completo}</p>
                <p className="text-xs text-gray-400">{r.dni} · {r.email}</p>
              </div>
            )},
            { key: 'rol', header: 'Rol', render: (r) => (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {ROL_LABEL[r.rol.nombre] ?? r.rol.nombre}
              </span>
            )},
            { key: 'area', header: 'Área', render: (r) => r.area
              ? <span className="text-xs text-gray-600">{r.area.nombre}</span>
              : <span className="text-xs text-gray-300">—</span>
            },
            { key: 'activo', header: 'Estado', render: (r) => (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {r.activo ? 'Activo' : 'Inactivo'}
              </span>
            )},
            { key: 'created_at', header: 'Creado', render: (r) => (
              <span className="text-xs text-gray-400">{formatFecha(r.created_at)}</span>
            )},
            { key: 'acciones', header: '', render: (r) => (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" icon={<Pencil   size={12} />} onClick={() => onEditar(r)}>Editar</Button>
                <Button size="sm" variant="ghost" icon={<KeyRound size={12} />} onClick={() => onResetPassword(r)}>Password</Button>
                {r.activo
                  ? <Button size="sm" variant="ghost" icon={<UserX     size={12} />} onClick={() => onDesactivar(r)}>Desactivar</Button>
                  : <Button size="sm" variant="ghost" icon={<UserCheck size={12} />} onClick={() => onActivar(r)}>Activar</Button>
                }
              </div>
            )},
          ]}
        />
      </Card>
    </>
  );
}