// src/components/shared/Paso2Requisitos.tsx
// Paso 2b — Adjuntar documentos uno por uno según requisitos del trámite.
// Se muestra después de registrar el trámite y antes del pago.
import '../../styles/paso2requisitos.css';

import { useRef, useState } from 'react';
import { CheckCircle, Upload, X, FileText, ArrowRight, AlertTriangle } from 'lucide-react';

interface Requisito {
  id:          number;
  nombre:      string;
  descripcion: string | null;
  obligatorio: boolean;
  orden:       number;
}

interface Props {
  requisitos:    Requisito[];
  expedienteId:  number;
  codigoExp:     string;
  onSubirDoc:    (requisitoId: number, archivo: File) => Promise<void>;
  onContinuar:   () => void;
}

interface EstadoReq {
  archivo:   File | null;
  subiendo:  boolean;
  subido:    boolean;
  error:     string;
}

export default function Paso2Requisitos({
  requisitos, codigoExp, onSubirDoc, onContinuar,
}: Props) {
  const [estados, setEstados] = useState<Record<number, EstadoReq>>(() =>
    Object.fromEntries(requisitos.map(r => [r.id, { archivo: null, subiendo: false, subido: false, error: '' }]))
  );

  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const obligatorios     = requisitos.filter(r => r.obligatorio);
  const subidosObligat   = obligatorios.filter(r => estados[r.id]?.subido).length;
  const todoObligOk      = subidosObligat === obligatorios.length;
  const totalSubidos     = requisitos.filter(r => estados[r.id]?.subido).length;
  const progreso         = Math.round((totalSubidos / requisitos.length) * 100);

  const handleArchivoSelect = (requisitoId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setEstados(prev => ({ ...prev, [requisitoId]: { ...prev[requisitoId], error: 'Solo se aceptan archivos PDF.' } }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setEstados(prev => ({ ...prev, [requisitoId]: { ...prev[requisitoId], error: 'El archivo no puede superar 10MB.' } }));
      return;
    }
    setEstados(prev => ({ ...prev, [requisitoId]: { ...prev[requisitoId], archivo: file, error: '' } }));
  };

  const handleSubir = async (requisitoId: number) => {
    const estado = estados[requisitoId];
    if (!estado?.archivo) return;

    setEstados(prev => ({ ...prev, [requisitoId]: { ...prev[requisitoId], subiendo: true, error: '' } }));
    try {
      await onSubirDoc(requisitoId, estado.archivo);
      setEstados(prev => ({ ...prev, [requisitoId]: { ...prev[requisitoId], subiendo: false, subido: true } }));
    } catch {
      setEstados(prev => ({
        ...prev,
        [requisitoId]: { ...prev[requisitoId], subiendo: false, error: 'Error al subir. Intenta nuevamente.' },
      }));
    }
  };

  const handleQuitarArchivo = (requisitoId: number) => {
    setEstados(prev => ({ ...prev, [requisitoId]: { archivo: null, subiendo: false, subido: false, error: '' } }));
    if (inputRefs.current[requisitoId]) inputRefs.current[requisitoId]!.value = '';
  };

  return (
    <div>
      {/* Hero */}
      <div className="pr-hero">
        <div className="pr-label"><span className="pr-dot" />Portal Ciudadano — Paso 2 de 3</div>
        <h1 className="pr-title">Adjunta los documentos requeridos</h1>
        <p className="pr-sub">
          Sube cada documento en formato PDF. Los documentos obligatorios deben adjuntarse para continuar.
        </p>
        <div className="pr-tabs">
          <div className="pr-tab done"><span className="pr-tab-num">✓</span>Seleccionar trámite</div>
          <span className="pr-tab-sep">›</span>
          <div className="pr-tab active"><span className="pr-tab-num">2</span>Tus documentos</div>
          <span className="pr-tab-sep">›</span>
          <div className="pr-tab inactive"><span className="pr-tab-num">3</span>Pagar y enviar</div>
        </div>
      </div>

      <div className="pr-main">

        {/* Código expediente */}
        <div className="pr-codigo-banner">
          <div className="pr-codigo-left">
            <FileText size={18} color="#0C447C" strokeWidth={1.8} />
            <div>
              <p className="pr-codigo-label">Código de expediente asignado</p>
              <p className="pr-codigo-val">{codigoExp}</p>
            </div>
          </div>
          <div className="pr-progreso-wrap">
            <p className="pr-progreso-label">{subidosObligat} de {obligatorios.length} obligatorios</p>
            <div className="pr-progreso-bar">
              <div className="pr-progreso-fill" style={{ width: `${progreso}%` }} />
            </div>
          </div>
        </div>

        {/* Lista de requisitos */}
        <div className="pr-lista">
          {requisitos.map((req) => {
            const estado = estados[req.id];
            return (
              <div
                key={req.id}
                className={`pr-req-card ${estado.subido ? 'done' : ''}`}>

                {/* Header requisito */}
                <div className="pr-req-header">
                  <div className="pr-req-info">
                    <div className={`pr-req-num ${estado.subido ? 'done' : ''}`}>
                      {estado.subido
                        ? <CheckCircle size={14} color="white" />
                        : <span>{req.orden}</span>
                      }
                    </div>
                    <div>
                      <p className="pr-req-nombre">
                        {req.nombre}
                        {req.obligatorio
                          ? <span className="pr-req-badge oblig">Obligatorio</span>
                          : <span className="pr-req-badge opc">Opcional</span>
                        }
                      </p>
                      {req.descripcion && (
                        <p className="pr-req-desc">{req.descripcion}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body — upload */}
                <div className="pr-req-body">
                  {estado.subido ? (
                    <div className="pr-subido-ok">
                      <CheckCircle size={16} color="#1D9E75" />
                      <span>Documento subido correctamente</span>
                    </div>
                  ) : estado.archivo ? (
                    <div className="pr-archivo-sel">
                      <div className="pr-archivo-info">
                        <FileText size={16} color="#185FA5" strokeWidth={1.8} />
                        <span className="pr-archivo-nombre">{estado.archivo.name}</span>
                        <span className="pr-archivo-size">
                          {(estado.archivo.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <div className="pr-archivo-actions">
                        <button
                          className="pr-btn-subir"
                          onClick={() => handleSubir(req.id)}
                          disabled={estado.subiendo}>
                          {estado.subiendo ? (
                            <>
                              <span className="pr-spinner" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload size={14} color="white" />
                              Confirmar
                            </>
                          )}
                        </button>
                        <button
                          className="pr-btn-quitar"
                          onClick={() => handleQuitarArchivo(req.id)}
                          disabled={estado.subiendo}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="pr-upload-zone"
                      onClick={() => inputRefs.current[req.id]?.click()}>
                      <Upload size={18} color="#9CA3B0" strokeWidth={1.8} />
                      <span className="pr-upload-text">Haz clic para seleccionar un PDF</span>
                      <span className="pr-upload-sub">Máximo 10MB</span>
                    </div>
                  )}

                  {estado.error && (
                    <div className="pr-error">
                      <AlertTriangle size={13} color="#D94040" />
                      {estado.error}
                    </div>
                  )}

                  <input
                    ref={el => { inputRefs.current[req.id] = el; }}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleArchivoSelect(req.id, e)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Aviso si faltan obligatorios */}
        {!todoObligOk && (
          <div className="pr-aviso">
            <AlertTriangle size={15} color="#D97706" />
            Debes adjuntar todos los documentos obligatorios para continuar al pago.
            Faltan {obligatorios.length - subidosObligat} documento{obligatorios.length - subidosObligat !== 1 ? 's' : ''}.
          </div>
        )}

        {/* Botón continuar */}
        <button
          className="pr-btn-continuar"
          onClick={onContinuar}
          disabled={!todoObligOk}
          style={{ opacity: todoObligOk ? 1 : 0.4, cursor: todoObligOk ? 'pointer' : 'not-allowed' }}>
          Continuar al pago
          <ArrowRight size={18} color="white" />
        </button>
      </div>
    </div>
  );
}