// src/pages/AuditoriaPage.tsx

import { useEffect, useState } from 'react';
import { auditoriaService }    from '../services/auditoria.service';
import { Card, CardTitle }     from '../components/ui/Card';
import Alert                   from '../components/ui/Alert';
import Spinner                 from '../components/ui/Spinner';
import Table                   from '../components/ui/Table';
import Button                  from '../components/ui/Button';
import Input                   from '../components/ui/Input';
import EstadoBadge             from '../components/shared/EstadoBadge';
import { formatFechaHora }     from '../utils/formato';
import type { EstadoExpediente } from '../types';
import { RefreshCw, Shield, TrendingUp, Activity } from 'lucide-react';

interface RegistroAuditoria {
  id:               number;
  tabla:            string;
  operacion:        string;
  registro_id:      number | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos:     Record<string, unknown> | null;
  usuario_bd:       string | null;
  usuario_app_id:   number | null;
  fecha_hora:       string;
}

interface ResumenData {
  hoy: { expedientes_registrados: number; pagos_verificados: number };
  expedientes_por_estado: { estado: string; total: number }[];
  ultimos_movimientos: {
    tipo_accion: string;
    estado_resultado: string;
    comentario: string | null;
    fecha_hora: string;
    usuario: { nombre_completo: string };
    expediente: { codigo: string };
  }[];
}

