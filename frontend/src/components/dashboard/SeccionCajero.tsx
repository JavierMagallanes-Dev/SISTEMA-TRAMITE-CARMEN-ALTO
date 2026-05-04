// src/components/dashboard/SeccionCajero.tsx
import KpiCard from './KpiCard';
import { CheckCircle, TrendingUp, CreditCard } from 'lucide-react';
import { formatMoneda } from '../../utils/formato';
import type { KpisCajero } from '../../hooks/useDashboard';

interface Props { kpis: KpisCajero; }

export default function SeccionCajero({ kpis }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KpiCard label="Pagos verificados hoy" value={kpis.pagos_hoy}              icon={<CheckCircle size={20} />} color="text-green-600"         bg="bg-green-100" />
      <KpiCard label="Total recaudado hoy"   value={formatMoneda(kpis.monto_hoy)} icon={<TrendingUp  size={20} />} color="text-[color:#216ece]"  bg="bg-[color:#eaf2fb]" />
      <KpiCard label="Pendientes de pago"    value={kpis.pendientes_pago}         icon={<CreditCard  size={20} />} color="text-yellow-600"        bg="bg-yellow-100" sublabel="Esperando en ventanilla" />
    </div>
  );
}