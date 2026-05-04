// src/pages/AuditoriaPage.tsx

import { useEffect, useState } from 'react';
import { auditoriaService }    from '../services/auditoria.service';
import api                     from '../services/api';
import { Card, CardTitle }     from '../components/ui/Card';
import Spinner                 from '../components/ui/Spinner';
import Table                   from '../components/ui/Table';
import Button                  from '../components/ui/Button';
import Input                   from '../components/ui/Input';
import Modal                   from '../components/ui/Modal';
import EstadoBadge             from '../components/shared/EstadoBadge';
import { toast }               from '../utils/toast';
import { formatFecha, formatFechaHora } from '../utils/formato';
import type { EstadoExpediente } from '../types';
import {
  RefreshCw, Shield, TrendingUp, Activity,
  ChevronDown, ChevronUp, Search, FileText,
  User, ArrowRight, Clock, CheckCircle,
} from 'lucide-react';

interface RegistroAuditoria {
  id: number; tabla: string; operacion: string;
  registro_id: number | null;
  datos_anteriores: Record<string, unknown> | null;
  datos_nuevos:     Record<string, unknown> | null;
  usuario_bd: string | null; usuario_app_id: number | null;
  fecha_hora: string;
}

interface Movimiento {
  id: number; tipo_accion: string; estado_resultado: string;
  comentario: string | null; fecha_hora: string;
  usuario:    { nombre_completo: string; rol: { nombre: string } };
  areaOrigen:  { nombre: string; sigla: string } | null;
  areaDestino: { nombre: string; sigla: string } | null;
}

interface ExpedienteAuditoria {
  id: number; codigo: string; estado: string;
  fecha_registro: string; fecha_limite: string; fecha_resolucion: string | null;
  ciudadano:    { nombres: string; apellido_pat: string; dni: string };
  tipoTramite:  { nombre: string };
  areaActual:   { nombre: string; sigla: string } | null;
  registradoPor:{ nombre_completo: string } | null;
  firmadoPor:   { nombre_completo: string } | null;
  movimientos:  Movimiento[];
  pagos: { boleta: string; monto_cobrado: number; fecha_pago: string }[];
}

interface ResumenData {
  hoy: { expedientes_registrados: number; pagos_verificados: number };
  totales: { total: number; resueltos: number };
  expedientes_por_estado: { estado: string; total: number }[];
  ultimos_movimientos: {
    tipo_accion: string; estado_resultado: string; comentario: string | null;
    fecha_hora: string;
    usuario:    { nombre_completo: string; rol: { nombre: string } };
    expediente: { codigo: string; tipoTramite: { nombre: string } };
    areaDestino: { nombre: string } | null;
  }[];
}

const ACCION_LABEL: Record<string, { label: string; color: string }> = {
  REGISTRO:         { label: 'Registro',       color: 'bg-blue-100 text-blue-700'   },
  PAGO:             { label: 'Pago',            color: 'bg-green-100 text-green-700' },
  TOMA_EXPEDIENTE:  { label: 'Tomado',          color: 'bg-indigo-100 text-indigo-700' },
  DERIVACION:       { label: 'Derivación',      color: 'bg-purple-100 text-purple-700' },
  OBSERVACION:      { label: 'Observación',     color: 'bg-yellow-100 text-yellow-700' },
  VISTO_BUENO:      { label: 'Visto Bueno',     color: 'bg-teal-100 text-teal-700'   },
  SUBIDA_PDF_FIRMADO:{ label: 'Firmado',         color: 'bg-emerald-100 text-emerald-700' },
  RECHAZO:          { label: 'Rechazo',         color: 'bg-red-100 text-red-700'     },
  SUBSANACION:      { label: 'Subsanación',     color: 'bg-orange-100 text-orange-700' },
  ARCHIVADO:        { label: 'Archivado',       color: 'bg-gray-100 text-gray-600'   },
};

