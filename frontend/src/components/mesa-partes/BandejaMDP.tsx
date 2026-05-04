// src/components/mesa-partes/BandejaMDP.tsx
// Tabla de expedientes en la bandeja de Mesa de Partes.

import Table       from '../ui/Table';
import Button      from '../ui/Button';
import EstadoBadge from '../shared/EstadoBadge';
import { diasRestantes, colorDiasRestantes } from '../../utils/formato';
import { Eye, FileText, Send, CheckCircle } from 'lucide-react';
import type { ExpedienteBandeja } from '../../hooks/useMesaPartes';

interface Props {
  bandeja:          ExpedienteBandeja[];
  onVerDetalle:     (id: number) => void;
  onDescargarCargo: (id: number, codigo: string) => void;
  onDerivar:        (exp: ExpedienteBandeja) => void;
}

export default function BandejaMDP({
  bandeja, onVerDetalle, onDescargarCargo, onDerivar,
}: Props) {
  return (
    <Table
      keyField="id"
      data={bandeja}
      emptyText="No hay expedientes en bandeja."
      columns={[
        {
          key: 'codigo', header: 'Código',
          render: (r) => <span className="font-mono text-xs text-blue-600 font-semibold">{r.codigo}</span>,
        },
        {
          key: 'ciudadano', header: 'Ciudadano',
          render: (r) => (
            <div>
              <p className="text-sm font-medium text-gray-800">{r.ciudadano.nombres} {r.ciudadano.apellido_pat}</p>
              <p className="text-xs text-gray-400">{r.ciudadano.dni}</p>
            </div>
          ),
        },
        {
          key: 'estado', header: 'Estado',
          render: (r) => <EstadoBadge estado={r.estado} size="sm" />,
        },
        {
          key: 'fecha_limite', header: 'Plazo',
          render: (r) => {
            const dias = diasRestantes(r.fecha_limite);
            return (
              <span className={`text-xs font-medium ${colorDiasRestantes(dias)}`}>
                {dias < 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d restantes`}
              </span>
            );
          },
        },
        {
          key: 'pago', header: 'Pago',
          render: (r) => r.pagos?.length > 0
            ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12} />Verificado</span>
            : <span className="text-xs text-yellow-600">Pendiente</span>,
        },
        {
          key: 'acciones', header: '',
          render: (r) => (
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" icon={<Eye size={12} />} onClick={() => onVerDetalle(r.id)}>Ver</Button>
              <Button size="sm" variant="ghost" icon={<FileText size={12} />} onClick={() => onDescargarCargo(r.id, r.codigo)}>Cargo</Button>
              <Button size="sm" variant="secondary" icon={<Send size={12} />} onClick={() => onDerivar(r)} disabled={!r.pagos || r.pagos.length === 0}>Derivar</Button>
            </div>
          ),
        },
      ]}
    />
  );
}