// src/components/cajero/TablaHistorial.tsx

import { Card, CardTitle } from '../ui/Card';
import Button  from '../ui/Button';
import Table   from '../ui/Table';
import { formatFechaHora, formatMoneda } from '../../utils/formato';
import { Ban, FileImage } from 'lucide-react';
import type { PagoHistorial } from '../../hooks/useCajero';

interface Props {
  historial:        { pagos: PagoHistorial[]; total_monto: number };
  onAnular:         (pago: PagoHistorial) => void;
  onVerComprobante: (url: string) => void;
}

export default function TablaHistorial({ historial, onAnular, onVerComprobante }: Props) {
  return (
    <Card padding={false}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <CardTitle>Historial de pagos</CardTitle>
        <span className="text-sm font-semibold text-green-600">
          Total: {formatMoneda(historial.total_monto)}
        </span>
      </div>
      <Table keyField="id" data={historial.pagos} emptyText="No hay pagos registrados"
        columns={[
          { key: 'expediente', header: 'Expediente', render: (r) => (
            <span className="font-mono text-xs text-blue-600 font-semibold">{r.expediente.codigo}</span>
          )},
          { key: 'ciudadano', header: 'Ciudadano', render: (r) => (
            <p className="text-sm text-gray-700">{r.expediente.ciudadano.nombres} {r.expediente.ciudadano.apellido_pat}</p>
          )},
          { key: 'boleta', header: 'Boleta', render: (r) => (
            <span className="text-xs font-mono text-gray-600">{r.boleta}</span>
          )},
          { key: 'monto_cobrado', header: 'Monto', render: (r) => (
            <span className="text-sm font-semibold text-green-600">{formatMoneda(r.monto_cobrado)}</span>
          )},
          { key: 'estado', header: 'Estado', render: (r) => (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              r.estado === 'VERIFICADO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>{r.estado}</span>
          )},
          { key: 'comprobante', header: 'Comprobante', render: (r) => r.url_comprobante ? (
            <button onClick={() => onVerComprobante(r.url_comprobante!)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <FileImage size={12} />Ver
            </button>
          ) : <span className="text-xs text-gray-400">—</span>},
          { key: 'fecha_pago', header: 'Fecha', render: (r) => (
            <span className="text-xs text-gray-500">{formatFechaHora(r.fecha_pago)}</span>
          )},
          { key: 'acciones', header: '', render: (r) => r.estado === 'VERIFICADO' ? (
            <Button size="sm" variant="danger" icon={<Ban size={12} />} onClick={() => onAnular(r)}>
              Anular
            </Button>
          ) : null},
        ]}
      />
    </Card>
  );
}