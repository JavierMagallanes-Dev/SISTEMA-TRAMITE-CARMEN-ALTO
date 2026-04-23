// src/components/shared/ExpedienteCard.tsx
import type { Expediente }         from '../../types';
import EstadoBadge            from './EstadoBadge';
import { formatFecha, diasRestantes, colorDiasRestantes } from '../../utils/formato';
import { Calendar, User, FileText, Clock } from 'lucide-react';

interface ExpedienteCardProps {
  expediente: Expediente;
  onClick?:   () => void;
  actions?:   React.ReactNode;
}

export default function ExpedienteCard({
  expediente, onClick, actions,
}: ExpedienteCardProps) {
  const dias = diasRestantes(expediente.fecha_limite);

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-200 p-4 shadow-sm
        ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs font-mono font-semibold text-blue-600">
            {expediente.codigo}
          </p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">
            {expediente.tipoTramite.nombre}
          </p>
        </div>
        <EstadoBadge estado={expediente.estado} size="sm" />
      </div>

      {/* Info ciudadano */}
      <div className="space-y-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <User size={12} />
          <span>
            {expediente.ciudadano.nombres} {expediente.ciudadano.apellido_pat}
          </span>
          <span className="text-gray-300">·</span>
          <span>{expediente.ciudadano.dni}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar size={12} />
          <span>Registrado: {formatFecha(expediente.fecha_registro)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span className={colorDiasRestantes(dias)}>
            {dias < 0
              ? `Vencido hace ${Math.abs(dias)} días`
              : `${dias} días restantes`}
          </span>
        </div>

        {expediente.areaActual && (
          <div className="flex items-center gap-1.5">
            <FileText size={12} />
            <span>{expediente.areaActual.nombre}</span>
          </div>
        )}
      </div>

      {/* Acciones */}
      {actions && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}