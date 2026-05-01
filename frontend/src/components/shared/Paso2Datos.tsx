import '../../styles/paso2.css';
import { useRef, useState } from 'react';
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

type HelpKey = 'dni' | 'nombres' | 'apellidos' | 'telefono' | 'email' | 'pdf' | 'turnstile' | null;

const HELP_CONTENT: Record<NonNullable<HelpKey>, { title: string; text: string; tipo: 'info' | 'warning' | 'success' }> = {
  dni: {
    title: 'DNI — autocompletado disponible',
    text: 'Ingresa tu DNI de 8 dígitos y haz clic en Buscar. El sistema consultará RENIEC y llenará automáticamente tus nombres y apellidos.',
    tipo: 'info',
  },
  nombres: {
    title: 'Nombres completos',
    text: 'Si ya buscaste por DNI, este campo se completó automáticamente. Si no, escribe tus nombres tal como aparecen en tu documento de identidad.',
    tipo: 'info',
  },
  apellidos: {
    title: 'Apellidos',
    text: 'Escribe tus apellidos tal como aparecen en tu DNI. Ambos apellidos son obligatorios para identificarte correctamente en el sistema.',
    tipo: 'info',
  },
  telefono: {
    title: 'Teléfono de contacto',
    text: 'Ingresa un número de celular con 9 dígitos. Te contactaremos a este número si surge alguna consulta sobre tu trámite.',
    tipo: 'warning',
  },
  email: {
    title: 'Correo electrónico',
    text: 'Recibirás notificaciones automáticas sobre el estado de tu trámite en este correo. Asegúrate de escribirlo correctamente y revisa también tu carpeta de spam.',
    tipo: 'info',
  },
  pdf: {
    title: 'Documento adjunto — PDF obligatorio',
    text: 'Adjunta el documento de solicitud en formato PDF. Este archivo es parte de tu expediente oficial. Máximo 10MB.',
    tipo: 'warning',
  },
  turnstile: {
    title: 'Verificación de seguridad',
    text: 'Esta verificación confirma que eres una persona real y protege el sistema contra registros automáticos. Solo haz clic en la casilla — es rápido y no requiere resolver ningún acertijo.',
    tipo: 'success',
  },
};

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function Paso2Datos({
  tipoSeleccionado, form, setF, buscandoDni, buscarDni,
  archivoPdf, setArchivoPdf, turnstileToken, setTurnstileToken,
  loading, onAtras, onRegistrar, onArchivoChange,
  onTurnstileExpire, onTurnstileError,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeHelp, setActiveHelp] = useState<HelpKey>('dni');
  const [touched, setTouched]       = useState<Record<string, boolean>>({});

  const validators: Record<string, (v: string) => boolean> = {
    dni:          v => /^\d{8}$/.test(v),
    nombres:      v => v.trim().length >= 2,
    apellido_pat: v => v.trim().length >= 2,
    apellido_mat: v => v.trim().length >= 2,
    telefono:     v => /^\d{9}$/.test(v),
    email:        v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  };

  const isValid = (field: string) => {
    const fn = validators[field];
    return fn ? fn(form[field as keyof Form] ?? '') : false;
  };

  const showCheck = (field: string) => touched[field] && isValid(field);
  const showError = (field: string) => touched[field] && !isValid(field);

  const handleBlur = (field: string) =>
    setTouched(prev => ({ ...prev, [field]: true }));

  const camposTextoOk = Object.keys(validators).every(f => isValid(f));
  const totalOk       = camposTextoOk && !!archivoPdf && !!turnstileToken;

  const completados = [
    ...Object.keys(validators).filter(f => isValid(f)),
    archivoPdf    ? 'pdf'       : null,
    turnstileToken ? 'turnstile' : null,
  ].filter(Boolean).length;
  const totalCampos = Object.keys(validators).length + 2;
  const progreso    = Math.round((completados / totalCampos) * 100);

  const helpData = activeHelp ? HELP_CONTENT[activeHelp] : null;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="p2-hero">
        <div className="p2-label">
          <span className="p2-dot" />
          Portal Ciudadano — Paso 2 de 3
        </div>
        <h1 className="p2-title">Completa tus datos personales</h1>
        <p className="p2-sub">
          Todos los campos son obligatorios para registrar tu trámite.
        </p>
        <div className="p2-tabs">
          <div className="p2-tab done"><span className="p2-tab-num">✓</span>Seleccionar trámite</div>
          <span className="p2-tab-sep">›</span>
          <div className="p2-tab active"><span className="p2-tab-num">2</span>Tus datos</div>
          <span className="p2-tab-sep">›</span>
          <div className="p2-tab inactive"><span className="p2-tab-num">3</span>Pagar y enviar</div>
        </div>
      </div>

      {/* ── Layout dos columnas ──────────────────────────── */}
      <div className="p2-two-col">

        {/* ── Columna izquierda: formulario ─────────────── */}
        <div className="p2-main p2-form-col">

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

          <p className="p2-section-label">Datos del solicitante</p>

          {/* DNI */}
          <div className="p2-field" style={{ marginBottom: 20 }}>
            <label className="p2-label-field">
              DNI <span className="p2-label-req">*</span>
              {showCheck('dni') && <span className="p2-label-check"><CheckIcon /></span>}
            </label>
            <div className="p2-dni-wrap">
              <div className="p2-input-wrap">
                <input
                  type="text"
                  className={`p2-input ${showCheck('dni') ? 'valid' : ''} ${showError('dni') ? 'error' : ''}`}
                  placeholder="12345678"
                  maxLength={8}
                  value={form.dni}
                  onFocus={() => setActiveHelp('dni')}
                  onChange={(e) => setF('dni', e.target.value)}
                  onBlur={() => handleBlur('dni')}
                />
                {showCheck('dni') && <span className="p2-check-icon"><CheckIcon /></span>}
              </div>
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

          {/* Grid campos */}
          <div className="p2-form-grid">
            <div className="p2-field">
              <label className="p2-label-field">Nombres <span className="p2-label-req">*</span></label>
              <input
                type="text"
                className={`p2-input ${showCheck('nombres') ? 'valid' : ''}`}
                value={form.nombres}
                onFocus={() => setActiveHelp('nombres')}
                onChange={(e) => setF('nombres', e.target.value)}
                onBlur={() => handleBlur('nombres')}
              />
            </div>

            <div className="p2-field">
              <label className="p2-label-field">Apellido paterno <span className="p2-label-req">*</span></label>
              <input
                type="text"
                className={`p2-input ${showCheck('apellido_pat') ? 'valid' : ''}`}
                value={form.apellido_pat}
                onFocus={() => setActiveHelp('apellidos')}
                onChange={(e) => setF('apellido_pat', e.target.value)}
                onBlur={() => handleBlur('apellido_pat')}
              />
            </div>

            <div className="p2-field">
              <label className="p2-label-field">Apellido materno <span className="p2-label-req">*</span></label>
              <input
                type="text"
                className={`p2-input ${showCheck('apellido_mat') ? 'valid' : ''}`}
                value={form.apellido_mat}
                onFocus={() => setActiveHelp('apellidos')}
                onChange={(e) => setF('apellido_mat', e.target.value)}
                onBlur={() => handleBlur('apellido_mat')}
              />
            </div>

            <div className="p2-field">
              <label className="p2-label-field">Teléfono <span className="p2-label-req">*</span></label>
              <input
                type="tel"
                className={`p2-input ${showCheck('telefono') ? 'valid' : ''}`}
                placeholder="987654321"
                value={form.telefono}
                onFocus={() => setActiveHelp('telefono')}
                onChange={(e) => setF('telefono', e.target.value)}
                onBlur={() => handleBlur('telefono')}
              />
            </div>

            <div className="p2-field p2-full">
              <label className="p2-label-field">Email <span className="p2-label-req">*</span></label>
              <input
                type="email"
                className={`p2-input ${showCheck('email') ? 'valid' : ''}`}
                placeholder="ejemplo@correo.com"
                value={form.email}
                onFocus={() => setActiveHelp('email')}
                onChange={(e) => setF('email', e.target.value)}
                onBlur={() => handleBlur('email')}
              />
            </div>
          </div>

          <div className="p2-divider" />

          {/* PDF adjunto */}
          <p className="p2-section-label">Documento adjunto</p>
          <div className="p2-field">
            {archivoPdf ? (
              <div className="p2-file-attached">
                <FileText size={18} color="#1D9E75" strokeWidth={1.8} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1D9E75' }}>{archivoPdf.name}</p>
                </div>
                <button onClick={() => { setArchivoPdf(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="p2-upload-zone" onClick={() => { setActiveHelp('pdf'); fileInputRef.current?.click(); }}>
                <div className="p2-upload-icon"><Upload size={20} color="#185FA5" /></div>
                <p className="p2-upload-title">Haz clic para seleccionar un PDF</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={onArchivoChange} />
          </div>

          <div className="p2-divider" />

          {/* Turnstile */}
          <p className="p2-section-label">Verificación de seguridad</p>
          <div className="p2-turnstile-wrap" onClick={() => setActiveHelp('turnstile')}>
            <Turnstile onToken={setTurnstileToken} onExpire={onTurnstileExpire} onError={onTurnstileError} />
          </div>

          {/* Footer */}
          <div className="p2-footer">
            <button type="button" className="p2-btn-back" onClick={onAtras}><ArrowLeft size={16} /> Atrás</button>
            <button type="button" className="p2-btn-submit" onClick={onRegistrar} disabled={!totalOk || loading}>
              {loading ? 'Registrando...' : 'Registrar trámite'}
            </button>
          </div>
        </div>

        {/* ── Columna derecha: panel de ayuda (Sticky) ─────────── */}
        <div className="p2-help-col">
          <div className="p2-progress">
            <div className="p2-progress-header">
              <span className="p2-progress-label">Progreso</span>
              <span className="p2-progress-count">{progreso}%</span>
            </div>
            <div className="p2-progress-bar"><div className="p2-progress-fill" style={{ width: `${progreso}%` }} /></div>
          </div>

          <div className="p2-info-chips">
            <div className="p2-info-chip"><span className="p2-chip-val">{tipoSeleccionado.plazo_dias}</span><span className="p2-chip-label">días</span></div>
            <div className="p2-info-chip"><span className="p2-chip-val">S/ {tipoSeleccionado.costo_soles}</span><span className="p2-chip-label">costo</span></div>
            <div className="p2-info-chip"><span className="p2-chip-val">~3 min</span><span className="p2-chip-label">tiempo</span></div>
          </div>

          {helpData && (
            <div className={`p2-help-card p2-help-${helpData.tipo}`}>
              <p className="p2-help-card-title">{helpData.title}</p>
              <p className="p2-help-card-text">{helpData.text}</p>
            </div>
          )}

          <div className="p2-help-reqs">
            <p className="p2-help-reqs-title">Requisitos</p>
            <ul className="p2-req-list">
              <li><span className="p2-req-dot" /> DNI vigente</li>
              <li><span className="p2-req-dot" /> Solicitud en PDF</li>
            </ul>
          </div>

          <div className="p2-help-contact">
            <p className="p2-help-contact-title">¿Ayuda?</p>
            <p className="p2-help-contact-text">(066) 123-456</p>
          </div>
        </div>
      </div>
    </div>
  );
}