// src/components/consulta/SeccionObservado.tsx
import Button    from '../ui/Button';
import { AlertCircle, FileText, Upload, X, CheckCircle } from 'lucide-react';

interface Props {
  observacion:       string | null;
  archivos:          File[];
  subiendoDocs:      boolean;
  fileInputRef:      React.RefObject<HTMLInputElement | null>;
  onArchivoChange:   (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuitarArchivo:   (i: number) => void;
  onSubirDocumentos: () => void;
}

export default function SeccionObservado({
  observacion, archivos, subiendoDocs,
  fileInputRef, onArchivoChange, onQuitarArchivo, onSubirDocumentos,
}: Props) {
  return (
    <div className="p-5 sm:p-6">
      <div className="rounded-2xl border border-amber-200 overflow-hidden" style={{ background: 'linear-gradient(to bottom, #fffbeb, white)' }}>
        <div className="px-5 py-3.5 bg-amber-100/70 border-b border-amber-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
            <AlertCircle size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">Tu trámite fue observado</p>
            <p className="text-[11px] text-amber-700">Se requieren documentos adicionales para continuar.</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {observacion && (
            <div className="rounded-xl bg-white border border-amber-200 p-4 relative">
              <div className="absolute -top-2 left-4 px-2 bg-white text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Requerimiento del área
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{observacion}</p>
            </div>
          )}
          {archivos.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-900 mb-2">Documentos seleccionados ({archivos.length})</p>
              <div className="space-y-2">
                {archivos.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                      <FileText size={15} className="text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{f.name}</p>
                      <p className="text-[11px] text-slate-500">{(f.size / 1024).toFixed(0)} KB · listo para enviar</p>
                    </div>
                    <button onClick={() => onQuitarArchivo(i)} className="text-slate-400 hover:text-rose-500 p-1">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div onClick={() => fileInputRef.current?.click()}
            className="rounded-xl p-5 text-center cursor-pointer transition-colors"
            style={{ border: '1.5px dashed #fcd34d', background: 'linear-gradient(180deg, #fffdf5, #fffbeb)' }}>
            <div className="w-9 h-9 rounded-lg bg-amber-100 mx-auto flex items-center justify-center">
              <Upload size={16} className="text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-amber-900 mt-2">
              {archivos.length > 0 ? 'Agregar más PDFs' : 'Adjunta los documentos solicitados'}
            </p>
            <p className="text-[11px] text-amber-700/80 mt-0.5">Arrastra archivos o haz clic — máximo 10 MB cada uno</p>
          </div>
          <input ref={fileInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={onArchivoChange} />
          {archivos.length > 0 && (
            <Button variant="primary" icon={<CheckCircle size={14} />} loading={subiendoDocs}
              onClick={onSubirDocumentos} className="w-full justify-center">
              Enviar {archivos.length} documento(s) al área
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}