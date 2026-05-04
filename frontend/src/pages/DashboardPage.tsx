// src/pages/DashboardPage.tsx
// Solo orquesta — toda la lógica está en useDashboard.

import { useDashboard, isKpisMesaPartes, isKpisCajero, isKpisAreaTecnica } from '../hooks/useDashboard';
import { useAuth }           from '../context/AuthContext';
import Spinner               from '../components/ui/Spinner';
import SeccionMesaPartes     from '../components/dashboard/SeccionMesaPartes';
import SeccionCajero         from '../components/dashboard/SeccionCajero';
import SeccionAreaTecnica    from '../components/dashboard/SeccionAreaTecnica';
import { RefreshCw }         from 'lucide-react';

export default function DashboardPage() {
  const { usuario }                         = useAuth();
  const { datos, cargando, cargar, dataBarras, dataTendencia } = useDashboard();
  const rol = usuario?.rol?.nombre;

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
        <button onClick={cargar}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100">
          <RefreshCw size={14} />Actualizar
        </button>
      </div>

      {/* Sección según rol */}
      {(rol === 'MESA_DE_PARTES' || rol === 'ADMIN') && datos?.kpis && isKpisMesaPartes(datos.kpis) && (
        <SeccionMesaPartes
          kpis={datos.kpis}
          ultimosExpedientes={datos.ultimos_expedientes}
          dataBarras={dataBarras}
          dataTendencia={dataTendencia}
        />
      )}

      {rol === 'CAJERO' && datos?.kpis && isKpisCajero(datos.kpis) && (
        <SeccionCajero kpis={datos.kpis} />
      )}

      {(rol === 'TECNICO' || rol === 'JEFE_AREA') && datos?.kpis && isKpisAreaTecnica(datos.kpis) && (
        <SeccionAreaTecnica kpis={datos.kpis} />
      )}
    </div>
  );
}