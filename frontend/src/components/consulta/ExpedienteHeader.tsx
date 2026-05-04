// src/components/consulta/ExpedienteHeader.tsx
import EstadoBadge            from '../shared/EstadoBadge';
import { colorDiasRestantes, formatFecha } from '../../utils/formato';
import { PRIMARY, PRIMARY_DARKER }         from '../../hooks/useConsulta';
import type { ExpedientePublico }          from '../../hooks/useConsulta';
import type { EstadoExpediente }           from '../../types';
import { MapPin, Calendar, Clock }         from 'lucide-react';

// ── Stepper ────────────────────────────────────────────────────
const STEPS = ['Recibido', 'Pago', 'En proceso', 'Resuelto'];

const stepFromEstado = (estado: EstadoExpediente): number => {
  switch (estado) {
    case 'PENDIENTE_PAGO':  return 1;
    case 'RECIBIDO':        return 1;
    case 'EN_REVISION_MDP': return 1;
    case 'DERIVADO':        return 2;
    case 'EN_PROCESO':      return 2;
    case 'OBSERVADO':       return 2;
    case 'LISTO_DESCARGA':  return 3;
    case 'PDF_FIRMADO':     return 3;
    case 'RESUELTO':        return 4;
    case 'ARCHIVADO':       return 4;
    default:                return 0;
  }
};

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0 mt-6">
      {STEPS.map((label, i) => {
        const done    = i + 1 < currentStep;
        const active  = i + 1 === currentStep;
        const pending = i + 1 > currentStep;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center shrink-0">
              {/* Círculo */}
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                done   ? 'bg-white border-white text-blue-600' :
                active ? 'bg-white/20 border-white text-white' :
                         'bg-transparent border-white/30 text-white/40'
              }`}
                style={active ? { boxShadow: '0 0 0 4px rgba(255,255,255,0.2)' } : undefined}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`mt-1.5 text-[10px] whitespace-nowrap font-medium ${
                done || active ? 'text-white' : 'text-white/40'
              }`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-0.5 flex-1 mx-2 -mt-4 rounded-full transition-all"
                style={{ background: i + 1 < currentStep ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────
interface Props { expediente: ExpedientePublico; }

export default function ExpedienteHeader({ expediente }: Props) {
  const step = stepFromEstado(expediente.estado);

  return (
    <>
      {/* Banner principal */}
      <div className="relative px-6 sm:px-8 pt-8 pb-8 text-white overflow-hidden" style={{
        background: `
          radial-gradient(ellipse at 90% 0%, rgba(74,189,239,.25) 0%, transparent 55%),
          radial-gradient(ellipse at 0% 100%, rgba(74,189,239,.12) 0%, transparent 55%),
          linear-gradient(135deg, ${PRIMARY_DARKER} 0%, ${PRIMARY} 60%, #2a82e8 100%)
        `,
      }}>
        {/* Patrón de fondo */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />

        <div className="relative z-10">
          {/* Código + estado */}
          <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 mb-1">Expediente</p>
              <p className="text-3xl font-bold tracking-wide" style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                {expediente.codigo}
              </p>
            </div>
            <EstadoBadge estado={expediente.estado} />
          </div>

          {/* Trámite */}
          <p className="text-sm text-white/80 font-medium mb-1">{expediente.tipoTramite.nombre}</p>
          <p className="text-sm text-white/70">
            {expediente.ciudadano.nombres} {expediente.ciudadano.apellido_pat}
          </p>

          {/* Stepper */}
          <Stepper currentStep={step} />
        </div>
      </div>

      {/* Meta info strip */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white">
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <MapPin size={14} className="text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Área actual</p>
            <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
              {expediente.areaActual?.nombre ?? 'Mesa de Partes'}
            </p>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <Calendar size={14} className="text-green-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Registrado</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{formatFecha(expediente.fecha_registro)}</p>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <Clock size={14} className="text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Vence</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{formatFecha(expediente.fecha_limite)}</p>
            <p className={`text-[10px] font-semibold mt-0.5 ${colorDiasRestantes(expediente.dias_restantes)}`}>
              {expediente.vencido
                ? `Vencido hace ${Math.abs(expediente.dias_restantes)}d`
                : `${expediente.dias_restantes}d restantes`}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}