export default function AuditoriaPage() {
  const [tab,      setTab]      = useState<'resumen' | 'bitacora'>('resumen');
  const [resumen,  setResumen]  = useState<ResumenData | null>(null);
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [total,    setTotal]    = useState(0);
  const [pagina,   setPagina]   = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');

  // Filtros
  const [filtroTabla,     setFiltroTabla]     = useState('');
  const [filtroOperacion, setFiltroOperacion] = useState('');
  const [filtroFecha,     setFiltroFecha]     = useState('');

  const cargarResumen = async () => {
    try {
      const data = await auditoriaService.resumen();
      setResumen(data);
    } catch {
      setError('Error al cargar el resumen.');
    }
  };

  const cargarBitacora = async (pag = 1) => {
    try {
      const data = await auditoriaService.listar({
        tabla:     filtroTabla     || undefined,
        operacion: filtroOperacion || undefined,
        fecha:     filtroFecha     || undefined,
        page:      pag,
      });
      setRegistros(data.registros);
      setTotal(data.total);
      setPagina(pag);
    } catch {
      setError('Error al cargar la bitácora.');
    }
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      await Promise.all([cargarResumen(), cargarBitacora(1)]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  if (cargando) return <Spinner text="Cargando auditoría..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Auditoría del Sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bitácora automática generada por triggers PostgreSQL</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={cargarDatos}>
          Actualizar
        </Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'resumen',  label: 'Resumen',  icon: <TrendingUp size={13} /> },
          { key: 'bitacora', label: 'Bitácora BD', icon: <Shield size={13} />   },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Resumen */}
      {tab === 'resumen' && resumen && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{resumen.hoy.expedientes_registrados}</p>
                  <p className="text-xs text-gray-500">Expedientes registrados hoy</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{resumen.hoy.pagos_verificados}</p>
                  <p className="text-xs text-gray-500">Pagos verificados hoy</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Por estado */}
          <Card>
            <CardTitle>Expedientes por estado</CardTitle>
            <div className="mt-3 space-y-2">
              {resumen.expedientes_por_estado.map((item) => (
                <div key={item.estado} className="flex items-center justify-between py-1.5">
                  <EstadoBadge estado={item.estado as EstadoExpediente} size="sm" />
                  <span className="text-sm font-semibold text-gray-700">{item.total}</span>
                </div>
              ))}
              {resumen.expedientes_por_estado.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Sin expedientes activos</p>
              )}
            </div>
          </Card>

          {/* Últimos movimientos */}
          <Card>
            <CardTitle>Últimos movimientos del sistema</CardTitle>
            <div className="mt-3 space-y-3">
              {resumen.ultimos_movimientos.map((mov, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm border-b border-gray-50 pb-2 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700">
                      <span className="font-mono text-blue-600 text-xs">{mov.expediente.codigo}</span>
                      {' — '}
                      <span className="text-gray-600">{mov.comentario ?? mov.tipo_accion}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {mov.usuario.nombre_completo} · {formatFechaHora(mov.fecha_hora)}
                    </p>
                  </div>
                  <EstadoBadge estado={mov.estado_resultado as EstadoExpediente} size="sm" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Bitácora BD */}
      {tab === 'bitacora' && (
        <div className="space-y-4">
          {/* Filtros */}
          <Card>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tabla</label>
                <select
                  value={filtroTabla}
                  onChange={(e) => setFiltroTabla(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                >
                  <option value="">Todas</option>
                  <option value="expedientes">expedientes</option>
                  <option value="usuarios">usuarios</option>
                  <option value="movimientos">movimientos</option>
                  <option value="pagos">pagos</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Operación</label>
                <select
                  value={filtroOperacion}
                  onChange={(e) => setFiltroOperacion(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                >
                  <option value="">Todas</option>
                  <option value="INSERT">INSERT</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <Input
                label="Fecha"
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>
            <div className="flex justify-end mt-3">
              <Button size="sm" onClick={() => cargarBitacora(1)}>
                Filtrar
              </Button>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{total} registros encontrados</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => cargarBitacora(pagina - 1)} disabled={pagina <= 1}>
                ← Anterior
              </Button>
              <span className="text-sm text-gray-500 px-2 py-1">Pág. {pagina}</span>
              <Button size="sm" variant="secondary" onClick={() => cargarBitacora(pagina + 1)} disabled={pagina * 50 >= total}>
                Siguiente →
              </Button>
            </div>
          </div>

          <Card padding={false}>
            <Table
              keyField="id"
              data={registros}
              emptyText="No hay registros de auditoría"
              columns={[
                {
                  key: 'fecha_hora', header: 'Fecha/Hora',
                  render: (r) => <span className="text-xs text-gray-500 font-mono">{formatFechaHora(r.fecha_hora)}</span>,
                },
                {
                  key: 'tabla', header: 'Tabla',
                  render: (r) => <span className="text-xs font-mono font-semibold text-gray-700">{r.tabla}</span>,
                },
                {
                  key: 'operacion', header: 'Operación',
                  render: (r) => (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      r.operacion === 'INSERT' ? 'bg-green-100 text-green-700' :
                      r.operacion === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {r.operacion}
                    </span>
                  ),
                },
                {
                  key: 'registro_id', header: 'ID Registro',
                  render: (r) => <span className="text-xs text-gray-500">{r.registro_id ?? '—'}</span>,
                },
                {
                  key: 'usuario_bd', header: 'Usuario BD',
                  render: (r) => <span className="text-xs font-mono text-gray-500">{r.usuario_bd ?? '—'}</span>,
                },
                {
                  key: 'cambio', header: 'Cambio de estado',
                  render: (r) => {
                    const antes = r.datos_anteriores?.estado as string | undefined;
                    const despues = r.datos_nuevos?.estado as string | undefined;
                    if (!antes && !despues) return <span className="text-xs text-gray-300">—</span>;
                    if (antes && despues && antes !== despues) {
                      return (
                        <div className="flex items-center gap-1 text-xs">
                          <EstadoBadge estado={antes as EstadoExpediente} size="sm" />
                          <span className="text-gray-400">→</span>
                          <EstadoBadge estado={despues as EstadoExpediente} size="sm" />
                        </div>
                      );
                    }
                    const estado = despues ?? antes;
                    return estado ? <EstadoBadge estado={estado as EstadoExpediente} size="sm" /> : null;
                  },
                },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}