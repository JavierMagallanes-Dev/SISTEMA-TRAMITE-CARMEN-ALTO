// src/pages/DashboardPage.tsx

import { useEffect, useState } from 'react';
import { useAuth }             from '../context/AuthContext';
import { Card }                from '../components/ui/Card';
import Spinner                 from '../components/ui/Spinner';
import Alert                   from '../components/ui/Alert';
import EstadoBadge             from '../components/shared/EstadoBadge';
import { formatFecha, formatMoneda, diasRestantes, colorDiasRestantes } from '../utils/formato';
import type { EstadoExpediente } from '../types';
import api from '../services/api';
import {
  FileText, CreditCard, Clock, AlertTriangle,
  CheckCircle, TrendingUp, Send, Eye,
  XCircle, RefreshCw,
} from 'lucide-react';

interface KpiCardProps {
  label:     string;
  value:     number | string;
  icon:      React.ReactNode;
  color:     string;
  bg:        string;
  sublabel?: string;
}

function KpiCard({ label, value, icon, color, bg, sublabel }: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <span className={color}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { usuario }  = useAuth();
  const rol          = usuario?.rol?.nombre;

  const [datos,    setDatos]    = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const res = await api.get('/dashboard');
      setDatos(res.data);
    } catch {
      setError('Error al cargar el dashboard.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  if (cargando) return <Spinner text="Cargando dashboard..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Bienvenido, {usuario?.nombre_completo.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {usuario?.rol?.nombre?.replace(/_/g, ' ')}
            {usuario?.area && ` — ${usuario.area.nombre}`}
          </p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* ── MESA DE PARTES ──────────────────────────────────── */}
      {(rol === 'MESA_DE_PARTES' || rol === 'ADMIN') && datos?.kpis && (
        <>
          {/* Alertas de urgencia */}
          {(datos.kpis.vencidos > 0 || datos.kpis.proximos_vencer > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {datos.kpis.vencidos > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle size={20} className="text-red-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-700">{datos.kpis.vencidos} expediente(s) vencidos</p>
                    <p className="text-xs text-red-500">Requieren atención inmediata</p>
                  </div>
                </div>
              )}
              {datos.kpis.proximos_vencer > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
                  <Clock size={20} className="text-orange-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-orange-700">{datos.kpis.proximos_vencer} por vencer en 2 días</p>
                    <p className="text-xs text-orange-500">Procesa estos expedientes pronto</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* KPIs principales */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Registrados hoy"
              value={datos.kpis.registrados_hoy}
              icon={<FileText size={20} />}
              color="text-blue-600"
              bg="bg-blue-100"
              sublabel="Nuevos expedientes"
            />
            <KpiCard
              label="Pendiente de pago"
              value={datos.kpis.pendiente_pago}
              icon={<CreditCard size={20} />}
              color="text-yellow-600"
              bg="bg-yellow-100"
              sublabel="En ventanilla de caja"
            />
            <KpiCard
              label="En revisión MDP"
              value={datos.kpis.en_revision}
              icon={<Eye size={20} />}
              color="text-purple-600"
              bg="bg-purple-100"
              sublabel="Revisando documentación"
            />
            <KpiCard
              label="Derivados"
              value={datos.kpis.derivados}
              icon={<Send size={20} />}
              color="text-indigo-600"
              bg="bg-indigo-100"
              sublabel="Enviados a áreas técnicas"
            />
          </div>

          {/* KPIs secundarios */}
          <div className="grid grid-cols-3 gap-4">
            <KpiCard
              label="Recibidos"
              value={datos.kpis.recibidos}
              icon={<CheckCircle size={18} />}
              color="text-green-600"
              bg="bg-green-100"
            />
            <KpiCard
              label="Observados"
              value={datos.kpis.observados}
              icon={<AlertTriangle size={18} />}
              color="text-orange-600"
              bg="bg-orange-100"
            />
            <KpiCard
              label="Rechazados"
              value={datos.kpis.rechazados}
              icon={<XCircle size={18} />}
              color="text-red-600"
              bg="bg-red-100"
            />
          </div>

          {/* Últimos expedientes */}
          {datos.ultimos_expedientes?.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">Últimos expedientes registrados</h3>
                <a href="/mesa-partes" className="text-xs text-blue-600 hover:underline">
                  Ver todos →
                </a>
              </div>
              <div className="space-y-3">
                {datos.ultimos_expedientes.map((exp: any) => {
                  const dias = diasRestantes(exp.fecha_limite);
                  return (
                    <div key={exp.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600">{exp.codigo}</span>
                          <EstadoBadge estado={exp.estado as EstadoExpediente} size="sm" />
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">
                          {exp.ciudadano.nombres} {exp.ciudadano.apellido_pat} · {exp.tipoTramite.nombre}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{formatFecha(exp.fecha_registro)}</p>
                        <p className={`text-xs font-medium ${colorDiasRestantes(dias)}`}>
                          {dias < 0 ? `Vencido` : `${dias}d`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── CAJERO ──────────────────────────────────────────── */}
      {rol === 'CAJERO' && datos?.kpis && (
        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            label="Pagos verificados hoy"
            value={datos.kpis.pagos_hoy}
            icon={<CheckCircle size={20} />}
            color="text-green-600"
            bg="bg-green-100"
          />
          <KpiCard
            label="Total recaudado hoy"
            value={formatMoneda(datos.kpis.monto_hoy)}
            icon={<TrendingUp size={20} />}
            color="text-blue-600"
            bg="bg-blue-100"
          />
          <KpiCard
            label="Pendientes de pago"
            value={datos.kpis.pendientes_pago}
            icon={<CreditCard size={20} />}
            color="text-yellow-600"
            bg="bg-yellow-100"
            sublabel="Esperando en ventanilla"
          />
        </div>
      )}

      {/* ── TÉCNICO / JEFE ───────────────────────────────────── */}
      {(rol === 'TECNICO' || rol === 'JEFE_AREA') && datos?.kpis && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Total en bandeja"
              value={datos.kpis.total_en_bandeja}
              icon={<FileText size={20} />}
              color="text-blue-600"
              bg="bg-blue-100"
            />
            <KpiCard
              label="En proceso"
              value={datos.kpis.en_proceso}
              icon={<Clock size={20} />}
              color="text-orange-600"
              bg="bg-orange-100"
            />
            <KpiCard
              label="Listo para firma"
              value={datos.kpis.listo_descarga}
              icon={<CheckCircle size={20} />}
              color="text-cyan-600"
              bg="bg-cyan-100"
            />
            <KpiCard
              label="Observados"
              value={datos.kpis.observados}
              icon={<AlertTriangle size={20} />}
              color="text-red-600"
              bg="bg-red-100"
            />
          </div>

          <Card>
            <div className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Send size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Ir a tu bandeja</p>
                <p className="text-xs text-gray-500">Ver expedientes asignados a tu área</p>
              </div>
              <a
                href="/areas"
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                Ver bandeja →
              </a>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}