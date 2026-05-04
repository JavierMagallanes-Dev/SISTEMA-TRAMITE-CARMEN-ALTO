// src/components/dashboard/SeccionAreaTecnica.tsx
import { Card }  from '../ui/Card';
import KpiCard   from './KpiCard';
import { FileText, Clock, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import type { KpisAreaTecnica } from '../../hooks/useDashboard';

interface Props { kpis: KpisAreaTecnica; }

export default function SeccionAreaTecnica({ kpis }: Props) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total en bandeja" value={kpis.total_en_bandeja} icon={<FileText      size={20} />} color="text-[color:#216ece]" bg="bg-[color:#eaf2fb]" />
        <KpiCard label="En proceso"       value={kpis.en_proceso}       icon={<Clock        size={20} />} color="text-orange-600"      bg="bg-orange-100" />
        <KpiCard label="Listo para firma" value={kpis.listo_descarga}   icon={<CheckCircle  size={20} />} color="text-cyan-600"        bg="bg-cyan-100" />
        <KpiCard label="Observados"       value={kpis.observados}       icon={<AlertTriangle size={20} />} color="text-red-600"        bg="bg-red-100" />
      </div>
      <Card>
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eaf2fb' }}>
            <Send size={18} style={{ color: '#216ece' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Ir a tu bandeja</p>
            <p className="text-xs text-gray-500">Ver expedientes asignados a tu área</p>
          </div>
          <a href="/areas" className="text-sm font-medium hover:underline" style={{ color: '#216ece' }}>Ver bandeja →</a>
        </div>
      </Card>
    </>
  );
}