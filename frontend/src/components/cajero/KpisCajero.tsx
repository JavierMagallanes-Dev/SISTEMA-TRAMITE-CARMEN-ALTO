// src/components/cajero/KpisCajero.tsx

import { Card }       from '../ui/Card';
import { CreditCard } from 'lucide-react';
import { formatMoneda } from '../../utils/formato';
import type { ResumenHoy } from '../../hooks/useCajero';

interface Props { resumenHoy: ResumenHoy; }

export default function KpisCajero({ resumenHoy }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <CreditCard size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{resumenHoy.pagos_verificados_hoy}</p>
            <p className="text-xs text-gray-500">Pagos verificados hoy</p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <CreditCard size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatMoneda(resumenHoy.total_recaudado_hoy)}</p>
            <p className="text-xs text-gray-500">Total recaudado hoy</p>
          </div>
        </div>
      </Card>
    </div>
  );
}