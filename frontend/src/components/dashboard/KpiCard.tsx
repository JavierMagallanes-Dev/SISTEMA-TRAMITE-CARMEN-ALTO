// src/components/dashboard/KpiCard.tsx
import { Card } from '../ui/Card';

interface Props {
  label:     string;
  value:     number | string;
  icon:      React.ReactNode;
  color:     string;
  bg:        string;
  sublabel?: string;
}

export default function KpiCard({ label, value, icon, color, bg, sublabel }: Props) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <span className={color}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}