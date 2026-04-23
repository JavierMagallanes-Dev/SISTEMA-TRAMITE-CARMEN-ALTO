// src/pages/DashboardPage.tsx

import { useEffect, useState } from 'react';
import { useAuth }             from '../context/AuthContext';
import { auditoriaService }    from '../services/auditoria.service';
import { cajeroService }       from '../services/cajero.service';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import Spinner                 from '../components/ui/Spinner';
import Alert                   from '../components/ui/Alert';
import EstadoBadge             from '../components/shared/EstadoBadge';
import { formatFechaHora, formatMoneda } from '../utils/formato';
import type { EstadoExpediente }    from '../types';
import {
  FileText, CreditCard, Clock,
  CheckCircle, TrendingUp, Users,
} from 'lucide-react';

export default function DashboardPage() {
  const { usuario } = useAuth();
  const rol = usuario?.rol.nombre;

  const [resumen,    setResumen]    = useState<any>(null);
  const [cajeroHoy,  setCajeroHoy]  = useState<any>(null);
  const [cargando,   setCargando]   = useState(true);
  const [error,      setError]      = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        if (rol === 'ADMIN') {
          const data = await auditoriaService.resumen();
          setResumen(data);
        }
        if (rol === 'CAJERO' || rol === 'ADMIN') {
          const data = await cajeroService.resumenHoy();
          setCajeroHoy(data);
        }
      } catch {
        setError('Error al cargar el dashboard.');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [rol]);

  if (cargando) return <Spinner text="Cargando dashboard..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Bienvenido, {usuario?.nombre_completo.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {usuario?.rol?.nombre?.replace('_', ' ')}
          {usuario?.area && ` — ${usuario.area.nombre}`}
        </p>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* ── Vista ADMIN ───────────────────────────────────── */}
      {rol === 'ADMIN' && resumen && (
        <>
          {/* KPIs del día */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {resumen.hoy.expedientes_registrados}
                  </p>
                  <p className="text-xs text-gray-500">Expedientes hoy</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CreditCard size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {resumen.hoy.pagos_verificados}
                  </p>
                  <p className="text-xs text-gray-500">Pagos verificados hoy</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Expedientes por estado */}
          <Card>
            <CardHeader>
              <CardTitle>Expedientes por estado</CardTitle>
              <TrendingUp size={18} className="text-gray-400" />
            </CardHeader>
            <div className="space-y-2">
              {resumen.expedientes_por_estado.map((item: any) => (
                <div key={item.estado} className="flex items-center justify-between py-1.5">
                  <EstadoBadge estado={item.estado as EstadoExpediente} size="sm" />
                  <span className="text-sm font-semibold text-gray-700">
                    {item.total}
                  </span>
                </div>
              ))}
              {resumen.expedientes_por_estado.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Sin expedientes activos
                </p>
              )}
            </div>
          </Card>

          {/* Últimos movimientos */}
          <Card>
            <CardHeader>
              <CardTitle>Últimos movimientos</CardTitle>
              <Clock size={18} className="text-gray-400" />
            </CardHeader>
            <div className="space-y-3">
              {resumen.ultimos_movimientos.map((mov: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <CheckCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 truncate">
                      <span className="font-mono text-blue-600 text-xs">
                        {mov.expediente.codigo}
                      </span>
                      {' — '}
                      {mov.comentario ?? mov.tipo_accion}
                    </p>
                    <p className="text-xs text-gray-400">
                      {mov.usuario.nombre_completo} · {formatFechaHora(mov.fecha_hora)}
                    </p>
                  </div>
                  <EstadoBadge estado={mov.estado_resultado} size="sm" />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ── Vista CAJERO ──────────────────────────────────── */}
      {(rol === 'CAJERO') && cajeroHoy && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CreditCard size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {cajeroHoy.pagos_verificados_hoy}
                </p>
                <p className="text-xs text-gray-500">Pagos verificados hoy</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatMoneda(cajeroHoy.total_recaudado_hoy)}
                </p>
                <p className="text-xs text-gray-500">Recaudado hoy</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Vista MESA_DE_PARTES / TECNICO / JEFE ─────────── */}
      {(rol === 'MESA_DE_PARTES' || rol === 'TECNICO' || rol === 'JEFE_AREA') && (
        <Card>
          <CardHeader>
            <CardTitle>Acceso rápido</CardTitle>
            <Users size={18} className="text-gray-400" />
          </CardHeader>
          <div className="grid grid-cols-2 gap-3">
            {rol === 'MESA_DE_PARTES' && (
              <>
                <a href="/mesa-partes" className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <FileText size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Registrar Expediente</span>
                </a>
                <a href="/mesa-partes" className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Clock size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Ver Bandeja</span>
                </a>
              </>
            )}
            {(rol === 'TECNICO' || rol === 'JEFE_AREA') && (
              <a href="/areas" className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                <FileText size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Ver Mi Bandeja</span>
              </a>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}