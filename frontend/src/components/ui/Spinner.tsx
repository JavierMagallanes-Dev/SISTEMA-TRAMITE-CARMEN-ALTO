// src/components/ui/Spinner.tsx
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  text?: string;
  size?: number;
}

export default function Spinner({ text = 'Cargando...', size = 20 }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
      <Loader2 size={size} className="animate-spin" />
      {text && <p className="text-sm">{text}</p>}
    </div>
  );
}