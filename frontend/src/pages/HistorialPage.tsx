// src/pages/HistorialPage.tsx
// Solo orquesta — toda la lógica está en useHistorial.

import { useHistorial }         from '../hooks/useHistorial';
import Button                   from '../components/ui/Button';
import Spinner                  from '../components/ui/Spinner';
import KpisHistorial            from '../components/historial/KpisHistorial';
import FiltrosHistorial         from '../components/historial/FiltrosHistorial';
import ListaHistorial           from '../components/historial/ListaHistorial';
import ModalDetalleHistorial    from '../components/historial/ModalDetalleHistorial';
import { RefreshCw }            from 'lucide-react';

export default function HistorialPage() {
  const h = useHistorial();

  if (h.cargando) return <Spinner text="Cargando historial..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Historial de Trámites</h1>
          <p className="text-sm text-gray-500 mt-0.5">Expedientes resueltos y archivados</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={h.cargarHistorial}>
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <KpisHistorial
        totalResueltos={h.totalResueltos}
        totalArchivados={h.totalArchivados}
        totalHistorial={h.expedientes.length}
      />

      {/* Filtros */}
      <FiltrosHistorial
        busqueda={h.busqueda}           setBusqueda={h.setBusqueda}
        filtroEstado={h.filtroEstado}   setFiltroEstado={h.setFiltroEstado}
        totalHistorial={h.expedientes.length}
        totalResueltos={h.totalResueltos}
        totalArchivados={h.totalArchivados}
      />

      {/* Lista */}
      <ListaHistorial
        expedientes={h.expedientesFiltrados}
        onVerDetalle={h.verDetalle}
      />

      {/* Modal detalle */}
      <ModalDetalleHistorial
        open={h.modalDetalle}
        onClose={h.cerrarDetalle}
        detalle={h.detalle}
        cargando={h.cargandoDet}
      />
    </div>
  );
}