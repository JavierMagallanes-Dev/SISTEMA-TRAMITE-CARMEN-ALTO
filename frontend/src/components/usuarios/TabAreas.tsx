// src/components/usuarios/TabAreas.tsx

import { Card }  from '../ui/Card';
import Button    from '../ui/Button';
import Table     from '../ui/Table';
import { Pencil, Trash2 } from 'lucide-react';
import type { Area }        from '../../types';
import type { UsuarioRow }  from '../../hooks/useUsuarios';

interface Props {
  areas:        Area[];
  usuarios:     UsuarioRow[];
  onEditar:     (a: Area) => void;
  onEliminar:   (a: Area) => void;
}

export default function TabAreas({ areas, usuarios, onEditar, onEliminar }: Props) {
  return (
    <Card padding={false}>
      <Table keyField="id" data={areas} emptyText="No hay áreas registradas"
        columns={[
          { key: 'nombre', header: 'Nombre', render: (a) => (
            <p className="text-sm font-medium text-gray-800">{a.nombre}</p>
          )},
          { key: 'sigla', header: 'Sigla', render: (a) => (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">{a.sigla}</span>
          )},
          { key: 'usuarios', header: 'Usuarios', render: (a) => (
            <span className="text-xs text-gray-500">
              {usuarios.filter(u => u.area?.id === a.id).length} usuario(s)
            </span>
          )},
          { key: 'acciones', header: '', render: (a) => (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => onEditar(a)}>Editar</Button>
              <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={() => onEliminar(a)}
                className="text-red-500 hover:text-red-700">Eliminar</Button>
            </div>
          )},
        ]}
      />
    </Card>
  );
}