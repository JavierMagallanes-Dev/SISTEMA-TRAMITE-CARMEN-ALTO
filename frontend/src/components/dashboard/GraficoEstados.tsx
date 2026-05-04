// src/components/dashboard/GraficoEstados.tsx
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card } from '../ui/Card';

interface DataPoint {
  estado: string; estadoLabel: string; short: string; cantidad: number; fillColor: string;
}

interface TooltipProps { active?: boolean; payload?: any[]; }

function BarTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{p.payload.estadoLabel}</p>
      <p className="text-gray-500 mt-0.5">
        <span className="font-bold" style={{ color: p.payload.fillColor }}>{p.value}</span> expedientes
      </p>
    </div>
  );
}

interface Props { data: DataPoint[]; }

export default function GraficoEstados({ data }: Props) {
  return (
    <Card className="xl:col-span-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Expedientes por estado</h3>
          <p className="text-xs text-gray-500 mt-0.5">Distribución actual del flujo de trámites</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-md font-medium" style={{ backgroundColor: '#eaf2fb', color: '#216ece' }}>
          Tiempo real
        </span>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">Sin datos disponibles.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="short" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(33,110,206,0.06)' }} />
            <Bar dataKey="cantidad" radius={[6,6,0,0]} maxBarSize={42}>
              {data.map((d) => <Cell key={d.estado} fill={d.fillColor} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}