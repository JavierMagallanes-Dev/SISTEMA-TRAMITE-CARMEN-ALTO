// src/pages/CajeroPage.tsx
// Solo orquesta — toda la lógica está en useCajero.

import { useCajero }          from '../hooks/useCajero';
import Alert                  from '../components/ui/Alert';
import Button                 from '../components/ui/Button';
import Spinner                from '../components/ui/Spinner';
import KpisCajero             from '../components/cajero/KpisCajero';
import TablaPendientes        from '../components/cajero/TablaPendientes';
import TablaHistorial         from '../components/cajero/TablaHistorial';
import ModalVerificarPago     from '../components/cajero/ModalVerificarPago';
import ModalAnularPago        from '../components/cajero/ModalAnularPago';
import ModalComprobante       from '../components/cajero/ModalComprobante';
import { RefreshCw, History } from 'lucide-react';

export default function CajeroPage() {
  const c = useCajero();

  if (c.cargando) return <Spinner text="Cargando módulo cajero..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Módulo Cajero</h1>
          <p className="text-sm text-gray-500 mt-0.5">Verificación y control de pagos</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={c.cargarDatos}>Actualizar</Button>
      </div>

      {c.error   && <Alert type="error"   message={c.error}   onClose={() => c.setError('')}   />}
      {c.success && <Alert type="success" message={c.success} onClose={() => c.setSuccess('')} />}

      {/* KPIs */}
      {c.resumenHoy && <KpisCajero resumenHoy={c.resumenHoy} />}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['pendientes', 'historial'] as const).map((t) => (
          <button key={t} onClick={() => c.setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              c.tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'historial' && <History size={13} />}
            {t === 'pendientes' ? `Pendientes de pago (${c.pendientes.length})` : 'Historial'}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {c.tab === 'pendientes' && (
        <TablaPendientes
          pendientes={c.pendientes}
          onVerificarPago={c.abrirModalPago}
          onVerComprobante={c.verComprobante}
        />
      )}

      {c.tab === 'historial' && (
        <TablaHistorial
          historial={c.historial}
          onAnular={c.abrirModalAnular}
          onVerComprobante={c.verComprobante}
        />
      )}

      {/* Modales */}
      <ModalVerificarPago
        open={c.modalPago}
        onClose={() => c.setModalPago(false)}
        expSeleccionado={c.expSeleccionado}
        boleta={c.boleta}   setBoleta={c.setBoleta}
        monto={c.monto}     setMonto={c.setMonto}
        loading={c.loadingPago}
        onConfirmar={c.handleVerificarPago}
        onVerComprobante={c.verComprobante}
      />

      <ModalAnularPago
        open={c.modalAnular}
        onClose={() => c.setModalAnular(false)}
        pagoSeleccionado={c.pagoSeleccionado}
        motivo={c.motivo}   setMotivo={c.setMotivo}
        loading={c.loadingAnular}
        onAnular={c.handleAnularPago}
      />

      <ModalComprobante
        open={c.modalComprobante}
        onClose={() => c.setModalComprobante(false)}
        urlComprobante={c.urlComprobante}
        esImagen={c.esImagen}
      />
    </div>
  );
}