// src/pages/DashboardPage.tsx
// Dashboard del Sistema de Trámite Documentario · Carmen Alto
// Recharts: barras por estado de expediente + tendencia 7 días.
// Colores institucionales: #216ece (primario) · #4abdef (secundario)

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, AreaChart, Area,
} from 'recharts';
import { useAuth }     from '../context/AuthContext';
import { Card }        from '../components/ui/Card';
import Spinner         from '../components/ui/Spinner';
import Alert           from '../components/ui/Alert';
import EstadoBadge     from '../components/shared/EstadoBadge';
import { ESTADO_CONFIG } from '../utils/constants';
import {
  formatFecha, formatMoneda, diasRestantes, colorDiasRestantes,
} from '../utils/formato';
import type { EstadoExpediente, Ciudadano, TipoTramite } from '../types';
import api from '../services/api';
import {
  FileText, CreditCard, Clock, AlertTriangle,
  CheckCircle, TrendingUp, Send, Eye,
  XCircle, RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Tipos de respuesta del backend ──────────────────────────────────
interface KpisMesaPartes {
  registrados_hoy:  number;
  pendiente_pago:   number;
  en_revision:      number;
  derivados:        number;
  recibidos:        number;
  observados:       number;
  rechazados:       number;
  vencidos:         number;
  proximos_vencer:  number;
}
interface KpisCajero {
  pagos_hoy:        number;
  monto_hoy:        number;
  pendientes_pago:  number;
}
interface KpisAreaTecnica {
  total_en_bandeja: number;
  en_proceso:       number;
  listo_descarga:   number;
  observados:       number;
}
type KpisDashboard = KpisMesaPartes | KpisCajero | KpisAreaTecnica;

interface UltimoExpediente {
  id:             number;
  codigo:         string;
  estado:         EstadoExpediente;
  fecha_registro: string;
  fecha_limite:   string;
  ciudadano:      Pick<Ciudadano, 'nombres' | 'apellido_pat'>;
  tipoTramite:    Pick<TipoTramite, 'nombre'>;
}

interface PuntoEstado {
  estado:   EstadoExpediente;
  cantidad: number;
}
interface PuntoTendencia {
  fecha:        string;   // ISO o "yyyy-mm-dd"
  registrados:  number;
  resueltos:    number;
}

interface DatosDashboard {
  kpis:                KpisDashboard;
  ultimos_expedientes?: UltimoExpediente[];
  por_estado?:          PuntoEstado[];      // ← opcional: si el backend aún no lo devuelve
  tendencia_7d?:        PuntoTendencia[];   // ← opcional: si el backend aún no lo devuelve
}

// ── KpiCard ─────────────────────────────────────────────────────────
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

// ── Mapeo de color por estado para las barras ───────────────────────
const COLOR_POR_ESTADO: Record<EstadoExpediente, string> = {
  PENDIENTE_PAGO:  '#eab308',
  RECIBIDO:        '#216ece',
  EN_REVISION_MDP: '#a855f7',
  DERIVADO:        '#6366f1',
  EN_PROCESO:      '#fb923c',
  LISTO_DESCARGA:  '#06b6d4',
  PDF_FIRMADO:     '#14b8a6',
  RESUELTO:        '#16a34a',
  OBSERVADO:       '#dc2626',
  RECHAZADO:       '#991b1b',
  ARCHIVADO:       '#6b7280',
};

// Etiquetas cortas para el eje X (evita texto cortado)
const SHORT_LABEL: Record<EstadoExpediente, string> = {
  PENDIENTE_PAGO:  'Pend. Pago',
  RECIBIDO:        'Recibido',
  EN_REVISION_MDP: 'Rev. MDP',
  DERIVADO:        'Derivado',
  EN_PROCESO:      'Proceso',
  LISTO_DESCARGA:  'L. Firma',
  PDF_FIRMADO:     'Firmado',
  RESUELTO:        'Resuelto',
  OBSERVADO:       'Observado',
  RECHAZADO:       'Rechazado',
  ARCHIVADO:       'Archivado',
};

// ── Tooltips personalizados ─────────────────────────────────────────
interface TooltipPayloadItem {
  value:    number;
  dataKey:  string;
  color?:   string;
  payload:  { estado?: EstadoExpediente; estadoLabel?: string; fillColor?: string };
}
interface CustomTooltipProps {
  active?:  boolean;
  payload?: TooltipPayloadItem[];
  label?:   string;
}

function BarTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{p.payload.estadoLabel}</p>
      <p className="text-gray-500 mt-0.5">
        <span className="font-bold" style={{ color: p.payload.fillColor }}>{p.value}</span> expedientes
      </p>
    </div>
  );
}

function LineTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500 capitalize">{p.dataKey}:</span>
          <span className="font-bold text-gray-800">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Helpers de formateo seguro ──────────────────────────────────────
function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dias  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${dias[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}`;
}

// ── Type guards para diferenciar el shape de KPIs según rol ─────────
function isKpisMesaPartes(k: KpisDashboard): k is KpisMesaPartes {
  return (k as KpisMesaPartes).registrados_hoy !== undefined;
}
function isKpisCajero(k: KpisDashboard): k is KpisCajero {
  return (k as KpisCajero).pagos_hoy !== undefined;
}
function isKpisAreaTecnica(k: KpisDashboard): k is KpisAreaTecnica {
  return (k as KpisAreaTecnica).total_en_bandeja !== undefined;
}

// ── Página ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { usuario } = useAuth();
  const rol         = usuario?.rol?.nombre;

  const [datos,    setDatos]    = useState<DatosDashboard | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error,    setError]    = useState<string>('');

  const cargar = async (): Promise<void> => {
    setCargando(true);
    setError('');
    try {
      const res = await api.get<DatosDashboard>('/dashboard');
      setDatos(res.data);
    } catch {
      setError('Error al cargar el dashboard.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // Datos de gráficos preparados (con colores y etiquetas cortas).
  const dataBarras = useMemo(() => {
    const fuente: PuntoEstado[] = datos?.por_estado ?? [];
    return fuente.map((p) => ({
      estado:      p.estado,
      estadoLabel: ESTADO_CONFIG[p.estado]?.label ?? p.estado,
      short:       SHORT_LABEL[p.estado] ?? p.estado,
      cantidad:    p.cantidad,
      fillColor:   COLOR_POR_ESTADO[p.estado] ?? '#6b7280',
    }));
  }, [datos?.por_estado]);

  const dataTendencia = useMemo(() => {
    const fuente: PuntoTendencia[] = datos?.tendencia_7d ?? [];
    return fuente.map((p) => ({
      ...p,
      dia: fechaCorta(p.fecha),
    }));
  }, [datos?.tendencia_7d]);

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

      {/* ── MESA DE PARTES / ADMIN ──────────────────────────────────── */}
      {(rol === 'MESA_DE_PARTES' || rol === 'ADMIN') && datos?.kpis && isKpisMesaPartes(datos.kpis) && (
        <>
          {/* Alertas de urgencia */}
          {(datos.kpis.vencidos > 0 || datos.kpis.proximos_vencer > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <KpiCard label="Registrados hoy"   value={datos.kpis.registrados_hoy} icon={<FileText size={20} />}    color="text-[color:#216ece]" bg="bg-[color:#eaf2fb]" sublabel="Nuevos expedientes" />
            <KpiCard label="Pendiente de pago" value={datos.kpis.pendiente_pago}  icon={<CreditCard size={20} />}  color="text-yellow-600"      bg="bg-yellow-100"      sublabel="En ventanilla de caja" />
            <KpiCard label="En revisión MDP"   value={datos.kpis.en_revision}     icon={<Eye size={20} />}         color="text-purple-600"      bg="bg-purple-100"      sublabel="Revisando documentación" />
            <KpiCard label="Derivados"         value={datos.kpis.derivados}       icon={<Send size={20} />}        color="text-indigo-600"      bg="bg-indigo-100"      sublabel="Enviados a áreas técnicas" />
          </div>

          {/* ⭐ GRÁFICOS — Recharts ───────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            {/* Barras por estado */}
            <Card className="xl:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Expedientes por estado</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Distribución actual del flujo de trámites</p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-md font-medium"
                  style={{ backgroundColor: '#eaf2fb', color: '#216ece' }}
                >
                  Tiempo real
                </span>
              </div>
              {dataBarras.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">Sin datos disponibles.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dataBarras} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="short" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(33, 110, 206, 0.06)' }} />
                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} maxBarSize={42}>
                      {dataBarras.map((d) => (
                        <Cell key={d.estado} fill={d.fillColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Tendencia 7 días */}
            <Card className="xl:col-span-2">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-800">Tendencia últimos 7 días</h3>
                <p className="text-xs text-gray-500 mt-0.5">Registrados vs resueltos por día</p>
              </div>
              {dataTendencia.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">Sin datos disponibles.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={dataTendencia} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="ca-grad-reg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#216ece" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#216ece" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="ca-grad-res" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#4abdef" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#4abdef" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip content={<LineTooltip />} />
                      <Area type="monotone" dataKey="registrados" stroke="#216ece" strokeWidth={2.5} fill="url(#ca-grad-reg)" />
                      <Area type="monotone" dataKey="resueltos"   stroke="#4abdef" strokeWidth={2.5} fill="url(#ca-grad-res)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#216ece' }} />
                      <span className="text-gray-600">Registrados</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#4abdef' }} />
                      <span className="text-gray-600">Resueltos</span>
                    </span>
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* KPIs secundarios */}
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Recibidos"  value={datos.kpis.recibidos}  icon={<CheckCircle size={18} />}    color="text-green-600"  bg="bg-green-100" />
            <KpiCard label="Observados" value={datos.kpis.observados} icon={<AlertTriangle size={18} />} color="text-orange-600" bg="bg-orange-100" />
            <KpiCard label="Rechazados" value={datos.kpis.rechazados} icon={<XCircle size={18} />}        color="text-red-600"    bg="bg-red-100" />
          </div>

          {/* Últimos expedientes */}
          {datos.ultimos_expedientes && datos.ultimos_expedientes.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">Últimos expedientes registrados</h3>
                <a
                  href="/mesa-partes"
                  className="text-xs hover:underline"
                  style={{ color: '#216ece' }}
                >
                  Ver todos →
                </a>
              </div>
              <div className="space-y-3">
                {datos.ultimos_expedientes.map((exp) => {
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
      )}

      {/* ── CAJERO ──────────────────────────────────────────── */}
      {rol === 'CAJERO' && datos?.kpis && isKpisCajero(datos.kpis) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label="Pagos verificados hoy" value={datos.kpis.pagos_hoy}        icon={<CheckCircle size={20} />} color="text-green-600"        bg="bg-green-100" />
          <KpiCard label="Total recaudado hoy"   value={formatMoneda(datos.kpis.monto_hoy)} icon={<TrendingUp size={20} />}  color="text-[color:#216ece]" bg="bg-[color:#eaf2fb]" />
          <KpiCard label="Pendientes de pago"    value={datos.kpis.pendientes_pago}  icon={<CreditCard size={20} />}  color="text-yellow-600"       bg="bg-yellow-100" sublabel="Esperando en ventanilla" />
        </div>
      )}

      {/* ── TÉCNICO / JEFE ──────────────────────────────────── */}
      {(rol === 'TECNICO' || rol === 'JEFE_AREA') && datos?.kpis && isKpisAreaTecnica(datos.kpis) && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Total en bandeja"  value={datos.kpis.total_en_bandeja} icon={<FileText size={20} />}    color="text-[color:#216ece]" bg="bg-[color:#eaf2fb]" />
            <KpiCard label="En proceso"        value={datos.kpis.en_proceso}       icon={<Clock size={20} />}       color="text-orange-600"      bg="bg-orange-100" />
            <KpiCard label="Listo para firma"  value={datos.kpis.listo_descarga}   icon={<CheckCircle size={20} />} color="text-cyan-600"        bg="bg-cyan-100" />
            <KpiCard label="Observados"        value={datos.kpis.observados}       icon={<AlertTriangle size={20} />} color="text-red-600"       bg="bg-red-100" />
          </div>

          <Card>
            <div className="flex items-center gap-3 p-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#eaf2fb' }}
              >
                <Send size={18} style={{ color: '#216ece' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Ir a tu bandeja</p>
                <p className="text-xs text-gray-500">Ver expedientes asignados a tu área</p>
              </div>
              <a
                href="/areas"
                className="text-sm font-medium hover:underline"
                style={{ color: '#216ece' }}
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

// Suprime el aviso de unused `LucideIcon` si tu lint estricto lo pide.
// (No lo usamos directamente — los iconos se usan como JSX.)
export type { LucideIcon };
