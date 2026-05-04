// src/components/consulta/BuscadorHero.tsx
import Button from '../ui/Button';
import { Search, FileText, Phone, Clock } from 'lucide-react';
import { PRIMARY, PRIMARY_DARKER, TINT } from '../../hooks/useConsulta';

interface Props {
  codigo:    string;
  setCodigo: (v: string) => void;
  cargando:  boolean;
  onConsultar: () => void;
}

const HELPERS = [
  { Icon: FileText, t: 'Cargo de recepción',    d: 'El código está en la esquina superior del PDF que recibiste.' },
  { Icon: Phone,    t: 'Mesa de Partes',         d: '(066) 123-456 — L a V de 8:00 a 16:30' },
  { Icon: Clock,    t: '¿Aún no presentaste?',  d: 'Inicia un nuevo trámite desde el portal en pocos pasos.' },
];

export default function BuscadorHero({ codigo, setCodigo, cargando, onConsultar }: Props) {
  return (
    <div className="space-y-5">
      <div className="relative rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(33,110,206,0.20)]">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(circle at 92% 0%, rgba(74,189,239,.18) 0%, transparent 55%),
            radial-gradient(circle at 0% 95%, rgba(74,189,239,.10) 0%, transparent 60%),
            linear-gradient(135deg, ${PRIMARY_DARKER} 0%, ${PRIMARY} 65%, #2a82e8 100%)
          `,
        }} />
        <div className="relative p-7 sm:p-9 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 mb-2">Plataforma oficial</p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-1">Consulta el estado de tu trámite</h1>
          <p className="text-sm text-white/85 mb-6 max-w-lg">
            Ingresa tu código de expediente para ver en qué área se encuentra, sus movimientos y descargar tu resolución.
          </p>
          <div className="bg-white rounded-xl p-2 flex items-center gap-2 max-w-xl shadow-md">
            <div className="pl-3 text-slate-400"><Search size={18} /></div>
            <input
              type="text"
              placeholder="EXP-2026-000001"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && onConsultar()}
              className="flex-1 px-2 py-2.5 outline-none text-sm font-semibold tracking-wider text-slate-800 placeholder:text-slate-400"
              style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
            />
            <Button onClick={onConsultar} loading={cargando} className="shrink-0">Consultar</Button>
          </div>
          <p className="text-[11px] text-white/65 mt-3">
            Tu código aparece en el cargo de recepción que recibiste al presentar tu expediente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {HELPERS.map(({ Icon, t, d }) => (
          <div key={t} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: TINT, color: PRIMARY }}>
              <Icon size={16} />
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-3">{t}</p>
            <p className="text-xs text-slate-500 mt-1">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}