export default function AuditoriaPage() {
  const [tab,       setTab]       = useState<'resumen' | 'expedientes' | 'bitacora'>('resumen');
  const [resumen,   setResumen]   = useState<ResumenData | null>(null);
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [total,     setTotal]     = useState(0);
  const [pagina,    setPagina]    = useState(1);
  const [cargando,  setCargando]  = useState(true);

  // Tab expedientes
  const [expedientes,   setExpedientes]   = useState<ExpedienteAuditoria[]>([]);
  const [totalExp,      setTotalExp]      = useState(0);
  const [paginaExp,     setPaginaExp]     = useState(1);
  const [expandedExp,   setExpandedExp]   = useState<number | null>(null);
  const [cargandoExp,   setCargandoExp]   = useState(false);
  const [filtroCodigo,  setFiltroCodigo]  = useState('');
  const [filtroEstado,  setFiltroEstado]  = useState('');
  const [filtroFechaI,  setFiltroFechaI]  = useState('');
  const [filtroFechaF,  setFiltroFechaF]  = useState('');

  // Modal detalle movimiento
  const [modalMov, setModalMov] = useState(false);
  const [expModal, setExpModal] = useState<ExpedienteAuditoria | null>(null);

  // Tab bitácora
  const [filtroTabla,     setFiltroTabla]     = useState('');
  const [filtroOperacion, setFiltroOperacion] = useState('');
  const [filtroFecha,     setFiltroFecha]     = useState('');

  const cargarResumen = async () => {
    try { setResumen(await auditoriaService.resumen()); }
    catch { toast.error({ titulo: 'Error al cargar el resumen.' }); }
  };

  const cargarBitacora = async (pag = 1) => {
    try {
      const data = await auditoriaService.listar({ tabla: filtroTabla || undefined, operacion: filtroOperacion || undefined, fecha: filtroFecha || undefined, page: pag });
      setRegistros(data.registros); setTotal(data.total); setPagina(pag);
    } catch { toast.error({ titulo: 'Error al cargar la bitácora.' }); }
  };

  const cargarExpedientes = async (pag = 1) => {
    setCargandoExp(true);
    try {
      const params = new URLSearchParams({ page: String(pag) });
      if (filtroCodigo) params.append('codigo',       filtroCodigo);
      if (filtroEstado) params.append('estado',       filtroEstado);
      if (filtroFechaI) params.append('fecha_inicio', filtroFechaI);
      if (filtroFechaF) params.append('fecha_fin',    filtroFechaF);
      const res = await api.get(`/auditoria/expedientes?${params.toString()}`);
      setExpedientes(res.data.expedientes);
      setTotalExp(res.data.total);
      setPaginaExp(pag);
    } catch { toast.error({ titulo: 'Error al cargar expedientes.' }); }
    finally { setCargandoExp(false); }
  };

  const cargarDatos = async () => {
    setCargando(true);
    try { await Promise.all([cargarResumen(), cargarBitacora(1), cargarExpedientes(1)]); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  if (cargando) return <Spinner text="Cargando auditoría..." />;

  const ESTADOS_DISPONIBLES = ['PENDIENTE_PAGO','RECIBIDO','EN_REVISION_MDP','DERIVADO','EN_PROCESO','OBSERVADO','LISTO_DESCARGA','PDF_FIRMADO','RESUELTO','ARCHIVADO','RECHAZADO'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Auditoría del Sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">Trazabilidad completa de expedientes y operaciones</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={cargarDatos}>Actualizar</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'resumen',      label: 'Resumen',      icon: <TrendingUp size={13} /> },
          { key: 'expedientes',  label: 'Expedientes',  icon: <FileText   size={13} /> },
          { key: 'bitacora',     label: 'Bitácora BD',  icon: <Shield     size={13} /> },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Resumen ── */}
      {tab === 'resumen' && resumen && (
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

            {/* Últimos movimientos */}
            <Card>
              <CardTitle>Actividad reciente</CardTitle>
              <div className="mt-3 space-y-3 max-h-80 overflow-y-auto">
                {resumen.ultimos_movimientos.map((mov, idx) => {
                  const accion = ACCION_LABEL[mov.tipo_accion] ?? { label: mov.tipo_accion, color: 'bg-gray-100 text-gray-600' };
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
      )}

      {/* ── Tab Expedientes ── */}
      {tab === 'expedientes' && (
        <div className="space-y-4">
          {/* Filtros */}
          <Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input label="Código" placeholder="EXP-2026-..." value={filtroCodigo} onChange={(e) => setFiltroCodigo(e.target.value.toUpperCase())} />
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
                  <option value="">Todos</option>
                  {ESTADOS_DISPONIBLES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <Input label="Fecha desde" type="date" value={filtroFechaI} onChange={(e) => setFiltroFechaI(e.target.value)} />
              <Input label="Fecha hasta" type="date" value={filtroFechaF} onChange={(e) => setFiltroFechaF(e.target.value)} />
            </div>
            <div className="flex justify-end mt-3">
              <Button size="sm" icon={<Search size={13} />} onClick={() => cargarExpedientes(1)}>Buscar</Button>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{totalExp} expedientes encontrados</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => cargarExpedientes(paginaExp - 1)} disabled={paginaExp <= 1}>← Anterior</Button>
              <span className="text-sm text-gray-500 px-2 py-1">Pág. {paginaExp} de {Math.ceil(totalExp / 20) || 1}</span>
              <Button size="sm" variant="secondary" onClick={() => cargarExpedientes(paginaExp + 1)} disabled={paginaExp * 20 >= totalExp}>Siguiente →</Button>
            </div>
          </div>

          {cargandoExp ? <Spinner text="Cargando expedientes..." /> : (
            <div className="space-y-3">
              {expedientes.length === 0 ? (
                <Card><div className="text-center py-8 text-gray-400"><FileText size={32} className="mx-auto mb-2 opacity-40" /><p className="text-sm">No hay expedientes.</p></div></Card>
              ) : expedientes.map((exp) => (
                <Card key={exp.id}>
                  {/* Cabecera del expediente */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-sm font-bold text-blue-600">{exp.codigo}</span>
                        <EstadoBadge estado={exp.estado as EstadoExpediente} size="sm" />
                        {exp.pagos.length > 0 && <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Pagado</span>}
                      </div>
                      <p className="text-sm font-medium text-gray-800">{exp.tipoTramite.nombre}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><User size={11} />{exp.ciudadano.nombres} {exp.ciudadano.apellido_pat} · {exp.ciudadano.dni}</span>
                        <span className="flex items-center gap-1"><Clock size={11} />Registrado: {formatFecha(exp.fecha_registro)}</span>
                        {exp.areaActual && <span>Área actual: <strong>{exp.areaActual.sigla}</strong></span>}
                        {exp.registradoPor && <span>Por: {exp.registradoPor.nombre_completo}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="ghost"
                        icon={expandedExp === exp.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        onClick={() => setExpandedExp(expandedExp === exp.id ? null : exp.id)}>
                        {expandedExp === exp.id ? 'Ocultar' : `Ver historial (${exp.movimientos.length})`}
                      </Button>
                    </div>
                  </div>

                  {/* Timeline expandible */}
                  {expandedExp === exp.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Historial de estados y movimientos</p>
                      <div className="relative">
                        {/* Línea vertical */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                        <div className="space-y-4">
                          {exp.movimientos.map((mov, idx) => {
                            const accion = ACCION_LABEL[mov.tipo_accion] ?? { label: mov.tipo_accion, color: 'bg-gray-100 text-gray-600' };
                            const esUltimo = idx === exp.movimientos.length - 1;
                            return (
                              <div key={mov.id} className="relative flex items-start gap-4 pl-10">
                                {/* Punto en la línea */}
                                <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${esUltimo ? 'bg-blue-500' : 'bg-gray-300'}`} style={{ top: 4 }} />
                                <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${accion.color}`}>{accion.label}</span>
                                      <EstadoBadge estado={mov.estado_resultado as EstadoExpediente} size="sm" />
                                      {mov.areaDestino && (
                                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">→ {mov.areaDestino.nombre}</span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-400 shrink-0">{formatFechaHora(mov.fecha_hora)}</span>
                                  </div>
                                  {mov.comentario && (
                                    <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{mov.comentario}</p>
                                  )}
                                  <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                                    <User size={11} />
                                    <span>{mov.usuario.nombre_completo}</span>
                                    <span className="text-gray-300">·</span>
                                    <span className="text-gray-400">{mov.usuario.rol.nombre.replace('_', ' ')}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Resumen final */}
                      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500">
                        <div><p className="text-gray-400">Registrado</p><p className="font-medium text-gray-700">{formatFecha(exp.fecha_registro)}</p></div>
                        <div><p className="text-gray-400">Fecha límite</p><p className="font-medium text-gray-700">{formatFecha(exp.fecha_limite)}</p></div>
                        {exp.fecha_resolucion && <div><p className="text-gray-400">Resuelto</p><p className="font-medium text-gray-700">{formatFecha(exp.fecha_resolucion)}</p></div>}
                        {exp.firmadoPor && <div><p className="text-gray-400">Firmado por</p><p className="font-medium text-gray-700">{exp.firmadoPor.nombre_completo}</p></div>}
                        {exp.pagos.length > 0 && <div><p className="text-gray-400">Pago</p><p className="font-medium text-gray-700">S/ {Number(exp.pagos[0].monto_cobrado).toFixed(2)} · {exp.pagos[0].boleta}</p></div>}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Bitácora BD ── */}
      {tab === 'bitacora' && (
        <div className="space-y-4">
          <Card>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tabla</label>
                <select value={filtroTabla} onChange={(e) => setFiltroTabla(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
                  <option value="">Todas</option>
                  <option value="expedientes">expedientes</option>
                  <option value="usuarios">usuarios</option>
                  <option value="movimientos">movimientos</option>
                  <option value="pagos">pagos</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Operación</label>
                <select value={filtroOperacion} onChange={(e) => setFiltroOperacion(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
                  <option value="">Todas</option>
                  <option value="INSERT">INSERT</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <Input label="Fecha" type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} />
            </div>
            <div className="flex justify-end mt-3">
              <Button size="sm" onClick={() => cargarBitacora(1)}>Filtrar</Button>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{total} registros encontrados</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => cargarBitacora(pagina - 1)} disabled={pagina <= 1}>← Anterior</Button>
              <span className="text-sm text-gray-500 px-2 py-1">Pág. {pagina}</span>
              <Button size="sm" variant="secondary" onClick={() => cargarBitacora(pagina + 1)} disabled={pagina * 50 >= total}>Siguiente →</Button>
            </div>
          </div>

          <Card padding={false}>
            <Table keyField="id" data={registros} emptyText="No hay registros de auditoría"
              columns={[
                { key: 'fecha_hora',  header: 'Fecha/Hora',  render: (r) => <span className="text-xs text-gray-500 font-mono">{formatFechaHora(r.fecha_hora)}</span> },
                { key: 'tabla',       header: 'Tabla',       render: (r) => <span className="text-xs font-mono font-semibold text-gray-700">{r.tabla}</span> },
                { key: 'operacion',   header: 'Operación',   render: (r) => <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.operacion === 'INSERT' ? 'bg-green-100 text-green-700' : r.operacion === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{r.operacion}</span> },
                { key: 'registro_id', header: 'ID Registro', render: (r) => <span className="text-xs text-gray-500">{r.registro_id ?? '—'}</span> },
                { key: 'usuario_bd',  header: 'Usuario BD',  render: (r) => <span className="text-xs font-mono text-gray-500">{r.usuario_bd ?? '—'}</span> },
                { key: 'cambio', header: 'Cambio de estado', render: (r) => {
                  const antes   = r.datos_anteriores?.estado as string | undefined;
                  const despues = r.datos_nuevos?.estado     as string | undefined;
                  if (!antes && !despues) return <span className="text-xs text-gray-300">—</span>;
                  if (antes && despues && antes !== despues) return (
                    <div className="flex items-center gap-1 text-xs">
                      <EstadoBadge estado={antes as EstadoExpediente} size="sm" />
                      <ArrowRight size={10} className="text-gray-400" />
                      <EstadoBadge estado={despues as EstadoExpediente} size="sm" />
                    </div>
                  );
                  const estado = despues ?? antes;
                  return estado ? <EstadoBadge estado={estado as EstadoExpediente} size="sm" /> : null;
                }},
              ]}
            />
          </Card>
        </div>
      )}

      {/* Modal vacío para expansión futura */}
      <Modal open={modalMov} onClose={() => setModalMov(false)} title="Detalle del expediente" size="lg">
        {expModal && <div />}
      </Modal>
    </div>
  );
}