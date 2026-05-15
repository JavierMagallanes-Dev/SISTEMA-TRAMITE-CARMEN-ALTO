// src/components/consulta/SeccionObservado.tsx
import { useRef, useState } from 'react';
import { AlertTriangle, Upload, X, CheckCircle, FileText, ZoomIn } from 'lucide-react';

interface DocObservado {
  id:     number;
  nombre: string;
}

interface Props {
  observacion:       string | null;
  docsObservados:    DocObservado[];
  archivos:          File[];
  subiendoDocs:      boolean;
  fileInputRef:      React.RefObject<HTMLInputElement | null>;
  onArchivoChange:   (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuitarArchivo:   (index: number) => void;
  onSubirDocumentos: () => void;
  onReemplazarDoc:   (docId: number, archivo: File) => Promise<void>;
}

export default function SeccionObservado({
  observacion, docsObservados,
  archivos, subiendoDocs, fileInputRef,
  onArchivoChange, onQuitarArchivo, onSubirDocumentos,
  onReemplazarDoc,
}: Props) {
  const fileRefsDoc = useRef<Record<number, HTMLInputElement | null>>({});

  // Estado completamente local — no depende del hook padre
  const [subiendoDoc, setSubiendoDoc] = useState<number | null>(null);
  const [subidos,     setSubidos]     = useState<Record<number, boolean>>({});
  const [previews,    setPreviews]    = useState<Record<number, string>>({});

  const handleFileDoc = async (docId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Solo se aceptan archivos PDF.'); return; }
    if (file.size > 10 * 1024 * 1024)   { alert('El archivo no puede superar 10MB.'); return; }

    setSubiendoDoc(docId);
    const previewUrl = URL.createObjectURL(file);

    try {
      await onReemplazarDoc(docId, file);
      // Actualizar estado local — cambia a verde
      setPreviews(prev => ({ ...prev, [docId]: previewUrl }));
      setSubidos(prev => ({ ...prev, [docId]: true }));
    } catch {
      URL.revokeObjectURL(previewUrl);
    } finally {
      setSubiendoDoc(null);
      if (fileRefsDoc.current[docId]) fileRefsDoc.current[docId]!.value = '';
    }
  };

  const comentarioLimpio = observacion
    ? observacion.replace(/^\[DOC:[^\]]*\]\s*/, '')
    : null;

  return (
    <div className="p-5 sm:p-6 space-y-5">

      {/* Header */}
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

      {/* Comentario */}
      {comentarioLimpio && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1">Motivo de la observación:</p>
          <p className="text-sm text-amber-800">{comentarioLimpio}</p>
        </div>
      )}

      {/* Documentos a corregir */}
      {docsObservados.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            Documentos que debes corregir:
          </p>
          {docsObservados.map((doc) => {
            const nombre   = doc.nombre.replace(/^REQ-\d+:\s*/, '');
            const subido   = subidos[doc.id] === true;
            const subiendo = subiendoDoc === doc.id;
            const preview  = previews[doc.id];

            return (
              <div
                key={doc.id}
                style={{
                  borderRadius: '12px',
                  border: `2px solid ${subido ? '#86efac' : '#fca5a5'}`,
                  backgroundColor: subido ? '#f0fdf4' : '#fef2f2',
                  padding: '16px',
                  transition: 'all 0.3s',
                }}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {subido
                      ? <CheckCircle size={18} color="#22c55e" style={{ flexShrink: 0 }} />
                      : <FileText    size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                    }
                    <div className="min-w-0">
                      <p style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: subido ? '#15803d' : '#dc2626',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {nombre}
                      </p>
                      <p style={{
                        fontSize: '11px',
                        marginTop: '2px',
                        color: subido ? '#16a34a' : '#6b7280',
                      }}>
                        {subido
                          ? '✓ Documento corregido enviado correctamente'
                          : 'Este documento necesita corrección'
                        }
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
                    {/* Botón ver — solo cuando subió */}
                    {subido && preview && (
                      <a
                        href={preview}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '6px 12px', fontSize: '11px', fontWeight: 600,
                          color: '#15803d', backgroundColor: 'white',
                          border: '1px solid #86efac', borderRadius: '8px',
                          textDecoration: 'none', cursor: 'pointer',
                        }}
                      >
                        <ZoomIn size={12} />
                        Ver documento
                      </a>
                    )}

                    {/* Botón subir/cambiar */}
                    <button
                      onClick={() => fileRefsDoc.current[doc.id]?.click()}
                      disabled={subiendo}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', fontSize: '11px', fontWeight: 600,
                        color: subido ? '#15803d' : 'white',
                        backgroundColor: subido ? 'white' : '#ef4444',
                        border: subido ? '1px solid #86efac' : 'none',
                        borderRadius: '8px', cursor: subiendo ? 'not-allowed' : 'pointer',
                        opacity: subiendo ? 0.5 : 1,
                      }}
                    >
                      {subiendo
                        ? <span style={{
                            width: '12px', height: '12px',
                            border: '2px solid currentColor',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'spin 1s linear infinite',
                          }} />
                        : <Upload size={13} />
                      }
                      {subiendo ? 'Subiendo...' : subido ? 'Cambiar' : 'Subir corrección'}
                    </button>

                    <input
                      ref={el => { fileRefsDoc.current[doc.id] = el; }}
                      type="file"
                      accept="application/pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileDoc(doc.id, e)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sección genérica */}
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