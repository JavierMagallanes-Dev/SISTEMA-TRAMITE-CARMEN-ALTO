// src/components/areas/ModalSubirFirma.tsx

import Modal   from '../ui/Modal';
import Button  from '../ui/Button';
import Alert   from '../ui/Alert';
import { useRef } from 'react';
import { Mail, Save, Upload, X, ImagePlus } from 'lucide-react';

interface Props {
  open:              boolean;
  onClose:           () => void;
  emailJefe:         string;
  emailEditable:     string;
  setEmailEditable:  (v: string) => void;
  loadingEmail:      boolean;
  onActualizarEmail: () => void;
  urlFirmaPreview:   string;
  previewFirmaLocal: string;
  setPreviewFirmaLocal: (v: string) => void;
  archivoFirma:      File | null;
  setArchivoFirma:   (f: File | null) => void;
  loadingSubirFirma: boolean;
  onFirmaChange:     (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubirFirma:      () => void;
}

export default function ModalSubirFirma({
  open, onClose,
  emailJefe, emailEditable, setEmailEditable, loadingEmail, onActualizarEmail,
  urlFirmaPreview, previewFirmaLocal, setPreviewFirmaLocal,
  archivoFirma, setArchivoFirma, loadingSubirFirma,
  onFirmaChange, onSubirFirma,
}: Props) {
  const firmaRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setArchivoFirma(null);
    setPreviewFirmaLocal('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Mi firma digital" size="sm">
      <div className="space-y-4">
        {/* Email actualizable */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Mail size={14} className="text-blue-500" />
            Email para recibir el código de firma
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
              value={emailEditable}
              onChange={(e) => setEmailEditable(e.target.value)}
              placeholder="tu@correo.com"
            />
            <Button size="sm" variant="secondary" icon={<Save size={13} />}
              loading={loadingEmail}
              disabled={emailEditable === emailJefe || !emailEditable.trim()}
              onClick={onActualizarEmail}>
              Guardar
            </Button>
          </div>
          {emailEditable !== emailJefe && (
            <p className="text-xs text-amber-600">Email modificado — haz clic en Guardar para confirmar</p>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <Alert type="info" message="Sube una imagen de tu firma manuscrita en fondo blanco. PNG o JPG recomendado." />
        </div>

        {/* Preview firma actual */}
        {urlFirmaPreview && !previewFirmaLocal && (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-center">
            <p className="text-xs text-gray-400 mb-2">Firma actual</p>
            <img src={urlFirmaPreview} alt="Firma actual" className="max-h-16 mx-auto object-contain" />
          </div>
        )}

        {previewFirmaLocal ? (
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
              <p className="text-xs text-gray-400 mb-2">Nueva firma</p>
              <img src={previewFirmaLocal} alt="Nueva firma" className="max-h-20 mx-auto object-contain" />
            </div>
            <button
              onClick={() => { setArchivoFirma(null); setPreviewFirmaLocal(''); if (firmaRef.current) firmaRef.current.value = ''; }}
              className="text-sm text-red-500 flex items-center gap-1 mx-auto">
              <X size={14} />Cambiar imagen
            </button>
          </div>
        ) : (
          <div onClick={() => firmaRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <ImagePlus size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">
              {urlFirmaPreview ? 'Cambiar imagen de firma' : 'Haz clic para seleccionar tu firma'}
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG o WebP · Máximo 2MB</p>
          </div>
        )}

        <input ref={firmaRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFirmaChange} />

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose} className="flex-1 justify-center">Cerrar</Button>
          {archivoFirma && (
            <Button variant="primary" icon={<Upload size={14} />} loading={loadingSubirFirma}
              onClick={onSubirFirma} className="flex-1 justify-center">
              Guardar firma
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}