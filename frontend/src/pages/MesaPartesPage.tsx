// src/pages/MesaPartesPage.tsx
// Solo orquesta — toda la lógica está en useMesaPartes.

import { useMesaPartes }    from '../hooks/useMesaPartes';
import { Card, CardTitle }  from '../components/ui/Card';
import Button               from '../components/ui/Button';
import Spinner              from '../components/ui/Spinner';
import BandejaMDP           from '../components/mesa-partes/BandejaMDP';
import FormRegistrar        from '../components/mesa-partes/FormRegistrar';
import ModalDetalleMDP      from '../components/mesa-partes/ModalDetalleMDP';
import ModalDerivar         from '../components/mesa-partes/ModalDerivar';
import ModalObservarMDP     from '../components/mesa-partes/ModalObservarMDP';
import ModalPreviewDoc      from '../components/mesa-partes/ModalPreviewDoc';
import { RefreshCw, Clock, Plus } from 'lucide-react';

export default function MesaPartesPage() {
  const mdp = useMesaPartes();

  if (mdp.cargando) return <Spinner text="Cargando Mesa de Partes..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mesa de Partes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de la Municipalidad de Carmen Alto</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={mdp.cargarDatos}>
          Actualizar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'bandeja',   label: `Bandeja (${mdp.bandeja.length})`, icon: <Clock size={13} /> },
          { key: 'registrar', label: 'Nuevo expediente',                icon: <Plus  size={13} /> },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => mdp.setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              mdp.tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Bandeja */}
      {mdp.tab === 'bandeja' && (
        <Card padding={false}>
          <BandejaMDP
            bandeja={mdp.bandeja}
            onVerDetalle={mdp.verDetalle}
            onDescargarCargo={mdp.descargarCargo}
            onDerivar={mdp.abrirDerivar}
          />
        </Card>
      )}

      {/* Registrar */}
      {mdp.tab === 'registrar' && (
        <Card>
          <CardTitle>Registrar nuevo expediente</CardTitle>
          <div className="mt-4">
            <FormRegistrar
              form={mdp.form}
              setF={mdp.setF}
              tipos={mdp.tipos}
              archivoPdf={mdp.archivoPdf}
              buscandoDni={mdp.buscandoDni}
              loading={mdp.loadingReg}
              onBuscarDni={mdp.buscarDni}
              onArchivoChange={mdp.handleArchivoChange}
              onLimpiarArchivo={mdp.limpiarArchivo}
              onRegistrar={mdp.handleRegistrar}
              onCancelar={() => mdp.setTab('bandeja')}
            />
          </div>
        </Card>
      )}

      {/* Modales */}
      <ModalDetalleMDP
        open={mdp.modalDetalle}
        onClose={mdp.cerrarDetalle}
        detalle={mdp.detalle}
        cargando={mdp.cargandoDet}
        loadingUnificado={mdp.loadingUnificado}
        loadingReactivar={mdp.loadingReactivar}
        nombreDoc={mdp.nombreDoc}
        puedeObservar={mdp.puedeObservar}
        onDescargarUnificado={mdp.descargarPdfUnificado}
        onAbrirPreview={mdp.abrirPreview}
        onObservar={mdp.abrirObservar}
        onReactivar={mdp.handleReactivar}
      />

      <ModalDerivar
        open={mdp.modalDerivar}
        onClose={mdp.cerrarDerivar}
        expDerivar={mdp.expDerivar}
        areas={mdp.areas}
        areaDestino={mdp.areaDestino}
        setAreaDestino={mdp.setAreaDestino}
        instrucciones={mdp.instrucciones}
        setInstrucciones={mdp.setInstrucciones}
        pinInput={mdp.pinInput}
        setPinInput={mdp.setPinInput}
        loading={mdp.loadingDerivar}
        onConfirmar={mdp.handleDerivar}
      />

      <ModalObservarMDP
       open={mdp.modalObservar}
  onClose={() => { mdp.setModalObservar(false); mdp.setComentarioObs(''); }}
        comentario={mdp.comentarioObs}
        setComentario={mdp.setComentarioObs}
        loading={mdp.loadingObservar}
        onObservar={mdp.handleObservar}
      />

      <ModalPreviewDoc
        open={mdp.modalPreview}
        onClose={mdp.cerrarPreview}
        doc={mdp.previewDoc}
        nombreDoc={mdp.nombreDoc}
      />
    </div>
  );
}