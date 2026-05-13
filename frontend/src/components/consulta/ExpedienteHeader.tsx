// src/components/consulta/ExpedienteHeader.tsx
import EstadoBadge            from '../shared/EstadoBadge';
import { colorDiasRestantes, formatFecha } from '../../utils/formato';
import { PRIMARY, PRIMARY_DARKER }         from '../../hooks/useConsulta';
import type { ExpedientePublico }          from '../../hooks/useConsulta';
import type { EstadoExpediente }           from '../../types';
import { MapPin, Calendar, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

// ── Pasos del stepper por estado ──────────────────────────────
interface Step {
  label:    string;
  sublabel: string;
}

const getSteps = (tipoTramiteId?: number): Step[] => {
  // Matrimonio Civil — flujo con edicto
  if (tipoTramiteId === 5) {
    return [
      { label: 'Solicitud',   sublabel: 'Registro y pago' },
      { label: 'Verificación', sublabel: 'Documentos y edicto' },
      { label: 'Evaluación',  sublabel: 'Período de oposición' },
      { label: 'Celebración', sublabel: 'Acta firmada' },
    ];
  }
  // Licencia de Edificación — flujo técnico
  if (tipoTramiteId === 3) {
    return [
      { label: 'Solicitud',   sublabel: 'Registro y pago' },
      { label: 'Revisión',    sublabel: 'Planos y SUNARP' },
      { label: 'Inspección',  sublabel: 'Visita al predio' },
      { label: 'Licencia',    sublabel: 'Autorización emitida' },
    ];
  }
  // Feria y genérico
  return [
    { label: 'Solicitud',   sublabel: 'Registro y pago' },
    { label: 'Evaluación',  sublabel: 'Revisión técnica' },
    { label: 'Aprobación',  sublabel: 'Firma del jefe' },
    { label: 'Resuelto',    sublabel: 'Listo para recoger' },
  ];
};

const stepFromEstado = (estado: EstadoExpediente): number => {
  switch (estado) {
    case 'PENDIENTE_PAGO':  return 1;
    case 'RECIBIDO':        return 1;
    case 'EN_REVISION_MDP': return 2;
    case 'DERIVADO':        return 2;
    case 'EN_PROCESO':      return 3;
    case 'OBSERVADO':       return 3;
    case 'LISTO_DESCARGA':  return 3;
    case 'PDF_FIRMADO':     return 4;
    case 'RESUELTO':        return 4;
    case 'ARCHIVADO':       return 4;
    default:                return 1;
  }
};

const isEstadoNegativo = (estado: EstadoExpediente): boolean =>
  estado === 'RECHAZADO';

const isEstadoObservado = (estado: EstadoExpediente): boolean =>
  estado === 'OBSERVADO';

// ── Stepper ────────────────────────────────────────────────────
function Stepper({
  currentStep,
  estado,
  tipoTramiteId,
}: {
  currentStep:   number;
  estado:        EstadoExpediente;
  tipoTramiteId?: number;
}) {
  const steps    = getSteps(tipoTramiteId);
  const negativo = isEstadoNegativo(estado);
  const observado = isEstadoObservado(estado);

  return (
    <div className="flex items-start gap-0 mt-6">
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const done    = stepNum < currentStep;
        const active  = stepNum === currentStep;
       

        // Color del círculo
        let circleClass: string;
        let circleStyle: React.CSSProperties = {};
        let circleContent: React.ReactNode = stepNum;

        if (done) {
          circleClass = 'bg-white border-white text-blue-600';
          circleContent = <CheckCircle size={14} />;
        } else if (active && negativo) {
          circleClass = 'bg-red-500 border-red-300 text-white';
          circleContent = <XCircle size={14} />;
        } else if (active && observado) {
          circleClass = 'bg-amber-400 border-amber-200 text-white';
          circleContent = <AlertCircle size={14} />;
          circleStyle = { boxShadow: '0 0 0 4px rgba(251,191,36,0.3)' };
        } else if (active) {
          circleClass = 'bg-white/20 border-white text-white';
          circleStyle = { boxShadow: '0 0 0 4px rgba(255,255,255,0.2)' };
        } else {
          circleClass = 'bg-transparent border-white/30 text-white/40';
        }

        return (
          <div key={step.label} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center shrink-0">
              {/* Círculo */}
              <div
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${circleClass}`}
                style={circleStyle}
              >
                {circleContent}
              </div>
              {/* Label */}
              <span className={`mt-1.5 text-[10px] whitespace-nowrap font-bold ${
                done || active ? 'text-white' : 'text-white/40'
              }`}>
                {step.label}
              </span>
              {/* Sublabel */}
              <span className={`text-[9px] whitespace-nowrap ${
                active ? 'text-white/70' : 'text-white/30'
              }`}>
                {step.sublabel}
              </span>
            </div>
            {/* Línea conectora */}
            {i < steps.length - 1 && (
              <div
                className="h-0.5 flex-1 mx-1.5 mt-3.5 rounded-full transition-all"
                style={{
                  background: done
                    ? 'rgba(255,255,255,0.8)'
                    : 'rgba(255,255,255,0.2)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Etiqueta de estado observado/rechazado ────────────────────
function AlertaBanner({ estado }: { estado: EstadoExpediente }) {
  if (estado === 'OBSERVADO') {
    return (
      <div className="mx-6 sm:mx-8 -mt-2 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <AlertCircle size={16} className="text-amber-500 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-800">Expediente observado</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Tu expediente requiere correcciones. Revisa el historial para ver qué documentos necesitas subsanar.
          </p>
        </div>
      </div>
    );
  }
  if (estado === 'RECHAZADO') {
    return (
      <div className="mx-6 sm:mx-8 -mt-2 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <XCircle size={16} className="text-red-500 shrink-0" />
        <div>
          <p className="text-xs font-bold text-red-800">Expediente rechazado</p>
          <p className="text-xs text-red-600 mt-0.5">
            Tu expediente fue rechazado. Revisa el historial para ver el motivo y comunícate con Mesa de Partes.
          </p>
        </div>
      </div>
    );
  }
  return null;
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
          <Stepper
            currentStep={step}
            estado={expediente.estado}
            tipoTramiteId={expediente.tipoTramiteId}
          />
        </div>
      </div>

      {/* Alerta de observado/rechazado */}
      <AlertaBanner estado={expediente.estado} />

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