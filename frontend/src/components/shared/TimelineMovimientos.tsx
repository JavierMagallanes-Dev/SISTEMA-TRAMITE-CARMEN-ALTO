// src/components/shared/TimelineMovimientos.tsx
import type { Movimiento }    from '../../types';
import { formatFechaHora } from '../../utils/formato';
import EstadoBadge       from './EstadoBadge';

interface TimelineMovimientosProps {
  movimientos: Movimiento[];
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
        {movimientos.map((mov, idx) => (
          <div key={idx} className="flex gap-4 relative">
            {/* Punto */}
            <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center shrink-0 z-10">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
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
                    ({mov.usuario.rol.nombre.replace('_', ' ')})
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
        ))}
      </div>
    </div>
  );
}