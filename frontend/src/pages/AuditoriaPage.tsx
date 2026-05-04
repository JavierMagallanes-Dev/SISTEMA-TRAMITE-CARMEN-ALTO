// src/pages/AuditoriaPage.tsx
// Solo orquesta — toda la lógica está en useAuditoria.

import { useAuditoria, ACCION_LABEL, ESTADOS_DISPONIBLES } from '../hooks/useAuditoria';
import Button       from '../components/ui/Button';
import Spinner      from '../components/ui/Spinner';
import TabResumen   from '../components/auditoria/TabResumen';
import TabExpedientes from '../components/auditoria/TabExpedientes';
import TabBitacora  from '../components/auditoria/TabBitacora';
import { RefreshCw, TrendingUp, FileText, Shield } from 'lucide-react';

export default function AuditoriaPage() {
  const a = useAuditoria();

  if (a.cargando) return <Spinner text="Cargando auditoría..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Auditoría del Sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">Trazabilidad completa de expedientes y operaciones</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={a.cargarDatos}>Actualizar</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'resumen',     label: 'Resumen',     icon: <TrendingUp size={13} /> },
          { key: 'expedientes', label: 'Expedientes', icon: <FileText   size={13} /> },
          { key: 'bitacora',    label: 'Bitácora BD', icon: <Shield     size={13} /> },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => a.setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              a.tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {a.tab === 'resumen' && a.resumen && (
        <TabResumen resumen={a.resumen} accionLabel={ACCION_LABEL} />
      )}

      {a.tab === 'expedientes' && (
        <TabExpedientes
          expedientes={a.expedientes}
          totalExp={a.totalExp}
          paginaExp={a.paginaExp}
          expandedExp={a.expandedExp}
          setExpandedExp={a.setExpandedExp}
          cargandoExp={a.cargandoExp}
          filtroCodigo={a.filtroCodigo} setFiltroCodigo={a.setFiltroCodigo}
          filtroEstado={a.filtroEstado} setFiltroEstado={a.setFiltroEstado}
          filtroFechaI={a.filtroFechaI} setFiltroFechaI={a.setFiltroFechaI}
          filtroFechaF={a.filtroFechaF} setFiltroFechaF={a.setFiltroFechaF}
          estadosDisponibles={ESTADOS_DISPONIBLES}
          accionLabel={ACCION_LABEL}
          onBuscar={() => a.cargarExpedientes(1)}
          onAnterior={() => a.cargarExpedientes(a.paginaExp - 1)}
          onSiguiente={() => a.cargarExpedientes(a.paginaExp + 1)}
        />
      )}

      {a.tab === 'bitacora' && (
        <TabBitacora
          registros={a.registros}
          total={a.totalBitacora}
          pagina={a.paginaBitacora}
          filtroTabla={a.filtroTabla}         setFiltroTabla={a.setFiltroTabla}
          filtroOperacion={a.filtroOperacion} setFiltroOperacion={a.setFiltroOperacion}
          filtroFecha={a.filtroFecha}         setFiltroFecha={a.setFiltroFecha}
          onFiltrar={() => a.cargarBitacora(1)}
          onAnterior={() => a.cargarBitacora(a.paginaBitacora - 1)}
          onSiguiente={() => a.cargarBitacora(a.paginaBitacora + 1)}
        />
      )}
    </div>
  );
}