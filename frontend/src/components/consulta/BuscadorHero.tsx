// src/components/consulta/BuscadorHero.tsx

import { Search, FileText, Phone, Clock, ArrowRight } from 'lucide-react';
import { PRIMARY, TINT } from '../../hooks/useConsulta';

interface Props {
  codigo:      string;
  setCodigo:   (v: string) => void;
  cargando:    boolean;
  onConsultar: () => void;
}

const HELPERS = [
  { Icon: FileText, t: 'Cargo de recepción',   d: 'El código está en la esquina superior del PDF que recibiste al presentar tu expediente.' },
  { Icon: Phone,    t: 'Mesa de Partes',        d: '(066) 123-456 · Lunes a Viernes de 8:00 AM a 4:30 PM' },
  { Icon: Clock,    t: '¿Aún no presentaste?', d: 'Inicia un nuevo trámite desde el portal ciudadano en pocos pasos.' },
];

export default function BuscadorHero({ codigo, setCodigo, cargando, onConsultar }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Hero principal full-width ── */}
      <div className="relative flex-1 flex flex-col justify-center overflow-hidden" style={{
  backgroundImage: `
    radial-gradient(ellipse at 80% 0%, rgba(74,189,239,.35) 0%, transparent 60%),
    radial-gradient(ellipse at 0% 100%, rgba(20,63,122,.85) 0%, transparent 55%),
    linear-gradient(135deg, rgba(20,63,122,0.92) 0%, rgba(33,110,206,0.88) 60%, rgba(42,130,232,0.85) 100%),
    url('/src/assets/headerCA.webp')
  `,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  minHeight: '60vh',
}}>
        {/* Patrón decorativo */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }} />

        <div className="relative max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-2xl">
            {/* Badge institucional */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                Municipalidad Distrital de Carmen Alto
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              Consulta el estado<br />
              <span style={{ color: '#7dd3fc' }}>de tu trámite</span>
            </h1>

            <p className="text-base sm:text-lg text-white/80 mb-8 leading-relaxed max-w-lg">
              Ingresa tu código de expediente para ver en qué área se encuentra y descargar tu resolución.
            </p>

            {/* Buscador grande */}
            <div className="bg-white rounded-2xl p-2 flex items-center gap-2 shadow-2xl max-w-xl"
              style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="pl-3 text-slate-400 shrink-0">
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder="EXP-2026-000001"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && onConsultar()}
                className="flex-1 px-2 py-3 outline-none text-base font-bold tracking-wider text-slate-800 placeholder:text-slate-300 bg-transparent"
                style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
                autoFocus
              />
              <button
                onClick={onConsultar}
                disabled={cargando || !codigo.trim()}
                className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: PRIMARY }}>
                {cargando ? 'Buscando…' : <><span>Consultar</span><ArrowRight size={14} /></>}
              </button>
            </div>

            <p className="text-xs text-white/50 mt-3 ml-1">
              Tu código aparece en el cargo de recepción que recibiste. Ej: EXP-2026-000123
            </p>
          </div>
        </div>

        {/* Ola decorativa inferior */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 10 0 20L0 60Z" fill="#f9fafb" />
          </svg>
        </div>
      </div>

      {/* ── Cards informativas ── */}
      <div className="bg-gray-50 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 text-center">
            ¿Cómo puedo ayudarte?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HELPERS.map(({ Icon, t, d }) => (
              <div key={t}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors"
                  style={{ background: TINT, color: PRIMARY }}>
                  <Icon size={18} />
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1.5">{t}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}