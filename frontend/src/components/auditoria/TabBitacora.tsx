// src/components/auditoria/TabBitacora.tsx

import { Card }    from '../ui/Card';
import Button      from '../ui/Button';
import Input       from '../ui/Input';
import Table       from '../ui/Table';
import EstadoBadge from '../shared/EstadoBadge';
import { formatFechaHora } from '../../utils/formato';
import { ArrowRight } from 'lucide-react';
import type { RegistroAuditoria } from '../../hooks/useAuditoria';
import type { EstadoExpediente }  from '../../types';

interface Props {
  registros:          RegistroAuditoria[];
  total:              number;
  pagina:             number;
  filtroTabla:        string; setFiltroTabla:     (v: string) => void;
  filtroOperacion:    string; setFiltroOperacion: (v: string) => void;
  filtroFecha:        string; setFiltroFecha:     (v: string) => void;
  onFiltrar:          () => void;
  onAnterior:         () => void;
  onSiguiente:        () => void;
}

export default function TabBitacora({
  registros, total, pagina,
  filtroTabla, setFiltroTabla,
  filtroOperacion, setFiltroOperacion,
  filtroFecha, setFiltroFecha,
  onFiltrar, onAnterior, onSiguiente,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Filtros */}
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
          <Button size="sm" onClick={onFiltrar}>Filtrar</Button>
        </div>
      </Card>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{total} registros encontrados</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onAnterior} disabled={pagina <= 1}>← Anterior</Button>
          <span className="text-sm text-gray-500 px-2 py-1">Pág. {pagina}</span>
          <Button size="sm" variant="secondary" onClick={onSiguiente} disabled={pagina * 50 >= total}>Siguiente →</Button>
        </div>
      </div>

      {/* Tabla */}
      <Card padding={false}>
        <Table keyField="id" data={registros} emptyText="No hay registros de auditoría"
          columns={[
            { key: 'fecha_hora',  header: 'Fecha/Hora',  render: (r) => <span className="text-xs text-gray-500 font-mono">{formatFechaHora(r.fecha_hora)}</span> },
            { key: 'tabla',       header: 'Tabla',       render: (r) => <span className="text-xs font-mono font-semibold text-gray-700">{r.tabla}</span> },
            { key: 'operacion',   header: 'Operación',   render: (r) => (
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                r.operacion === 'INSERT' ? 'bg-green-100 text-green-700' :
                r.operacion === 'UPDATE' ? 'bg-blue-100 text-blue-700'  :
                                           'bg-red-100 text-red-700'
              }`}>{r.operacion}</span>
            )},
            { key: 'registro_id', header: 'ID Registro', render: (r) => <span className="text-xs text-gray-500">{r.registro_id ?? '—'}</span> },
            { key: 'usuario_bd',  header: 'Usuario BD',  render: (r) => <span className="text-xs font-mono text-gray-500">{r.usuario_bd ?? '—'}</span> },
            { key: 'cambio', header: 'Cambio de estado', render: (r) => {
              const antes   = r.datos_anteriores?.estado as string | undefined;
              const despues = r.datos_nuevos?.estado     as string | undefined;
              if (!antes && !despues) return <span className="text-xs text-gray-300">—</span>;
              if (antes && despues && antes !== despues) return (
                <div className="flex items-center gap-1 text-xs">
                  <EstadoBadge estado={antes   as EstadoExpediente} size="sm" />
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
  );
}