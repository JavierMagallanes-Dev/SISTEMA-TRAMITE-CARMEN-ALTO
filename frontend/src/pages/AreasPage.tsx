// src/pages/AreasPage.tsx
// Solo orquesta — toda la lógica está en useAreas.

import { useAreas }          from '../hooks/useAreas';
import Button                from '../components/ui/Button';
import Spinner               from '../components/ui/Spinner';
import ConfirmModal          from '../components/shared/ConfirmModal';
import BandejaAreas          from '../components/areas/BandejaAreas';
import ModalDetalleAreas     from '../components/areas/ModalDetalleAreas';
import ModalFirmar           from '../components/areas/ModalFirmar';
import ModalSubirFirma       from '../components/areas/ModalSubirFirma';
import ModalAdjuntar         from '../components/areas/ModalAdjuntar';
import ModalComentarioAreas  from '../components/areas/ModalComentarioAreas';
import ModalPreviewDoc       from '../components/mesa-partes/ModalPreviewDoc';
import { RefreshCw, ImagePlus } from 'lucide-react';

export default function AreasPage() {
  const a = useAreas();

  if (a.cargando) return <Spinner text="Cargando bandeja..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {a.esJefe ? 'Bandeja Jefe de Área' : 'Bandeja Técnica'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {a.usuario?.area?.nombre} — {a.bandeja.length} expediente(s)
          </p>
        </div>
        <div className="flex gap-2">
          {a.esJefe && (
            <Button
              variant={a.tieneFirma ? 'secondary' : 'primary'}
              icon={<ImagePlus size={14} />}
              onClick={() => a.setModalSubirFirma(true)}>
              {a.tieneFirma ? 'Mi firma ✓' : 'Subir mi firma'}
            </Button>
          )}
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={a.cargarBandeja}>
            Actualizar
          </Button>
        </div>
      </div>

      {/* Bandeja */}
      <BandejaAreas
        bandeja={a.bandeja}
        esJefe={a.esJefe}
        onVerDetalle={a.verDetalle}
        onTomar={(exp)     => a.setConfirmTomar(exp)}
        onReactivar={(exp) => a.setConfirmReactivar(exp)}
        onAdjuntar={(exp)  => { a.setExpAdjuntar(exp); a.setArchivoAdjunto(null); a.setModalAdjuntar(true); }}
        onObservar={(exp)  => { a.setExpAccion(exp); a.setComentario(''); a.setModalObservar(true); }}
        onRechazar={(exp)  => { a.setExpAccion(exp); a.setComentario(''); a.setModalRechazar(true); }}
        onVistoBueno={(exp)=> a.setConfirmVisto(exp)}
        onFirmar={a.abrirModalFirma}
        onArchivar={(exp)  => a.setConfirmArchivar(exp)}
      />

      {/* Modales */}
      <ModalDetalleAreas
        open={a.modalDetalle}
        onClose={a.cerrarDetalle}
        detalle={a.detalle}
        cargando={a.cargandoDet}
        loadingUnif={a.loadingUnif}
        nombreDoc={a.nombreDoc}
        onDescargarUnif={a.descargarUnificado}
        onAbrirPreview={a.abrirPreview}
      />

      <ModalPreviewDoc
        open={a.modalPreview}
        onClose={a.cerrarPreview}
        doc={a.previewDoc}
        nombreDoc={a.nombreDoc}
      />

      <ModalAdjuntar
        open={a.modalAdjuntar}
        onClose={() => a.setModalAdjuntar(false)}
        expAdjuntar={a.expAdjuntar}
        archivoAdjunto={a.archivoAdjunto}
        setArchivo={a.setArchivoAdjunto}
        loading={a.loadingAdjunto}
        onAdjuntar={a.handleAdjuntar}
      />

      <ModalComentarioAreas
        open={a.modalObservar}
        onClose={() => { a.setModalObservar(false); a.setComentario(''); }}
        title="Registrar observación"
        label="Detalle de la observación"
        placeholder="Qué falta o qué debe corregirse..."
        comentario={a.comentario}
        setComentario={a.setComentario}
        loading={a.loading}
        onConfirmar={a.handleObservar}
        variant="primary"
        confirmText="Registrar"
      />

      <ModalComentarioAreas
        open={a.modalRechazar}
        onClose={() => { a.setModalRechazar(false); a.setComentario(''); }}
        title="Rechazar expediente"
        label="Motivo de rechazo"
        placeholder="Describe el motivo..."
        comentario={a.comentario}
        setComentario={a.setComentario}
        loading={a.loading}
        onConfirmar={a.handleRechazar}
        variant="danger"
        confirmText="Rechazar"
      />

      <ModalFirmar
        open={a.modalFirma}
        onClose={a.cerrarModalFirma}
        expFirma={a.expFirma}
        loadingPdfFirma={a.loadingPdfFirma}
        urlPdfFirma={a.urlPdfFirma}
        emailJefe={a.emailJefe}
        urlFirmaPreview={a.urlFirmaPreview}
        paginaFirma={a.paginaFirma}
        setPaginaFirma={a.setPaginaFirma}
        firmaPos={a.firmaPos}
        visorRef={a.visorRef}
        onMouseDown={a.onMouseDown}
        codigoEnviado={a.codigoEnviado}
        setCodigoEnviado={a.setCodigoEnviado}
        codigoInput={a.codigoInput}
        setCodigoInput={a.setCodigoInput}
        loadingCodigo={a.loadingCodigo}
        loadingFirmar={a.loadingFirmar}
        onSolicitarCodigo={a.solicitarCodigo}
        onFirmar={a.handleFirmar}
        VISOR_W={a.VISOR_W}
        VISOR_H={a.VISOR_H}
        FIRMA_PX_W={a.FIRMA_PX_W}
        FIRMA_PX_H={a.FIRMA_PX_H}
      />

      <ModalSubirFirma
        open={a.modalSubirFirma}
        onClose={() => a.setModalSubirFirma(false)}
        emailJefe={a.emailJefe}
        emailEditable={a.emailEditable}
        setEmailEditable={a.setEmailEditable}
        loadingEmail={a.loadingEmail}
        onActualizarEmail={a.handleActualizarEmail}
        urlFirmaPreview={a.urlFirmaPreview}
        previewFirmaLocal={a.previewFirmaLocal}
        setPreviewFirmaLocal={a.setPreviewFirmaLocal}
        archivoFirma={a.archivoFirma}
        setArchivoFirma={a.setArchivoFirma}
        loadingSubirFirma={a.loadingSubirFirma}
        onFirmaChange={a.handleFirmaChange}
        onSubirFirma={a.handleSubirFirma}
      />

      {/* Confirms */}
      <ConfirmModal open={!!a.confirmTomar}     onClose={() => a.setConfirmTomar(null)}     onConfirm={() => a.confirmTomar     && a.handleTomar(a.confirmTomar)}        title="Tomar expediente"    message={`¿Tomar ${a.confirmTomar?.codigo}?`}     confirmText="Tomar"           loading={a.loading} />
      <ConfirmModal open={!!a.confirmVisto}     onClose={() => a.setConfirmVisto(null)}     onConfirm={() => a.confirmVisto     && a.handleVistoBueno(a.confirmVisto)}   title="Dar visto bueno"     message={`¿Visto bueno para ${a.confirmVisto?.codigo}?`} confirmText="Dar visto bueno" loading={a.loading} />
      <ConfirmModal open={!!a.confirmArchivar}  onClose={() => a.setConfirmArchivar(null)}  onConfirm={() => a.confirmArchivar  && a.handleArchivar(a.confirmArchivar)}  title="Archivar expediente"  message={`¿Archivar ${a.confirmArchivar?.codigo}?`}  confirmText="Archivar"        loading={a.loading} danger />
      <ConfirmModal open={!!a.confirmReactivar} onClose={() => a.setConfirmReactivar(null)} onConfirm={() => a.confirmReactivar && a.handleReactivar(a.confirmReactivar)} title="Reactivar expediente" message={`¿Reactivar ${a.confirmReactivar?.codigo}?`} confirmText="Reactivar"       loading={a.loading} />
    </div>
  );
}