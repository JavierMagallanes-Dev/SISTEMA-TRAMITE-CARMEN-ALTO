// src/components/auditoria/TabResumen.tsx

import { Card, CardTitle } from '../ui/Card';
import EstadoBadge         from '../shared/EstadoBadge';
import { formatFechaHora } from '../../utils/formato';
import { Activity, TrendingUp, FileText, CheckCircle, User, ArrowRight, Clock } from 'lucide-react';
import type { ResumenData, ACCION_LABEL as AcLabel } from '../../hooks/useAuditoria';
import type { EstadoExpediente } from '../../types';

interface Props {
  resumen:      ResumenData;
  accionLabel:  typeof AcLabel;
}

export default function TabResumen({ resumen, accionLabel }: Props) {
  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Activity size={18} className="text-blue-600" /></div><div><p className="text-2xl font-bold text-gray-900">{resumen.hoy.expedientes_registrados}</p><p className="text-xs text-gray-500">Expedientes hoy</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp size={18} className="text-green-600" /></div><div><p className="text-2xl font-bold text-gray-900">{resumen.hoy.pagos_verificados}</p><p className="text-xs text-gray-500">Pagos hoy</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center"><FileText size={18} className="text-indigo-600" /></div><div><p className="text-2xl font-bold text-gray-900">{resumen.totales.total}</p><p className="text-xs text-gray-500">Total expedientes</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle size={18} className="text-emerald-600" /></div><div><p className="text-2xl font-bold text-gray-900">{resumen.totales.resueltos}</p><p className="text-xs text-gray-500">Resueltos/Archivados</p></div></div></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estados */}
        <Card>
          <CardTitle>Expedientes por estado</CardTitle>
          <div className="mt-3 space-y-2">
            {resumen.expedientes_por_estado.map((item) => {
              const pct = resumen.totales.total > 0 ? Math.round((item.total / resumen.totales.total) * 100) : 0;
              return (
                <div key={item.estado} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <EstadoBadge estado={item.estado as EstadoExpediente} size="sm" />
                    <span className="text-sm font-semibold text-gray-700">{item.total} <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {resumen.expedientes_por_estado.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin expedientes</p>}
          </div>
        </Card>

        {/* Actividad reciente */}
        <Card>
          <CardTitle>Actividad reciente</CardTitle>
          <div className="mt-3 space-y-3 max-h-80 overflow-y-auto">
            {resumen.ultimos_movimientos.map((mov, idx) => {
              const accion = accionLabel[mov.tipo_accion] ?? { label: mov.tipo_accion, color: 'bg-gray-100 text-gray-600' };
              return (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${accion.color}`}>{accion.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-mono text-blue-600 text-xs font-semibold">{mov.expediente.codigo}</span>
                      {' — '}
                      <span className="text-gray-500 text-xs">{mov.expediente.tipoTramite.nombre}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{mov.comentario ?? mov.tipo_accion}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <User size={10} /><span>{mov.usuario.nombre_completo}</span>
                      {mov.areaDestino && <><ArrowRight size={10} /><span>{mov.areaDestino.nombre}</span></>}
                      <Clock size={10} /><span>{formatFechaHora(mov.fecha_hora)}</span>
                    </div>
                  </div>
                  <EstadoBadge estado={mov.estado_resultado as EstadoExpediente} size="sm" />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}