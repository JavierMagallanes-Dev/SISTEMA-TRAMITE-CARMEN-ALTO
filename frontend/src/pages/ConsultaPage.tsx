// src/pages/ConsultaPage.tsx
// Solo orquesta — toda la lógica está en useConsulta.

import { useConsulta }       from '../hooks/useConsulta';
import Spinner               from '../components/ui/Spinner';
import Button                from '../components/ui/Button';
import TimelineMovimientos   from '../components/shared/TimelineMovimientos';
import BuscadorHero          from '../components/consulta/BuscadorHero';
import BuscadorCompacto      from '../components/consulta/BuscadorCompacto';
import ExpedienteHeader      from '../components/consulta/ExpedienteHeader';
import SeccionPago           from '../components/consulta/SeccionPago';
import SeccionObservado      from '../components/consulta/SeccionObservado';
import SeccionResuelto       from '../components/consulta/SeccionResuelto';
import { PRIMARY }           from '../hooks/useConsulta';
import { Printer, Download } from 'lucide-react';

export default function ConsultaPage() {
  const c = useConsulta();

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 sm:px-6 sm:py-8">

        {/* Buscador */}
        {!c.expediente && !c.cargando ? (
          <BuscadorHero
            codigo={c.codigo}
            setCodigo={c.setCodigo}
            cargando={c.cargando}
            onConsultar={() => c.consultar(c.codigo)}
          />
        ) : (
          <BuscadorCompacto
            codigo={c.codigo}
            setCodigo={c.setCodigo}
            cargando={c.cargando}
            onConsultar={() => c.consultar(c.codigo)}
          />
        )}

        {c.cargando && <Spinner text="Buscando expediente..." />}

        {/* Expediente */}
        {c.expediente && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              <ExpedienteHeader expediente={c.expediente} />

              {/* Pago pendiente */}
              {c.expediente.estado === 'PENDIENTE_PAGO' && (
                <SeccionPago
                  expediente={c.expediente}
                  opcionPago={c.opcionPago}
                  setOpcionPago={c.setOpcionPago}
                  comprobante={c.comprobante}
                  setComprobante={c.setComprobante}
                  subiendoComp={c.subiendoComp}
                  comprobanteSubido={c.comprobanteSubido}
                  yaSubioComprobante={c.yaSubioComprobante}
                  comprobanteInputRef={c.comprobanteInputRef}
                  onComprobanteChange={c.handleComprobanteChange}
                  onSubirComprobante={c.handleSubirComprobante}
                  onPagoExito={c.handlePagoExito}
                />
              )}

              {/* Observado */}
              {c.expediente.estado === 'OBSERVADO' && (
                <SeccionObservado
                  observacion={c.obtenerObservacion()}
                  archivos={c.archivos}
                  subiendoDocs={c.subiendoDocs}
                  fileInputRef={c.fileInputRef}
                  onArchivoChange={c.handleArchivoChange}
                  onQuitarArchivo={c.quitarArchivo}
                  onSubirDocumentos={c.handleSubirDocumentos}
                />
              )}

              {/* Resuelto */}
              <SeccionResuelto expediente={c.expediente} />

              {/* Cargo de recepción footer */}
              <div className="border-t border-gray-100 px-5 sm:px-6 py-4 flex items-center justify-between gap-3 bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0" style={{ color: PRIMARY }}>
                    <Printer size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">Cargo de recepción</p>
                    <p className="text-[11px] text-slate-500 truncate">Constancia oficial de presentación</p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" icon={<Download size={13} />}
                  onClick={() => c.descargarCargo(c.expediente!.codigo)}>
                  Descargar
                </Button>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Historial del trámite</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {c.movimientosPublicos.length} movimiento(s)
                </span>
              </div>
              <TimelineMovimientos movimientos={c.expediente.movimientos} soloPublicos={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}