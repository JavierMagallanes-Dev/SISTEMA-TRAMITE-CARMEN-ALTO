// src/components/consulta/BuscadorCompacto.tsx
import Button from '../ui/Button';
import { Search } from 'lucide-react';

interface Props {
  codigo:    string;
  setCodigo: (v: string) => void;
  cargando:  boolean;
  onConsultar: () => void;
}

export default function BuscadorCompacto({ codigo, setCodigo, cargando, onConsultar }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 flex items-center gap-2 shadow-sm">
      <div className="pl-1 text-slate-400"><Search size={14} /></div>
      <input
        type="text"
        placeholder="EXP-2026-000001"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && onConsultar()}
        className="flex-1 px-1 py-1.5 outline-none text-sm font-semibold text-slate-800"
        style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
      />
      <Button size="sm" onClick={onConsultar} loading={cargando}>Consultar</Button>
    </div>
  );
}