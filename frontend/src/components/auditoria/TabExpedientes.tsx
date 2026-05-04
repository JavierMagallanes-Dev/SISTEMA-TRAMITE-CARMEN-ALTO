// src/components/auditoria/TabExpedientes.tsx

import { Card }    from '../ui/Card';
import Button      from '../ui/Button';
import Input       from '../ui/Input';
import Spinner     from '../ui/Spinner';
import EstadoBadge from '../shared/EstadoBadge';
import { formatFecha, formatFechaHora } from '../../utils/formato';
import { Search, FileText, User, Clock, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import type { ExpedienteAuditoria, ACCION_LABEL as AcLabel } from '../../hooks/useAuditoria';
import type { EstadoExpediente } from '../../types';

interface Props {
  expedientes:      ExpedienteAuditoria[];
  totalExp:         number;
  paginaExp:        number;
  expandedExp:      number | null;
  setExpandedExp:   (id: number | null) => void;
  cargandoExp:      boolean;
  filtroCodigo:     string; setFiltroCodigo: (v: string) => void;
  filtroEstado:     string; setFiltroEstado: (v: string) => void;
  filtroFechaI:     string; setFiltroFechaI: (v: string) => void;
  filtroFechaF:     string; setFiltroFechaF: (v: string) => void;
  estadosDisponibles: string[];
  accionLabel:      typeof AcLabel;
  onBuscar:         () => void;
  onAnterior:       () => void;
  onSiguiente:      () => void;
}

export default function TabExpedientes({
  expedientes, totalExp, paginaExp,
  expandedExp, setExpandedExp, cargandoExp,
  filtroCodigo, setFiltroCodigo,
  filtroEstado, setFiltroEstado,
  filtroFechaI, setFiltroFechaI,
  filtroFechaF, setFiltroFechaF,
  estadosDisponibles, accionLabel,
  onBuscar, onAnterior, onSiguiente,
}: Props) {
  return (
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
              {estadosDisponibles.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <Input label="Fecha desde" type="date" value={filtroFechaI} onChange={(e) => setFiltroFechaI(e.target.value)} />
          <Input label="Fecha hasta" type="date" value={filtroFechaF} onChange={(e) => setFiltroFechaF(e.target.value)} />
        </div>
        <div className="flex justify-end mt-3">
          <Button size="sm" icon={<Search size={13} />} onClick={onBuscar}>Buscar</Button>
        </div>
      </Card>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{totalExp} expedientes encontrados</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onAnterior} disabled={paginaExp <= 1}>← Anterior</Button>
          <span className="text-sm text-gray-500 px-2 py-1">Pág. {paginaExp} de {Math.ceil(totalExp / 20) || 1}</span>
          <Button size="sm" variant="secondary" onClick={onSiguiente} disabled={paginaExp * 20 >= totalExp}>Siguiente →</Button>
        </div>
      </div>

      {cargandoExp ? <Spinner text="Cargando expedientes..." /> : (
        <div className="space-y-3">
          {expedientes.length === 0 ? (
            <Card><div className="text-center py-8 text-gray-400"><FileText size={32} className="mx-auto mb-2 opacity-40" /><p className="text-sm">No hay expedientes.</p></div></Card>
          ) : expedientes.map((exp) => (
            <Card key={exp.id}>
              {/* Cabecera */}
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
                    {exp.areaActual && <span>Área: <strong>{exp.areaActual.sigla}</strong></span>}
                    {exp.registradoPor && <span>Por: {exp.registradoPor.nombre_completo}</span>}
                  </div>
                </div>
                <Button size="sm" variant="ghost"
                  icon={expandedExp === exp.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  onClick={() => setExpandedExp(expandedExp === exp.id ? null : exp.id)}>
                  {expandedExp === exp.id ? 'Ocultar' : `Historial (${exp.movimientos.length})`}
                </Button>
              </div>

              {/* Timeline expandible */}
              {expandedExp === exp.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Historial de estados y movimientos</p>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                      {exp.movimientos.map((mov, idx) => {
                        const accion  = accionLabel[mov.tipo_accion] ?? { label: mov.tipo_accion, color: 'bg-gray-100 text-gray-600' };
                        const esUltimo = idx === exp.movimientos.length - 1;
                        return (
                          <div key={mov.id} className="relative flex items-start gap-4 pl-10">
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
                              {mov.comentario && <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{mov.comentario}</p>}
                              <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                                <User size={11} />
                                <span>{mov.usuario.nombre_completo}</span>
                                <span className="text-gray-300">·</span>
                                <span>{mov.usuario.rol.nombre.replace('_', ' ')}</span>
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
  );
}