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
  movimientos:   Movimiento[];
  soloPublicos?: boolean;
}

// ── Mensajes amigables para el ciudadano por tipo de acción ──
// '' = usar el comentario real (OBSERVACION y RECHAZO)
const MENSAJES_PUBLICOS: Record<string, string> = {
  REGISTRO:          'Tu solicitud fue recibida correctamente.',
  VERIFICACION_PAGO: 'Tu pago fue verificado. El trámite está en proceso.',
  REVISION_MDP:      'Tu expediente está siendo revisado por Mesa de Partes.',
  DERIVACION:        'Tu expediente fue enviado al área técnica correspondiente.',
  TOMA_EXPEDIENTE:   'Un técnico tomó tu expediente para evaluación.',
  VISTO_BUENO:       'Tu expediente fue aprobado y está en etapa de firma.',
  SUBIDA_PDF_FIRMADO:'Tu documento fue firmado digitalmente y está listo para descargar.',
  ARCHIVADO:         'Tu expediente fue archivado correctamente.',
  SUBSANACION:       'Tus documentos fueron revisados y aceptados. El trámite continúa.',
  ANULACION_PAGO:    'Tu pago fue anulado. Comunícate con Mesa de Partes.',
  OBSERVACION:       '',
  RECHAZO:           '',
};

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
    case 'TOMA_EXPEDIENTE':
      return { Icon: Play,        bg: '#ffedd5', border: '#ea580c', color: '#ea580c' };
    case 'VISTO_BUENO':
      return { Icon: Star,        bg: '#e0f2fe', border: '#0284c7', color: '#0284c7' };
    case 'RESOLUCION':
    case 'PDF_FIRMADO':
    case 'SUBIDA_PDF_FIRMADO':
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
    case 'SUBSANACION':
      return { Icon: RotateCcw,   bg: '#eaf2fb', border: '#216ece', color: '#216ece' };
    case 'REVISION_MDP':
    case 'CONFIRMACION':
      return { Icon: UserCheck,   bg: '#ede9fe', border: '#7c3aed', color: '#7c3aed' };
    default:
      return { Icon: FileText,    bg: '#eaf2fb', border: '#216ece', color: '#216ece' };
  }
}

export default function TimelineMovimientos({
  movimientos,
  soloPublicos = false,
}: TimelineMovimientosProps) {

  // 1. Ordenar del más nuevo al más antiguo
  const ordenados = [...movimientos].sort(
    (a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
  );

  // 2. En vista pública eliminar duplicados por estado_resultado
  //    (el backend crea 2 movimientos al subir PDF: PDF_FIRMADO y RESUELTO)
  const visibles = soloPublicos
    ? ordenados.filter((mov, idx, arr) =>
        idx === 0 || mov.estado_resultado !== arr[idx - 1].estado_resultado
      )
    : ordenados;

  if (visibles.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        Sin movimientos registrados.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Línea vertical */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

      <div className="space-y-4">
        {visibles.map((mov, idx) => {
          const { Icon, bg, border, color } = getIconConfig(mov.tipo_accion);

          // Texto del comentario según contexto
          const mensajePublico   = MENSAJES_PUBLICOS[mov.tipo_accion];
          const textoComentario  = soloPublicos
            ? (mensajePublico === '' ? mov.comentario : mensajePublico)
            : mov.comentario;

          const mostrarUsuario = !soloPublicos;

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

                {/* Nombre del empleado — solo en vista interna */}
                {mostrarUsuario && (
                  <p className="text-xs font-medium text-gray-700 mt-1">
                    {mov.usuario?.nombre_completo ?? 'Sistema'}
                    {mov.usuario?.rol && (
                      <span className="text-gray-400 font-normal ml-1">
                        ({mov.usuario.rol.nombre.replace(/_/g, ' ')})
                      </span>
                    )}
                  </p>
                )}

                {/* Comentario / mensaje público */}
                {textoComentario && (
                  <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                    {textoComentario}
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