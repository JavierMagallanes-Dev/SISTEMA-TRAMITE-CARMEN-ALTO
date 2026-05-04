// src/components/historial/FiltrosHistorial.tsx
import { Card } from '../ui/Card';
import { Search, Filter } from 'lucide-react';
import type { FiltroEstado } from '../../hooks/useHistorial';

interface Props {
  busqueda:         string;
  setBusqueda:      (v: string) => void;
  filtroEstado:     FiltroEstado;
  setFiltroEstado:  (f: FiltroEstado) => void;
  totalHistorial:   number;
  totalResueltos:   number;
  totalArchivados:  number;
}

export default function FiltrosHistorial({
  busqueda, setBusqueda,
  filtroEstado, setFiltroEstado,
  totalHistorial, totalResueltos, totalArchivados,
}: Props) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <Filter size={15} className="text-gray-400 shrink-0" />

        {/* Búsqueda */}
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, ciudadano, DNI o trámite..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
          />
        </div>

        {/* Filtro estado */}
        <div className="flex gap-1">
          {(['TODOS', 'RESUELTO', 'ARCHIVADO'] as const).map((e) => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filtroEstado === e ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {e === 'TODOS'     ? `Todos (${totalHistorial})` :
               e === 'RESUELTO'  ? `Resueltos (${totalResueltos})` :
               `Archivados (${totalArchivados})`}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}