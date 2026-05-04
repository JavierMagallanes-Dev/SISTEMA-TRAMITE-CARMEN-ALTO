// src/components/dashboard/SeccionMesaPartes.tsx
import { Card }         from '../ui/Card';
import KpiCard          from './KpiCard';
import GraficoEstados   from './GraficoEstados';
import GraficoTendencia from './GraficoTendencia';
import EstadoBadge      from '../shared/EstadoBadge';
import { formatFecha, diasRestantes, colorDiasRestantes } from '../../utils/formato';
import { FileText, CreditCard, Clock, AlertTriangle, CheckCircle, Eye, Send, XCircle } from 'lucide-react';
import type { KpisMesaPartes, UltimoExpediente } from '../../hooks/useDashboard';

interface Props {
  kpis:                KpisMesaPartes;
  ultimosExpedientes?: UltimoExpediente[];
  dataBarras:          any[];
  dataTendencia:       any[];
}

export default function SeccionMesaPartes({ kpis, ultimosExpedientes, dataBarras, dataTendencia }: Props) {
  return (
    <>
      {/* Alertas urgencia */}
      {(kpis.vencidos > 0 || kpis.proximos_vencer > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpis.vencidos > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700">{kpis.vencidos} expediente(s) vencidos</p>
                <p className="text-xs text-red-500">Requieren atención inmediata</p>
              </div>
            </div>
          )}
          {kpis.proximos_vencer > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
              <Clock size={20} className="text-orange-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-orange-700">{kpis.proximos_vencer} por vencer en 2 días</p>
                <p className="text-xs text-orange-500">Procesa estos expedientes pronto</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Registrados hoy"   value={kpis.registrados_hoy} icon={<FileText size={20} />}   color="text-[color:#216ece]" bg="bg-[color:#eaf2fb]" sublabel="Nuevos expedientes" />
        <KpiCard label="Pendiente de pago" value={kpis.pendiente_pago}  icon={<CreditCard size={20} />} color="text-yellow-600"      bg="bg-yellow-100"      sublabel="En ventanilla de caja" />
        <KpiCard label="En revisión MDP"   value={kpis.en_revision}     icon={<Eye size={20} />}        color="text-purple-600"      bg="bg-purple-100"      sublabel="Revisando documentación" />
        <KpiCard label="Derivados"         value={kpis.derivados}       icon={<Send size={20} />}       color="text-indigo-600"      bg="bg-indigo-100"      sublabel="Enviados a áreas técnicas" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <GraficoEstados   data={dataBarras}    />
        <GraficoTendencia data={dataTendencia} />
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Recibidos"  value={kpis.recibidos}  icon={<CheckCircle size={18} />}   color="text-green-600"  bg="bg-green-100"  />
        <KpiCard label="Observados" value={kpis.observados} icon={<AlertTriangle size={18} />} color="text-orange-600" bg="bg-orange-100" />
        <KpiCard label="Rechazados" value={kpis.rechazados} icon={<XCircle size={18} />}       color="text-red-600"    bg="bg-red-100"    />
      </div>

      {/* Últimos expedientes */}
      {ultimosExpedientes && ultimosExpedientes.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Últimos expedientes registrados</h3>
            <a href="/mesa-partes" className="text-xs hover:underline" style={{ color: '#216ece' }}>Ver todos →</a>
          </div>
          <div className="space-y-3">
            {ultimosExpedientes.map((exp) => {
              const dias = diasRestantes(exp.fecha_limite);
              return (
                <div key={exp.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold" style={{ color: '#216ece' }}>{exp.codigo}</span>
                      <EstadoBadge estado={exp.estado} size="sm" />
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 truncate">
                      {exp.ciudadano.nombres} {exp.ciudadano.apellido_pat} · {exp.tipoTramite.nombre}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{formatFecha(exp.fecha_registro)}</p>
                    <p className={`text-xs font-medium ${colorDiasRestantes(dias)}`}>
                      {dias < 0 ? 'Vencido' : `${dias}d`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}