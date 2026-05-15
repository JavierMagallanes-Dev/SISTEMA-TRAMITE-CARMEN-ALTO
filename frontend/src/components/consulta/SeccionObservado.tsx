// src/components/consulta/SeccionObservado.tsx
// Sección para expedientes OBSERVADOS — muestra qué documentos corregir
// y permite subir la corrección por documento específico.

import { useRef, useState } from 'react';
import { AlertTriangle, Upload, X, CheckCircle, FileText } from 'lucide-react';

interface DocObservado {
  id:     number;
  nombre: string;
}

interface Props {
  observacion:      string | null;
  docsObservados:   DocObservado[];
  expedienteId:     number;
  archivos:         File[];
  subiendoDocs:     boolean;
  fileInputRef:     React.RefObject<HTMLInputElement | null>;
  onArchivoChange:  (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuitarArchivo:  (index: number) => void;
  onSubirDocumentos: () => void;
  onReemplazarDoc:  (docId: number, archivo: File) => Promise<void>;
}

export default function SeccionObservado({
  observacion, docsObservados, expedienteId,
  archivos, subiendoDocs, fileInputRef,
  onArchivoChange, onQuitarArchivo, onSubirDocumentos,
  onReemplazarDoc,
}: Props) {
  const fileRefsDoc = useRef<Record<number, HTMLInputElement | null>>({});
  const [subiendoDoc, setSubiendoDoc] = useState<number | null>(null);
  const [docSubido, setDocSubido] = useState<number[]>([]);

  const handleFileDoc = async (docId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Solo se aceptan archivos PDF.'); return; }
    if (file.size > 10 * 1024 * 1024)   { alert('El archivo no puede superar 10MB.'); return; }

    setSubiendoDoc(docId);
    try {
      await onReemplazarDoc(docId, file);
      setDocSubido(prev => [...prev, docId]);
    } catch { /* error manejado en el hook */ }
    finally {
      setSubiendoDoc(null);
      if (fileRefsDoc.current[docId]) fileRefsDoc.current[docId]!.value = '';
    }
  };

  // Comentario limpio — extraer el mensaje sin el prefijo [DOC:...]
  const comentarioLimpio = observacion
    ? observacion.replace(/^\[DOC:[^\]]*\]\s*/, '')
    : null;

  return (
    <div className="p-5 sm:p-6 space-y-5">
      {/* Header observación */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} className="text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-amber-800">Tu expediente tiene observaciones</h3>
          <p className="text-xs text-amber-600 mt-0.5">
            Revisa los documentos indicados, corrígelos y súbelos desde esta página.
          </p>
        </div>
      </div>

      {/* Comentario de observación */}
      {comentarioLimpio && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1">Motivo de la observación:</p>
          <p className="text-sm text-amber-800">{comentarioLimpio}</p>
        </div>
      )}

      {/* Documentos específicos a corregir */}
      {docsObservados.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            Documentos que debes corregir:
          </p>
          {docsObservados.map((doc) => {
            const nombre   = doc.nombre.replace(/^REQ-\d+:\s*/, '');
            const subido   = docSubido.includes(doc.id);
            const subiendo = subiendoDoc === doc.id;

            return (
              <div key={doc.id} className={`rounded-xl border p-4 ${
                subido ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {subido
                      ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                      : <FileText size={16} className="text-red-500 shrink-0" />
                    }
                    <div>
                      <p className={`text-sm font-semibold ${subido ? 'text-green-700' : 'text-red-700'}`}>
                        {nombre}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {subido ? '✓ Documento corregido enviado' : 'Este documento necesita corrección'}
                      </p>
                    </div>
                  </div>

                  {!subido && (
                    <>
                      <button
                        onClick={() => fileRefsDoc.current[doc.id]?.click()}
                        disabled={subiendo}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {subiendo
                          ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Upload size={13} />
                        }
                        {subiendo ? 'Subiendo...' : 'Subir corrección'}
                      </button>
                      <input
                        ref={el => { fileRefsDoc.current[doc.id] = el; }}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileDoc(doc.id, e)}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sección genérica — si no hay docs específicos o para adjuntar otros */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">
          {docsObservados.length > 0
            ? 'O adjunta documentos adicionales:'
            : 'Adjunta los documentos corregidos:'}
        </p>

        {archivos.length > 0 && (
          <div className="space-y-2 mb-3">
            {archivos.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <FileText size={14} className="text-blue-500 shrink-0" />
                <span className="text-xs text-blue-700 flex-1 truncate">{f.name}</span>
                <button onClick={() => onQuitarArchivo(i)} className="text-gray-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <Upload size={18} className="mx-auto text-gray-400 mb-1" />
          <p className="text-xs text-gray-500 font-medium">Seleccionar PDF adicional</p>
          <p className="text-xs text-gray-400 mt-0.5">Máximo 10MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={onArchivoChange}
        />

        {archivos.length > 0 && (
          <button
            onClick={onSubirDocumentos}
            disabled={subiendoDocs}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {subiendoDocs
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Upload size={15} />
            }
            {subiendoDocs ? 'Subiendo...' : `Enviar ${archivos.length} documento(s)`}
          </button>
        )}
      </div>
    </div>
  );
}