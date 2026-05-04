// src/components/consulta/BuscadorCompacto.tsx
import { Search } from 'lucide-react';
import { PRIMARY } from '../../hooks/useConsulta';

interface Props {
  codigo:      string;
  setCodigo:   (v: string) => void;
  cargando:    boolean;
  onConsultar: () => void;
}

export default function BuscadorCompacto({ codigo, setCodigo, cargando, onConsultar }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 flex items-center gap-2 shadow-sm overflow-hidden">
      <div className="pl-3 text-slate-400 shrink-0">
        <Search size={15} />
      </div>
      <input
        type="text"
        placeholder="EXP-2026-000001"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && onConsultar()}
        className="flex-1 px-1 py-2.5 outline-none text-sm font-bold text-slate-800 placeholder:text-slate-300 bg-transparent"
        style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
      />
      <button
        onClick={onConsultar}
        disabled={cargando || !codigo.trim()}
        className="shrink-0 px-4 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50 hover:opacity-90"
        style={{ background: PRIMARY }}>
        {cargando ? '…' : 'Consultar'}
      </button>
    </div>
  );
}