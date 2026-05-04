// src/components/dashboard/GraficoTendencia.tsx
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card } from '../ui/Card';

interface DataPoint { dia: string; registrados: number; resueltos: number; }
interface TooltipProps { active?: boolean; payload?: any[]; label?: string; }

function LineTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500 capitalize">{p.dataKey}:</span>
          <span className="font-bold text-gray-800">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

interface Props { data: DataPoint[]; }

export default function GraficoTendencia({ data }: Props) {
  return (
    <Card className="xl:col-span-2">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-800">Tendencia últimos 7 días</h3>
        <p className="text-xs text-gray-500 mt-0.5">Registrados vs resueltos por día</p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">Sin datos disponibles.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="ca-grad-reg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#216ece" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#216ece" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ca-grad-res" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#4abdef" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4abdef" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip content={<LineTooltip />} />
              <Area type="monotone" dataKey="registrados" stroke="#216ece" strokeWidth={2.5} fill="url(#ca-grad-reg)" />
              <Area type="monotone" dataKey="resueltos"   stroke="#4abdef" strokeWidth={2.5} fill="url(#ca-grad-res)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#216ece' }} />
              <span className="text-gray-600">Registrados</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#4abdef' }} />
              <span className="text-gray-600">Resueltos</span>
            </span>
          </div>
        </>
      )}
    </Card>
  );
}