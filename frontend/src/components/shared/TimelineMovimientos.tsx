// src/components/shared/TimelineMovimientos.tsx
import type { Movimiento } from '../../types';
import { formatFechaHora } from '../../utils/formato';
import EstadoBadge         from './EstadoBadge';
import {
  FileText, CreditCard, Send, Eye, Play,
  CheckCircle, XCircle, AlertCircle, Upload,
  Archive, RotateCcw, Star, UserCheck,
} from 'lucide-react';

interface TimelineMovimientosProps {
  movimientos: Movimiento[];
}

// ── Ícono + colores por tipo de acción ───────────────────────
function getIconConfig(tipoAccion: string): {
  Icon:   React.ElementType;
  bg:     string;
  border: string;
  color:  string;
} {
  switch (tipoAccion) {
    case 'REGISTRO':
      return { Icon: FileText,    bg: '#eaf2fb', border: '#216ece', color: '#216ece' };
    case 'VERIFICACION_PAGO':
      return { Icon: CreditCard,  bg: '#dcfce7', border: '#16a34a', color: '#16a34a' };
    case 'DERIVACION':
      return { Icon: Send,        bg: '#ede9fe', border: '#7c3aed', color: '#7c3aed' };
    case 'RECEPCION':
    case 'EN_REVISION':
      return { Icon: Eye,         bg: '#fef3c7', border: '#d97706', color: '#d97706' };
    case 'INICIO_PROCESO':
      return { Icon: Play,        bg: '#ffedd5', border: '#ea580c', color: '#ea580c' };
    case 'VISTO_BUENO':
      return { Icon: Star,        bg: '#e0f2fe', border: '#0284c7', color: '#0284c7' };
    case 'RESOLUCION':
    case 'PDF_FIRMADO':
      return { Icon: CheckCircle, bg: '#dcfce7', border: '#16a34a', color: '#16a34a' };
    case 'OBSERVACION':
      return { Icon: AlertCircle, bg: '#fff7ed', border: '#ea580c', color: '#ea580c' };
    case 'RECHAZO':
    case 'ANULACION_PAGO':
      return { Icon: XCircle,     bg: '#fee2e2', border: '#dc2626', color: '#dc2626' };
    case 'SUBIDA_PDF':
      return { Icon: Upload,      bg: '#f0fdf4', border: '#16a34a', color: '#16a34a' };
    case 'ARCHIVADO':
      return { Icon: Archive,     bg: '#f3f4f6', border: '#6b7280', color: '#6b7280' };
    case 'REACTIVACION':
      return { Icon: RotateCcw,   bg: '#eaf2fb', border: '#216ece', color: '#216ece' };
    case 'CONFIRMACION':
      return { Icon: UserCheck,   bg: '#ede9fe', border: '#7c3aed', color: '#7c3aed' };
    default:
      return { Icon: FileText,    bg: '#eaf2fb', border: '#216ece', color: '#216ece' };
  }
}

export default function TimelineMovimientos({ movimientos }: TimelineMovimientosProps) {
  if (movimientos.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Sin movimientos registrados.</p>;
  }

  return (
    <div className="relative">
      {/* Línea vertical */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

      <div className="space-y-4">
        {movimientos.map((mov, idx) => {
          const { Icon, bg, border, color } = getIconConfig(mov.tipo_accion);
          return (
            <div key={idx} className="flex gap-4 relative">
              {/* Círculo con ícono */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2"
                style={{ backgroundColor: bg, borderColor: border }}
              >
                <Icon size={14} style={{ color }} strokeWidth={2.5} />
              </div>

              {/* Contenido */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <EstadoBadge estado={mov.estado_resultado} size="sm" />
                  <span className="text-xs text-gray-400">
                    {formatFechaHora(mov.fecha_hora)}
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-700 mt-1">
                  {mov.usuario?.nombre_completo ?? 'Sistema'}
                  {mov.usuario?.rol && (
                    <span className="text-gray-400 font-normal ml-1">
                      ({mov.usuario.rol.nombre.replace(/_/g, ' ')})
                    </span>
                  )}
                </p>
                {mov.comentario && (
                  <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                    {mov.comentario}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}