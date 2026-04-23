// src/components/ui/Alert.tsx
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type:       AlertType;
  message:    string;
  onClose?:   () => void;
  className?: string;
}

const config: Record<AlertType, { icon: ReactNode; color: string; bg: string }> = {
  success: { icon: <CheckCircle size={16} />,   color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  error:   { icon: <XCircle size={16} />,       color: 'text-red-700',   bg: 'bg-red-50 border-red-200'     },
  warning: { icon: <AlertTriangle size={16} />, color: 'text-yellow-700',bg: 'bg-yellow-50 border-yellow-200'},
  info:    { icon: <Info size={16} />,          color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200'   },
};

export default function Alert({ type, message, onClose, className = '' }: AlertProps) {
  const { icon, color, bg } = config[type];

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${bg} ${color} ${className}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="text-sm flex-1">{message}</p>
      {onClose && (
        <button onClick={onClose} className="shrink-0 hover:opacity-70">
          <X size={14} />
        </button>
      )}
    </div>
  );
}