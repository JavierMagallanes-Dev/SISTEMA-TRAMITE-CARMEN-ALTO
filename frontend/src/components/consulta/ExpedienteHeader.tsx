// src/components/consulta/ExpedienteHeader.tsx
import EstadoBadge from '../shared/EstadoBadge';
import { colorDiasRestantes } from '../../utils/formato';
import { formatFecha }        from '../../utils/formato';
import { User }               from 'lucide-react';
import { PRIMARY, PRIMARY_DARKER } from '../../hooks/useConsulta';
import type { ExpedientePublico }  from '../../hooks/useConsulta';
import type { EstadoExpediente }   from '../../types';

// ── Stepper ───────────────────────────────────────────────────
const stepFromEstado = (estado: EstadoExpediente): number => {
  switch (estado) {
    case 'PENDIENTE_PAGO': return 1;
    case 'EN_PROCESO':     return 2;
    case 'OBSERVADO':      return 2;
    case 'RESUELTO':       return 3;
    case 'ARCHIVADO':      return 3;
    default:               return 0;
  }
};

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = ['Recibido', 'Pago', 'En área', 'Resuelto'];
  return (
    <div className="flex items-center mt-5 relative z-10">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className="w-3.5 h-3.5 rounded-full border-2 transition-all" style={{
              background:  i < currentStep ? PRIMARY : 'white',
              borderColor: i <= currentStep ? PRIMARY : '#cbd5e1',
              boxShadow:   i === currentStep ? `0 0 0 4px rgba(33,110,206,.18)` : i < currentStep ? `0 0 0 3px rgba(33,110,206,.15)` : 'none',
            }} />
            <span className={`mt-1.5 text-[10px] whitespace-nowrap ${i === currentStep ? 'font-bold text-white' : i < currentStep ? 'font-medium text-white/85' : 'font-medium text-white/55'}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="h-0.5 flex-1 mx-1.5 -mt-4" style={{ background: i < currentStep ? PRIMARY : '#e2e8f0' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────
interface Props { expediente: ExpedientePublico; }

export default function ExpedienteHeader({ expediente }: Props) {
  return (
    <>
      {/* Banner */}
      <div className="relative px-5 sm:px-6 pt-5 pb-5 text-white overflow-hidden" style={{
        background: `
          radial-gradient(circle at 92% 0%, rgba(74,189,239,.18) 0%, transparent 55%),
          radial-gradient(circle at 0% 95%, rgba(74,189,239,.10) 0%, transparent 60%),
          linear-gradient(135deg, ${PRIMARY_DARKER} 0%, ${PRIMARY} 65%, #2a82e8 100%)
        `,
      }}>
        <div className="relative z-10 flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">Expediente</p>
            <p className="text-2xl font-bold mt-0.5 tracking-wide" style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
              {expediente.codigo}
            </p>
            <p className="text-sm text-white/85 mt-1.5 max-w-md">{expediente.tipoTramite.nombre}</p>
          </div>
          <EstadoBadge estado={expediente.estado} />
        </div>
        <Stepper currentStep={stepFromEstado(expediente.estado)} />
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1"><User size={10} /> Ciudadano</p>
          <p className="text-sm font-semibold text-slate-800 mt-1 leading-tight">{expediente.ciudadano.nombres} {expediente.ciudadano.apellido_pat}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Área actual</p>
          <p className="text-sm font-semibold text-slate-800 mt-1">{expediente.areaActual?.nombre ?? 'Mesa de Partes'}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Registro</p>
          <p className="text-sm font-semibold text-slate-800 mt-1">{formatFecha(expediente.fecha_registro)}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Plazo</p>
          <p className="text-sm font-semibold text-slate-800 mt-1">{formatFecha(expediente.fecha_limite)}</p>
          <p className={`text-[11px] font-medium ${colorDiasRestantes(expediente.dias_restantes)}`}>
            {expediente.vencido ? `vencido hace ${Math.abs(expediente.dias_restantes)}d` : `${expediente.dias_restantes}d restantes`}
          </p>
        </div>
      </div>
    </>
  );
}