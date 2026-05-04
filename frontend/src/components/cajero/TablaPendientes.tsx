// src/components/cajero/TablaPendientes.tsx

import { Card }   from '../ui/Card';
import Button     from '../ui/Button';
import Table      from '../ui/Table';
import { formatFecha, formatMoneda } from '../../utils/formato';
import { CreditCard, Eye, FileImage } from 'lucide-react';
import type { ExpedientePendiente } from '../../hooks/useCajero';

interface Props {
  pendientes:        ExpedientePendiente[];
  onVerificarPago:   (exp: ExpedientePendiente) => void;
  onVerComprobante:  (url: string) => void;
}

export default function TablaPendientes({ pendientes, onVerificarPago, onVerComprobante }: Props) {
  return (
    <Card padding={false}>
      <Table keyField="id" data={pendientes} emptyText="No hay expedientes pendientes de pago"
        columns={[
          { key: 'codigo', header: 'Código', render: (r) => (
            <div>
              <span className="font-mono text-xs text-blue-600 font-semibold">{r.codigo}</span>
              {r.pagos?.[0]?.url_comprobante && (
                <div className="flex items-center gap-1 mt-1">
                  <FileImage size={11} className="text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Comprobante adjunto</span>
                </div>
              )}
            </div>
          )},
          { key: 'ciudadano', header: 'Ciudadano', render: (r) => (
            <div>
              <p className="text-sm font-medium text-gray-800">{r.ciudadano.nombres} {r.ciudadano.apellido_pat}</p>
              <p className="text-xs text-gray-400">{r.ciudadano.dni}</p>
            </div>
          )},
          { key: 'tipoTramite', header: 'Trámite', render: (r) => (
            <div>
              <p className="text-sm text-gray-700">{r.tipoTramite.nombre}</p>
              <p className="text-xs font-semibold text-green-600">{formatMoneda(r.tipoTramite.costo_soles)}</p>
            </div>
          )},
          { key: 'fecha_registro', header: 'Registrado', render: (r) => (
            <span className="text-xs text-gray-500">{formatFecha(r.fecha_registro)}</span>
          )},
          { key: 'acciones', header: '', render: (r) => (
            <div className="flex items-center gap-2">
              {r.pagos?.[0]?.url_comprobante && (
                <Button size="sm" variant="secondary" icon={<Eye size={12} />}
                  onClick={() => onVerComprobante(r.pagos[0].url_comprobante!)}>
                  Ver comprobante
                </Button>
              )}
              <Button size="sm" icon={<CreditCard size={12} />} onClick={() => onVerificarPago(r)}>
                Verificar pago
              </Button>
            </div>
          )},
        ]}
      />
    </Card>
  );
}