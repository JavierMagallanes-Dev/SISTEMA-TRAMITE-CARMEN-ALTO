// src/components/shared/Paso2Datos.tsx
// Paso 2 del PortalPage — datos personales, PDF adjunto y Turnstile.
// Diseño adaptado del prototipo institucional.
import '../../styles/paso2.css';

import { useRef } from 'react';
import { ArrowLeft, FileText, Search, Upload, X } from 'lucide-react';
import Turnstile from './Turnstile';

interface TipoTramite {
  id: number; nombre: string; descripcion: string | null;
  costo_soles: number; plazo_dias: number;
}

interface Form {
  dni: string; nombres: string; apellido_pat: string;
  apellido_mat: string; email: string; telefono: string;
}

interface Props {
  tipoSeleccionado: TipoTramite;
  form:             Form;
  setF:             (field: string, value: string) => void;
  buscandoDni:      boolean;
  buscarDni:        () => void;
  archivoPdf:       File | null;
  setArchivoPdf:    (f: File | null) => void;
  turnstileToken:   string;
  setTurnstileToken:(t: string) => void;
  loading:          boolean;
  onAtras:          () => void;
  onRegistrar:      () => void;
  onArchivoChange:  (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTurnstileExpire:() => void;
  onTurnstileError: () => void;
}

export default function Paso2Datos({
  tipoSeleccionado, form, setF, buscandoDni, buscarDni,
  archivoPdf, setArchivoPdf, turnstileToken, setTurnstileToken,
  loading, onAtras, onRegistrar, onArchivoChange,
  onTurnstileExpire, onTurnstileError,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="p2-hero">
        <div className="p2-label">
          <span className="p2-dot" />
          Portal Ciudadano — Paso 2 de 3
        </div>
        <h1 className="p2-title">Completa tus datos personales</h1>
        <p className="p2-sub">
          Ingresa la información del solicitante. Los campos marcados con{' '}
          <span style={{ color: '#9FE1CB', fontWeight: 700 }}>*</span> son obligatorios.
        </p>

        {/* Step tabs */}
        <div className="p2-tabs">
          <div className="p2-tab done">
            <span className="p2-tab-num">✓</span>
            Seleccionar trámite
          </div>
          <span className="p2-tab-sep">›</span>
          <div className="p2-tab active">
            <span className="p2-tab-num">2</span>
            Tus datos
          </div>
          <span className="p2-tab-sep">›</span>
          <div className="p2-tab inactive">
            <span className="p2-tab-num">3</span>
            Pagar y enviar
          </div>
        </div>
      </div>

      {/* ── Main ──────────────────────────────────────────── */}
      <div className="p2-main">

        {/* Banner trámite */}
        <div className="p2-banner">
          <div className="p2-banner-left">
            <div className="p2-banner-icon">
              <FileText size={18} color="#0C447C" strokeWidth={1.8} />
            </div>
            <div>
              <p className="p2-banner-label">Trámite seleccionado</p>
              <p className="p2-banner-name">{tipoSeleccionado.nombre}</p>
            </div>
          </div>
          <span className="p2-banner-price">
            S/ {Number(tipoSeleccionado.costo_soles).toFixed(2)}
          </span>
        </div>

        {/* Datos del solicitante */}
        <p className="p2-section-label">Datos del solicitante</p>

        {/* DNI */}
        <div className="p2-field" style={{ marginBottom: 20 }}>
          <label className="p2-label-field">
            DNI <span className="p2-label-req">*</span>
          </label>
          <div className="p2-dni-wrap">
            <input
              type="text"
              className="p2-input"
              placeholder="12345678"
              maxLength={8}
              value={form.dni}
              onChange={(e) => setF('dni', e.target.value)}
            />
            <button
              type="button"
              className="p2-btn-buscar"
              onClick={buscarDni}
              disabled={form.dni.length !== 8 || buscandoDni}>
              <Search size={15} color="#185FA5" strokeWidth={2} />
              {buscandoDni ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Grid de campos */}
        <div className="p2-form-grid">
          <div className="p2-field">
            <label className="p2-label-field">Nombres <span className="p2-label-req">*</span></label>
            <input type="text" className="p2-input" value={form.nombres}
              onChange={(e) => setF('nombres', e.target.value)} />
          </div>

          <div className="p2-field">
            <label className="p2-label-field">Apellido paterno <span className="p2-label-req">*</span></label>
            <input type="text" className="p2-input" value={form.apellido_pat}
              onChange={(e) => setF('apellido_pat', e.target.value)} />
          </div>

          <div className="p2-field">
            <label className="p2-label-field">Apellido materno</label>
            <input type="text" className="p2-input" value={form.apellido_mat}
              onChange={(e) => setF('apellido_mat', e.target.value)} />
          </div>

          <div className="p2-field">
            <label className="p2-label-field">Teléfono</label>
            <input type="tel" className="p2-input" placeholder="987654321"
              value={form.telefono} onChange={(e) => setF('telefono', e.target.value)} />
          </div>

          <div className="p2-field p2-full">
            <label className="p2-label-field">Email <span className="p2-label-req">*</span></label>
            <input type="email" className="p2-input" value={form.email}
              onChange={(e) => setF('email', e.target.value)} />
            <span className="p2-field-hint">Recibirás notificaciones en este correo</span>
          </div>
        </div>

        <div className="p2-divider" />

        {/* Documento adjunto */}
        <p className="p2-section-label">Documentos adjuntos</p>
        <div className="p2-field" style={{ marginBottom: 8 }}>
          <label className="p2-label-field">
            Documento adjunto (PDF)
            <span className="p2-label-opt">— opcional</span>
          </label>

          {archivoPdf ? (
            <div className="p2-file-attached">
              <FileText size={18} color="#1D9E75" strokeWidth={1.8} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1D9E75', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {archivoPdf.name}
                </p>
                <p style={{ fontSize: 12, color: '#5F6478' }}>
                  {(archivoPdf.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => { setArchivoPdf(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                style={{ color: '#9CA3B0', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              className="p2-upload-zone"
              onClick={() => fileInputRef.current?.click()}>
              <div className="p2-upload-icon">
                <Upload size={20} color="#185FA5" strokeWidth={1.8} />
              </div>
              <p className="p2-upload-title">Haz clic para seleccionar un PDF</p>
              <p className="p2-upload-sub">Máximo 10MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onArchivoChange}
          />
        </div>

        <div className="p2-divider" />

        {/* Verificación Turnstile */}
        <p className="p2-section-label">Verificación de seguridad</p>
        <div className="p2-turnstile-wrap">
          <span className="p2-turnstile-label">
            Confirma que eres humano <span className="p2-label-req">*</span>
          </span>
          <Turnstile
            onToken={(token) => setTurnstileToken(token)}
            onExpire={onTurnstileExpire}
            onError={onTurnstileError}
          />
          <p className="p2-turnstile-hint">Protegido por Cloudflare Turnstile</p>
        </div>

        {/* Footer */}
        <div className="p2-footer">
          <button type="button" className="p2-btn-back" onClick={onAtras}>
            <ArrowLeft size={16} />
            Atrás
          </button>
          <button
            type="button"
            className="p2-btn-submit"
            onClick={onRegistrar}
            disabled={!turnstileToken || loading}>
            {loading ? (
              'Registrando...'
            ) : (
              <>
                <FileText size={17} color="white" strokeWidth={2} />
                Registrar trámite
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}