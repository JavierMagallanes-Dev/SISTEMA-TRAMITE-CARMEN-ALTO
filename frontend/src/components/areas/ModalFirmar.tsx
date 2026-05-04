// src/components/areas/ModalFirmar.tsx
// Modal de firma digital con recuadro arrastrable sobre PDF real.

import Modal   from '../ui/Modal';
import Button  from '../ui/Button';
import Alert   from '../ui/Alert';
import Input   from '../ui/Input';
import Spinner from '../ui/Spinner';
import { ShieldCheck, PenLine, Mail } from 'lucide-react';
import type { ExpedienteBandeja } from '../../hooks/useAreas';

interface Props {
  open:            boolean;
  onClose:         () => void;
  expFirma:        ExpedienteBandeja | null;
  loadingPdfFirma: boolean;
  urlPdfFirma:     string;
  emailJefe:       string;
  urlFirmaPreview: string;
  paginaFirma:     number;
  setPaginaFirma:  (v: number) => void;
  firmaPos:        { x: number; y: number };
  visorRef: React.RefObject<HTMLDivElement | null>;
  onMouseDown:     (e: React.MouseEvent) => void;
  codigoEnviado:   boolean;
  setCodigoEnviado:(v: boolean) => void;
  codigoInput:     string;
  setCodigoInput:  (v: string) => void;
  loadingCodigo:   boolean;
  loadingFirmar:   boolean;
  onSolicitarCodigo: () => void;
  onFirmar:          () => void;
  VISOR_W:  number;
  VISOR_H:  number;
  FIRMA_PX_W: number;
  FIRMA_PX_H: number;
}

export default function ModalFirmar({
  open, onClose, expFirma,
  loadingPdfFirma, urlPdfFirma,
  emailJefe, urlFirmaPreview,
  paginaFirma, setPaginaFirma,
  firmaPos, visorRef, onMouseDown,
  codigoEnviado, setCodigoEnviado,
  codigoInput, setCodigoInput,
  loadingCodigo, loadingFirmar,
  onSolicitarCodigo, onFirmar,
  VISOR_W, VISOR_H, FIRMA_PX_W, FIRMA_PX_H,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Firmar expediente digitalmente" size="lg">
      {expFirma && (
        <div className="space-y-4">
          {/* Info */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="bg-blue-50 rounded-lg px-4 py-2 flex-1">
              <p className="font-mono text-sm font-semibold text-blue-600">{expFirma.codigo}</p>
              <p className="text-xs text-gray-500">{expFirma.tipoTramite.nombre}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              <Mail size={14} className="text-blue-500 shrink-0" />
              <span className="text-xs">Código se enviará a: <strong>{emailJefe}</strong></span>
            </div>
          </div>

          {/* Página */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 shrink-0">Página donde firmar:</label>
            <input type="number" min={1} value={paginaFirma}
              onChange={(e) => setPaginaFirma(Math.max(1, Number(e.target.value)))}
              className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
            <p className="text-xs text-gray-400">Arrastra el recuadro azul sobre el PDF</p>
          </div>

          {/* Visor con PDF real */}
          <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-100 mx-auto w-full"
  style={{ maxWidth: VISOR_W, height: VISOR_H }}>

            {loadingPdfFirma ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner text="Cargando PDF del expediente..." />
              </div>
            ) : urlPdfFirma ? (
              <iframe
                src={`${urlPdfFirma}#page=${paginaFirma}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                className="absolute inset-0 w-full h-full border-none"
                title="PDF del expediente"
              />
            ) : (
              <div className="absolute inset-0 bg-white flex items-center justify-center">
                <p className="text-sm text-gray-400">No se pudo cargar el PDF</p>
              </div>
            )}

            {/* Capa transparente */}
            <div ref={visorRef} className="absolute inset-0" style={{ zIndex: 10, cursor: 'default', pointerEvents: 'none' }} />

            {/* Recuadro firma arrastrable */}
            <div
              onMouseDown={onMouseDown}
              className="absolute border-2 border-blue-500 rounded-lg shadow-lg cursor-grab active:cursor-grabbing select-none"
              style={{
                left: firmaPos.x, top: firmaPos.y,
                width: FIRMA_PX_W, height: FIRMA_PX_H,
                zIndex: 20,
                backgroundColor: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(2px)',
              }}>
              {urlFirmaPreview ? (
                <img src={urlFirmaPreview} alt="Tu firma" className="w-full h-full object-contain p-1" draggable={false} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs text-blue-600 font-medium">Tu firma</span>
                </div>
              )}
              <div className="absolute -top-5 left-0 right-0 text-center">
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap">
                  ☰ Arrastra aquí
                </span>
              </div>
            </div>
          </div>

          {/* Pasos */}
          {!codigoEnviado ? (
            <div className="space-y-3">
              <Alert type="info" message="Cuando hayas posicionado tu firma, solicita el código de aprobación." />
              <Button variant="primary" icon={<ShieldCheck size={14} />} loading={loadingCodigo}
                onClick={onSolicitarCodigo} className="w-full justify-center">
                Enviar código de aprobación a mi email
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Alert type="info" message={`Código enviado a ${emailJefe}. Tendrás 10 minutos para ingresarlo.`} />
              <Input label="Código de aprobación (6 dígitos)" placeholder="000000"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6} autoFocus />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setCodigoEnviado(false)} className="flex-1 justify-center">Reenviar código</Button>
                <Button variant="primary" icon={<PenLine size={14} />} loading={loadingFirmar}
                  disabled={codigoInput.length !== 6} onClick={onFirmar} className="flex-1 justify-center">
                  Firmar y resolver expediente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}