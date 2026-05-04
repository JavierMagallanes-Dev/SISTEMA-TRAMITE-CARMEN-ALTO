// src/pages/ConsultaPage.tsx
// Consulta pública rediseñada — full width, responsive, paleta institucional Carmen Alto.

import { useConsulta }     from '../hooks/useConsulta';
import Spinner             from '../components/ui/Spinner';
import Button              from '../components/ui/Button';
import TimelineMovimientos from '../components/shared/TimelineMovimientos';
import BuscadorHero        from '../components/consulta/BuscadorHero';
import BuscadorCompacto    from '../components/consulta/BuscadorCompacto';
import ExpedienteHeader    from '../components/consulta/ExpedienteHeader';
import SeccionPago         from '../components/consulta/SeccionPago';
import SeccionObservado    from '../components/consulta/SeccionObservado';
import SeccionResuelto     from '../components/consulta/SeccionResuelto';
import { PRIMARY }         from '../hooks/useConsulta';
import { Printer, Download, ArrowLeft } from 'lucide-react';

export default function ConsultaPage() {
  const c = useConsulta();

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Estado inicial: Hero a pantalla completa ── */}
      {!c.expediente && !c.cargando && (
        <BuscadorHero
          codigo={c.codigo}
          setCodigo={c.setCodigo}
          cargando={c.cargando}
          onConsultar={() => c.consultar(c.codigo)}
        />
      )}

      {/* ── Cargando ── */}
      {c.cargando && (
        <div className="flex items-center justify-center min-h-screen">
          <Spinner text="Buscando expediente..." />
        </div>
      )}

      {/* ── Con expediente: layout de dos columnas en desktop ── */}
      {c.expediente && (
        <div className="min-h-screen">
          {/* Buscador compacto sticky */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => c.setCodigo('')}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 shrink-0">
                  <ArrowLeft size={16} />
                </button>
                <div className="flex-1 max-w-lg">
                  <BuscadorCompacto
                    codigo={c.codigo}
                    setCodigo={c.setCodigo}
                    cargando={c.cargando}
                    onConsultar={() => c.consultar(c.codigo)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ── Columna principal (2/3) ── */}
              <div className="lg:col-span-2 space-y-5">
                {/* Header del expediente */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <ExpedienteHeader expediente={c.expediente} />
                </div>

                {/* Pago pendiente */}
                {c.expediente.estado === 'PENDIENTE_PAGO' && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
                  </div>
                )}

                {/* Observado */}
                {c.expediente.estado === 'OBSERVADO' && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <SeccionObservado
                      observacion={c.obtenerObservacion()}
                      archivos={c.archivos}
                      subiendoDocs={c.subiendoDocs}
                      fileInputRef={c.fileInputRef}
                      onArchivoChange={c.handleArchivoChange}
                      onQuitarArchivo={c.quitarArchivo}
                      onSubirDocumentos={c.handleSubirDocumentos}
                    />
                  </div>
                )}

                {/* Resuelto */}
                {c.expediente.url_pdf_firmado && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <SeccionResuelto expediente={c.expediente} />
                  </div>
                )}

                {/* Timeline */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Historial del trámite</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Movimientos visibles para el ciudadano</p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-gray-100 px-2 py-1 rounded-lg">
                      {c.movimientosPublicos.length} movimiento(s)
                    </span>
                  </div>
                  <TimelineMovimientos movimientos={c.expediente.movimientos} soloPublicos={true} />
                </div>
              </div>

              {/* ── Columna lateral (1/3) ── */}
              <div className="space-y-4">
                {/* Cargo de recepción */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ background: PRIMARY }}>
                      <Printer size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Cargo de recepción</p>
                      <p className="text-xs text-slate-400">Constancia oficial de presentación</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    icon={<Download size={13} />}
                    onClick={() => c.descargarCargo(c.expediente!.codigo)}
                    className="w-full justify-center">
                    Descargar cargo
                  </Button>
                </div>

                {/* Info del trámite */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Información del trámite</h3>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-slate-400 shrink-0">Tipo</p>
                      <p className="text-xs font-semibold text-slate-700 text-right">{c.expediente.tipoTramite.nombre}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-400">Plazo</p>
                      <p className="text-xs font-semibold text-slate-700">{c.expediente.tipoTramite.plazo_dias} días hábiles</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-400">Costo</p>
                      <p className="text-xs font-bold text-green-600">S/ {Number(c.expediente.tipoTramite.costo_soles).toFixed(2)}</p>
                    </div>
                    {c.expediente.areaActual && (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-400">Área actual</p>
                        <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full"
                          style={{ background: PRIMARY }}>
                          {c.expediente.areaActual.sigla}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ayuda */}
                <div className="rounded-2xl p-5 space-y-2"
                  style={{ background: 'linear-gradient(135deg, #eaf2fb, #f0f7ff)' }}>
                  <p className="text-xs font-bold text-slate-700">¿Necesitas ayuda?</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Comunícate con Mesa de Partes de lunes a viernes de 8:00 a 16:30.
                  </p>
                  <a href="tel:066123456"
                    className="inline-flex items-center gap-1.5 text-xs font-bold mt-1"
                    style={{ color: PRIMARY }}>
                    📞 (066) 123-456
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}