// src/pages/PortalPage.tsx
// Solo orquesta — toda la lógica está en usePortal.

import { usePortal }      from '../hooks/usePortal';
import Spinner            from '../components/ui/Spinner';
import SeleccionTramite   from '../components/shared/SeleccionTramite';
import Paso2Datos         from '../components/shared/Paso2Datos';
import Paso3Pago          from '../components/shared/Paso3Pago';

export default function PortalPage() {
  const p = usePortal();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* PASO 1 — Selección de trámite */}
      {p.paso === 1 && (
        p.tipos.length === 0
          ? <div className="flex items-center justify-center min-h-96"><Spinner text="Cargando trámites..." /></div>
          : <SeleccionTramite
              tipos={p.tipos}
              seleccionado={p.tipoSeleccionado}
              paso={1}
              onSeleccionar={p.handleSeleccionarTramite}
              onContinuar={p.handleContinuar}
            />
      )}

      {/* PASO 2 — Datos + Requisitos + Turnstile */}
      {p.paso === 2 && p.tipoSeleccionado && (
        <Paso2Datos
          tipoSeleccionado={p.tipoSeleccionado}
          form={p.form}
          setF={p.setF}
          buscandoDni={p.buscandoDni}
          buscarDni={p.buscarDni}
          turnstileToken={p.turnstileToken}
          setTurnstileToken={p.setTurnstileToken}
          loading={p.loading}
          onAtras={p.handleAtras}
          onRegistrar={p.handleRegistrar}
          onTurnstileExpire={p.handleTurnstileExpire}
          onTurnstileError={p.handleTurnstileError}
          requisitos={p.requisitos}
          estadosReq={p.estadosReq}
          onArchivoReq={p.handleArchivoReq}
          onSubirReq={p.handleSubirReq}
        />
      )}

      {/* PASO 3 — Pago */}
      {p.paso === 3 && p.tipoRegistrado && (
        <Paso3Pago
          codigoGenerado={p.codigoGenerado}
          tipoRegistrado={p.tipoRegistrado}
          onResetForm={p.resetForm}
        />
      )}
    </div>
  );
}