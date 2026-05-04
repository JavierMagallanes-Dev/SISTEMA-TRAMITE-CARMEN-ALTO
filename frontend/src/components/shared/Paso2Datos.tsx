// src/components/shared/Paso2Datos.tsx
// Paso 2 — datos personales + requisitos inline + Turnstile.
// Rediseñado: full-width, barra de progreso sticky, checklist lateral.
import '../../styles/paso2.css';

import { useRef, useState } from 'react';
import {
  ArrowLeft, FileText, Search, ChevronDown,
  Upload, X, CheckCircle, Paperclip, ArrowRight,
} from 'lucide-react';
import Turnstile from './Turnstile';

// ── Tipos ────────────────────────────────────────────────────
interface TipoTramite {
  id: number; nombre: string; descripcion: string | null;
  costo_soles: number; plazo_dias: number;
}

interface Requisito {
  id: number; nombre: string; descripcion: string | null;
  obligatorio: boolean; orden: number;
}

export interface EstadoReq {
  archivo: File | null; subido: boolean; subiendo: boolean; error: string;
}

interface Form {
  tipoDocumento: string; dni: string; nombres: string;
  apellido_pat: string; apellido_mat: string; email: string;
  telefono: string; pais_emision: string;
  fecha_vencimiento: string; fecha_nacimiento: string;
}

interface Props {
  tipoSeleccionado:  TipoTramite;
  form:              Form;
  setF:              (field: string, value: string) => void;
  buscandoDni:       boolean;
  buscarDni:         () => void;
  turnstileToken:    string;
  setTurnstileToken: (t: string) => void;
  loading:           boolean;
  onAtras:           () => void;
  onRegistrar:       () => void;
  onTurnstileExpire: () => void;
  onTurnstileError:  () => void;
  requisitos:        Requisito[];
  estadosReq:        Record<number, EstadoReq>;
  onArchivoReq:      (reqId: number, archivo: File | null) => void;
  onSubirReq:        (reqId: number) => Promise<void>;
}

// ── Constantes ───────────────────────────────────────────────
type HelpKey = 'documento' | 'nombres' | 'apellidos' | 'telefono' | 'email' | 'turnstile' | 'pais' | 'fecha' | 'requisitos' | null;

const PAISES = [
  'Perú','Argentina','Bolivia','Brasil','Chile','Colombia','Ecuador',
  'Paraguay','Uruguay','Venezuela','México','Estados Unidos','España',
  'Alemania','Francia','Italia','Reino Unido','China','Japón','Otro',
];

const DOC_CONFIG: Record<string, {
  label: string; placeholder: string; maxLength: number;
  validator: (v: string) => boolean; hint: string; puedeAutocompletar: boolean;
}> = {
  DNI: {
    label: 'Número de DNI', placeholder: '12345678', maxLength: 8,
    validator: v => /^\d{8}$/.test(v), puedeAutocompletar: true,
    hint: 'Ingresa tus 8 dígitos y pulsa Autocompletar para rellenar tus datos.',
  },
  CARNET: {
    label: 'Número de Carnet de Extranjería', placeholder: '000123456', maxLength: 12,
    validator: v => /^\d{6,12}$/.test(v), puedeAutocompletar: false,
    hint: 'Ingresa el número que aparece en tu Carnet de Extranjería.',
  },
  PASAPORTE: {
    label: 'Número de Pasaporte', placeholder: 'AB123456', maxLength: 20,
    validator: v => v.trim().length >= 6, puedeAutocompletar: false,
    hint: 'Ingresa el número alfanumérico de tu pasaporte vigente.',
  },
};

const HELP_CONTENT: Record<NonNullable<HelpKey>, { title: string; text: string; tipo: 'info' | 'warning' | 'success' }> = {
  documento:  { title: 'Documento de identidad',       tipo: 'info',    text: 'Selecciona el tipo de documento. Con DNI peruano puedes autocompletar tus datos directamente desde RENIEC.' },
  nombres:    { title: 'Nombres completos',             tipo: 'info',    text: 'Escribe tus nombres tal como aparecen en tu documento de identidad. Sin abreviaturas.' },
  apellidos:  { title: 'Apellidos',                    tipo: 'info',    text: 'Escribe tus apellidos tal como aparecen en tu documento. Ambos son obligatorios.' },
  telefono:   { title: 'Teléfono de contacto',         tipo: 'warning', text: 'Ingresa un número de celular de 9 dígitos. Te contactaremos si hay alguna novedad con tu trámite.' },
  email:      { title: 'Correo electrónico',           tipo: 'info',    text: 'Recibirás notificaciones automáticas de cada cambio de estado. Revisa también tu carpeta de spam.' },
  turnstile:  { title: 'Verificación de seguridad',    tipo: 'success', text: 'Solo haz clic en la casilla para confirmar que eres una persona real. Es rápido y gratuito.' },
  pais:       { title: 'País de emisión del pasaporte', tipo: 'info',   text: 'Selecciona el país que emitió tu pasaporte.' },
  fecha:      { title: 'Fecha del documento',          tipo: 'warning', text: 'Para Carnet: fecha de nacimiento. Para Pasaporte: fecha de vencimiento (debe estar vigente).' },
  requisitos: { title: 'Documentos del trámite',       tipo: 'warning', text: 'Adjunta cada documento en PDF. Los marcados como Obligatorio deben subirse antes de registrar.' },
};

const CheckMark = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Componente ───────────────────────────────────────────────
export default function Paso2Datos({
  tipoSeleccionado, form, setF, buscandoDni, buscarDni,
  turnstileToken, setTurnstileToken, loading,
  onAtras, onRegistrar, onTurnstileExpire, onTurnstileError,
  requisitos, estadosReq, onArchivoReq, onSubirReq,
}: Props) {
  const [activeHelp, setActiveHelp] = useState<HelpKey>('documento');
  const [touched,    setTouched]    = useState<Record<string, boolean>>({});
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const tipoDoc   = form.tipoDocumento || 'DNI';
  const docConfig = DOC_CONFIG[tipoDoc];

  const validators: Record<string, (v: string) => boolean> = {
    dni:          docConfig.validator,
    nombres:      v => v.trim().length >= 2,
    apellido_pat: v => v.trim().length >= 2,
    apellido_mat: v => v.trim().length >= 2,
    telefono:     v => /^\d{9}$/.test(v),
    email:        v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    ...(tipoDoc === 'CARNET'    && { fecha_nacimiento:  v => /^\d{4}-\d{2}-\d{2}$/.test(v) }),
    ...(tipoDoc === 'PASAPORTE' && { pais_emision: v => v.trim().length > 0, fecha_vencimiento: v => /^\d{4}-\d{2}-\d{2}$/.test(v) }),
  };

  const isValid    = (f: string) => { const fn = validators[f]; return fn ? fn(form[f as keyof Form] ?? '') : false; };
  const showCheck  = (f: string) => touched[f] && isValid(f);
  const showError  = (f: string) => touched[f] && !isValid(f);
  const handleBlur = (f: string) => setTouched(prev => ({ ...prev, [f]: true }));

  const reqObligatoriosTotal   = requisitos.filter(r => r.obligatorio).length;
  const reqObligatoriosSubidos = requisitos.filter(r => r.obligatorio && estadosReq[r.id]?.subido).length;
  const todosObligatoriosOk    = reqObligatoriosTotal === 0 || reqObligatoriosSubidos === reqObligatoriosTotal;

  // Progreso
  const camposOk    = Object.keys(validators).filter(f => isValid(f)).length;
  const totalItems  = Object.keys(validators).length + 1 + reqObligatoriosTotal;
  const completados = camposOk + (turnstileToken ? 1 : 0) + reqObligatoriosSubidos;
  const progreso    = Math.min(100, Math.round((completados / totalItems) * 100));
  const totalOk     = Object.keys(validators).every(f => isValid(f)) && !!turnstileToken && todosObligatoriosOk;

  const helpData = activeHelp ? HELP_CONTENT[activeHelp] : null;

  const handleTipoDocChange = (tipo: string) => {
    setF('tipoDocumento', tipo);
    ['dni','pais_emision','fecha_vencimiento','fecha_nacimiento'].forEach(k => setF(k, ''));
    setTouched({});
  };

  const handleArchivoChange = (reqId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Solo se aceptan archivos PDF.'); return; }
    if (file.size > 10 * 1024 * 1024)   { alert('El archivo no puede superar 10MB.'); return; }
    onArchivoReq(reqId, file);
  };

  // Checklist para el panel lateral
  const checkItems = [
    { key: 'dni',          label: 'Documento de identidad' },
    { key: 'nombres',      label: 'Nombres completos' },
    { key: 'apellido_pat', label: 'Apellido paterno' },
    { key: 'apellido_mat', label: 'Apellido materno' },
    { key: 'telefono',     label: 'Teléfono' },
    { key: 'email',        label: 'Correo electrónico' },
    ...(tipoDoc === 'CARNET'    ? [{ key: 'fecha_nacimiento',  label: 'Fecha de nacimiento' }] : []),
    ...(tipoDoc === 'PASAPORTE' ? [{ key: 'pais_emision', label: 'País de emisión' }, { key: 'fecha_vencimiento', label: 'Fecha de vencimiento' }] : []),
  ];

  return (
    <div>
      {/* ── Barra de progreso sticky ── */}
      <div className="p2-progress-sticky">
        <div className="p2-progress-sticky-inner">
          <div className="p2-progress-sticky-steps">
            <span className="p2-progress-step-done">✓ Trámite</span>
            <span className="p2-progress-step-pend">›</span>
            <span className="p2-progress-step-act">Tus datos</span>
            <span className="p2-progress-step-pend">›</span>
            <span className="p2-progress-step-pend">Pago</span>
          </div>
          <div className="p2-progress-sticky-bar">
            <div className="p2-progress-sticky-fill" style={{ width: `${progreso}%` }} />
          </div>
          <span className="p2-progress-sticky-label">{progreso}%</span>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="p2-hero">
        <div className="p2-hero-pattern" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="p2-label"><span className="p2-dot" />Portal Ciudadano — Paso 2 de 3</div>
          <h1 className="p2-title">Completa tus datos personales</h1>
          <p className="p2-sub">Todos los campos son obligatorios para registrar tu trámite.</p>
          <div className="p2-tabs">
            <div className="p2-tab done"><span className="p2-tab-num">✓</span>Seleccionar trámite</div>
            <span className="p2-tab-sep">›</span>
            <div className="p2-tab active"><span className="p2-tab-num">2</span>Tus datos</div>
            <span className="p2-tab-sep">›</span>
            <div className="p2-tab inactive"><span className="p2-tab-num">3</span>Pagar y enviar</div>
          </div>
        </div>
      </div>

      {/* ── Dos columnas ── */}
      <div className="p2-two-col">

        {/* ─ Columna formulario ─ */}
        <div className="p2-form-col p2-main">

          {/* Banner trámite */}
          <div className="p2-banner">
            <div className="p2-banner-left">
              <div className="p2-banner-icon"><FileText size={18} color="#0C447C" strokeWidth={1.8} /></div>
              <div>
                <p className="p2-banner-label">Trámite seleccionado</p>
                <p className="p2-banner-name">{tipoSeleccionado.nombre}</p>
              </div>
            </div>
            <span className="p2-banner-price">S/ {Number(tipoSeleccionado.costo_soles).toFixed(2)}</span>
          </div>

          <p className="p2-section-label">Datos del solicitante</p>

          {/* Tipo documento */}
          <div className="p2-field" style={{ marginBottom: 20 }}>
            <label className="p2-label-field">Tipo de documento <span className="p2-label-req">*</span></label>
            <div className="p2-select-wrap">
              <select className="p2-select" value={tipoDoc}
                onChange={(e) => { handleTipoDocChange(e.target.value); setActiveHelp('documento'); }}>
                <option value="DNI">DNI — Documento Nacional de Identidad</option>
                <option value="CARNET">Carnet de Extranjería</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
              <ChevronDown size={16} color="#64748b" className="p2-select-icon" />
            </div>
          </div>

          {/* Número documento */}
          <div className="p2-field" style={{ marginBottom: 20 }}>
            <label className="p2-label-field">
              {docConfig.label} <span className="p2-label-req">*</span>
              {showCheck('dni') && <span className="p2-label-check"><CheckMark /></span>}
            </label>
            {docConfig.puedeAutocompletar ? (
              <div className="p2-dni-wrap">
                <div className="p2-input-wrap">
                  <input type="text"
                    className={`p2-input ${showCheck('dni') ? 'valid' : ''} ${showError('dni') ? 'error' : ''}`}
                    placeholder={docConfig.placeholder} maxLength={docConfig.maxLength} value={form.dni}
                    onFocus={() => setActiveHelp('documento')}
                    onChange={(e) => setF('dni', e.target.value.replace(/\D/g, ''))}
                    onBlur={() => handleBlur('dni')} />
                  {showCheck('dni') && <span className="p2-check-icon"><CheckMark /></span>}
                </div>
                <button type="button" className="p2-btn-buscar" onClick={buscarDni}
                  disabled={!docConfig.validator(form.dni) || buscandoDni}>
                  <Search size={15} strokeWidth={2} />
                  {buscandoDni ? 'Buscando...' : 'Autocompletar'}
                </button>
              </div>
            ) : (
              <div className="p2-input-wrap">
                <input type="text"
                  className={`p2-input ${showCheck('dni') ? 'valid' : ''} ${showError('dni') ? 'error' : ''}`}
                  placeholder={docConfig.placeholder} maxLength={docConfig.maxLength} value={form.dni}
                  onFocus={() => setActiveHelp('documento')}
                  onChange={(e) => setF('dni', tipoDoc === 'CARNET' ? e.target.value.replace(/\D/g, '') : e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('dni')} />
                {showCheck('dni') && <span className="p2-check-icon"><CheckMark /></span>}
              </div>
            )}
            <span className="p2-field-hint">{docConfig.hint}</span>
            {showError('dni') && (
              <span className="p2-field-error">
                {tipoDoc === 'DNI' ? 'El DNI debe tener exactamente 8 dígitos'
                  : tipoDoc === 'CARNET' ? 'El carnet debe tener entre 6 y 12 dígitos'
                  : 'Ingresa un número de pasaporte válido (mínimo 6 caracteres)'}
              </span>
            )}
          </div>

          {/* Campos extra CARNET */}
          {tipoDoc === 'CARNET' && (
            <div className="p2-field" style={{ marginBottom: 20 }}>
              <label className="p2-label-field">
                Fecha de nacimiento <span className="p2-label-req">*</span>
                {showCheck('fecha_nacimiento') && <span className="p2-label-check"><CheckMark /></span>}
              </label>
              <div className="p2-input-wrap">
                <input type="date"
                  className={`p2-input ${showCheck('fecha_nacimiento') ? 'valid' : ''} ${showError('fecha_nacimiento') ? 'error' : ''}`}
                  value={form.fecha_nacimiento} onFocus={() => setActiveHelp('fecha')}
                  onChange={(e) => setF('fecha_nacimiento', e.target.value)}
                  onBlur={() => handleBlur('fecha_nacimiento')}
                  max={new Date().toISOString().split('T')[0]} />
                {showCheck('fecha_nacimiento') && <span className="p2-check-icon"><CheckMark /></span>}
              </div>
              {showError('fecha_nacimiento') && <span className="p2-field-error">Selecciona tu fecha de nacimiento</span>}
            </div>
          )}

          {/* Campos extra PASAPORTE */}
          {tipoDoc === 'PASAPORTE' && (
            <div className="p2-form-grid" style={{ marginBottom: 20 }}>
              <div className="p2-field p2-full">
                <label className="p2-label-field">
                  País de emisión <span className="p2-label-req">*</span>
                  {showCheck('pais_emision') && <span className="p2-label-check"><CheckMark /></span>}
                </label>
                <div className="p2-select-wrap">
                  <select className={`p2-select ${showCheck('pais_emision') ? 'valid' : ''} ${showError('pais_emision') ? 'error' : ''}`}
                    value={form.pais_emision} onFocus={() => setActiveHelp('pais')}
                    onChange={(e) => setF('pais_emision', e.target.value)}
                    onBlur={() => handleBlur('pais_emision')}>
                    <option value="">Selecciona el país de emisión</option>
                    {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={16} color="#64748b" className="p2-select-icon" />
                </div>
                {showError('pais_emision') && <span className="p2-field-error">Selecciona el país de emisión</span>}
              </div>
              <div className="p2-field p2-full">
                <label className="p2-label-field">
                  Fecha de vencimiento <span className="p2-label-req">*</span>
                  {showCheck('fecha_vencimiento') && <span className="p2-label-check"><CheckMark /></span>}
                </label>
                <div className="p2-input-wrap">
                  <input type="date"
                    className={`p2-input ${showCheck('fecha_vencimiento') ? 'valid' : ''} ${showError('fecha_vencimiento') ? 'error' : ''}`}
                    value={form.fecha_vencimiento} onFocus={() => setActiveHelp('fecha')}
                    onChange={(e) => setF('fecha_vencimiento', e.target.value)}
                    onBlur={() => handleBlur('fecha_vencimiento')}
                    min={new Date().toISOString().split('T')[0]} />
                  {showCheck('fecha_vencimiento') && <span className="p2-check-icon"><CheckMark /></span>}
                </div>
                <span className="p2-field-hint">El pasaporte debe estar vigente</span>
                {showError('fecha_vencimiento') && <span className="p2-field-error">Selecciona la fecha de vencimiento</span>}
              </div>
            </div>
          )}

          {tipoDoc !== 'DNI' && (
            <div className="p2-doc-notice">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {tipoDoc === 'CARNET' ? 'Con Carnet de Extranjería debes completar tus datos manualmente.' : 'Con Pasaporte debes completar tus datos manualmente.'}
            </div>
          )}

          {/* Grid campos personales */}
          <div className="p2-form-grid">
            {[
              { key: 'nombres',      label: 'Nombres',          placeholder: 'Tus nombres',     help: 'nombres'   as HelpKey },
              { key: 'apellido_pat', label: 'Apellido paterno', placeholder: 'Apellido paterno', help: 'apellidos' as HelpKey },
              { key: 'apellido_mat', label: 'Apellido materno', placeholder: 'Apellido materno', help: 'apellidos' as HelpKey },
              { key: 'telefono',     label: 'Teléfono',         placeholder: '987654321',        help: 'telefono'  as HelpKey },
            ].map(({ key, label, placeholder, help }) => (
              <div className="p2-field" key={key}>
                <label className="p2-label-field">
                  {label} <span className="p2-label-req">*</span>
                  {showCheck(key) && <span className="p2-label-check"><CheckMark /></span>}
                </label>
                <div className="p2-input-wrap">
                  <input
                    type={key === 'telefono' ? 'tel' : 'text'}
                    className={`p2-input ${showCheck(key) ? 'valid' : ''} ${showError(key) ? 'error' : ''}`}
                    placeholder={placeholder} value={form[key as keyof Form]}
                    onFocus={() => setActiveHelp(help)}
                    onChange={(e) => setF(key, key === 'telefono' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                    onBlur={() => handleBlur(key)} />
                  {showCheck(key) && <span className="p2-check-icon"><CheckMark /></span>}
                </div>
                {showError(key) && (
                  <span className="p2-field-error">
                    {key === 'telefono' ? 'Ingresa un teléfono de 9 dígitos' : `Ingresa tu ${label.toLowerCase()}`}
                  </span>
                )}
              </div>
            ))}
            <div className="p2-field p2-full">
              <label className="p2-label-field">
                Correo electrónico <span className="p2-label-req">*</span>
                {showCheck('email') && <span className="p2-label-check"><CheckMark /></span>}
              </label>
              <div className="p2-input-wrap">
                <input type="email"
                  className={`p2-input ${showCheck('email') ? 'valid' : ''} ${showError('email') ? 'error' : ''}`}
                  placeholder="ejemplo@correo.com" value={form.email}
                  onFocus={() => setActiveHelp('email')}
                  onChange={(e) => setF('email', e.target.value)}
                  onBlur={() => handleBlur('email')} />
                {showCheck('email') && <span className="p2-check-icon"><CheckMark /></span>}
              </div>
              {showError('email')
                ? <span className="p2-field-error">Ingresa un correo electrónico válido</span>
                : <span className="p2-field-hint">Recibirás notificaciones de tu trámite en este correo</span>}
            </div>
          </div>

          {/* ── Requisitos ── */}
          {requisitos.length > 0 && (
            <>
              <div className="p2-divider" />
              <p className="p2-section-label" onClick={() => setActiveHelp('requisitos')} style={{ cursor: 'pointer' }}>
                Documentos requeridos
                <span style={{ marginLeft: 6, fontSize: 12, color: '#64748b', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  {reqObligatoriosSubidos}/{reqObligatoriosTotal} obligatorios adjuntados
                </span>
              </p>
              <div className="p2-req-uploads">
                {requisitos.map((req, idx) => {
                  const estado = estadosReq[req.id] ?? { archivo: null, subido: false, subiendo: false, error: '' };
                  return (
                    <div key={req.id} className={`p2-req-item${estado.subido ? ' done' : ''}`}>
                      <div className="p2-req-item-header">
                        <span className={`p2-req-item-num${estado.subido ? ' done' : ''}`}>
                          {estado.subido ? <CheckCircle size={14} color="white" /> : idx + 1}
                        </span>
                        <div className="p2-req-item-info">
                          <div className="p2-req-item-top">
                            <span className="p2-req-item-nombre">{req.nombre}</span>
                            <span className={`p2-req-badge ${req.obligatorio ? 'oblig' : 'opc'}`}>
                              {req.obligatorio ? 'Obligatorio' : 'Opcional'}
                            </span>
                          </div>
                          {req.descripcion && <p className="p2-req-item-desc">{req.descripcion}</p>}
                        </div>
                      </div>
                      <div className="p2-req-item-body">
                        {estado.subido ? (
                          <div className="p2-req-subido">
                            <CheckCircle size={15} color="#16a34a" />
                            <span>Documento adjuntado correctamente</span>
                          </div>
                        ) : estado.archivo ? (
                          <div className="p2-req-archivo-sel">
                            <div className="p2-req-archivo-info">
                              <Paperclip size={13} color="#1e40af" />
                              <span className="p2-req-archivo-nombre">{estado.archivo.name}</span>
                              <span className="p2-req-archivo-size">{(estado.archivo.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <div className="p2-req-archivo-actions">
                              <button type="button" className="p2-req-btn-subir" disabled={estado.subiendo} onClick={() => onSubirReq(req.id)}>
                                {estado.subiendo ? <span className="p2-req-spinner" /> : <Upload size={12} />}
                                {estado.subiendo ? 'Subiendo...' : 'Subir'}
                              </button>
                              <button type="button" className="p2-req-btn-quitar"
                                onClick={() => { onArchivoReq(req.id, null); if (fileRefs.current[req.id]) fileRefs.current[req.id]!.value = ''; }}>
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p2-req-upload-zone" onClick={() => fileRefs.current[req.id]?.click()}>
                            <Upload size={16} color="#94a3b8" />
                            <span className="p2-req-upload-text">Haz clic para seleccionar un PDF</span>
                            <span className="p2-req-upload-sub">Máximo 10MB</span>
                          </div>
                        )}
                        {estado.error && <p className="p2-req-error">{estado.error}</p>}
                      </div>
                      <input
                        ref={el => { fileRefs.current[req.id] = el; }}
                        type="file" accept="application/pdf" style={{ display: 'none' }}
                        onChange={(e) => handleArchivoChange(req.id, e)} />
                    </div>
                  );
                })}
              </div>
              {!todosObligatoriosOk && (
                <div className="p2-req-aviso">
                  ⚠ Faltan {reqObligatoriosTotal - reqObligatoriosSubidos} documento(s) obligatorio(s) por adjuntar.
                </div>
              )}
            </>
          )}

          <div className="p2-divider" />

          {/* Turnstile */}
          <p className="p2-section-label">Verificación de seguridad</p>
          <div className="p2-turnstile-wrap" onClick={() => setActiveHelp('turnstile')}>
            <Turnstile onToken={setTurnstileToken} onExpire={onTurnstileExpire} onError={onTurnstileError} />
          </div>

          {/* Footer */}
          <div className="p2-footer">
            <button type="button" className="p2-btn-back" onClick={onAtras}>
              <ArrowLeft size={16} />Atrás
            </button>
            <button type="button" className="p2-btn-submit"
              onClick={onRegistrar} disabled={!totalOk || loading}>
              {loading ? 'Registrando...' : (<>Registrar trámite <ArrowRight size={15} /></>)}
            </button>
          </div>
        </div>

        {/* ─ Columna ayuda ─ */}
        <div className="p2-help-col">
          {/* Progreso */}
          <div className="p2-progress">
            <div className="p2-progress-header">
              <span className="p2-progress-label">Progreso</span>
              <span className="p2-progress-count">{progreso}%</span>
            </div>
            <div className="p2-progress-bar">
              <div className="p2-progress-fill" style={{ width: `${progreso}%` }} />
            </div>
          </div>

          {/* Chips */}
          <div className="p2-info-chips">
            <div className="p2-info-chip"><span className="p2-chip-val">{tipoSeleccionado.plazo_dias}d</span><span className="p2-chip-label">plazo</span></div>
            <div className="p2-info-chip"><span className="p2-chip-val">S/{Number(tipoSeleccionado.costo_soles).toFixed(0)}</span><span className="p2-chip-label">costo</span></div>
            <div className="p2-info-chip"><span className="p2-chip-val">~3m</span><span className="p2-chip-label">tiempo</span></div>
          </div>

          {/* Ayuda contextual */}
          {helpData && (
            <div className={`p2-help-card p2-help-${helpData.tipo}`}>
              <p className="p2-help-card-title">{helpData.title}</p>
              <p className="p2-help-card-text">{helpData.text}</p>
            </div>
          )}

          {/* Checklist de validación */}
          <div className="p2-checklist">
            <p className="p2-checklist-title">Lista de verificación</p>
            {checkItems.map(({ key, label }) => (
              <div key={key} className={`p2-check-item ${isValid(key) ? 'ok' : 'pending'}`}>
                <div className="p2-check-dot">
                  {isValid(key) && <CheckMark />}
                </div>
                <span>{label}</span>
              </div>
            ))}
            <div className={`p2-check-item ${turnstileToken ? 'ok' : 'pending'}`}>
              <div className="p2-check-dot">{turnstileToken && <CheckMark />}</div>
              <span>Verificación de seguridad</span>
            </div>
            {requisitos.filter(r => r.obligatorio).map(req => (
              <div key={req.id} className={`p2-check-item ${estadosReq[req.id]?.subido ? 'ok' : 'pending'}`}>
                <div className="p2-check-dot">{estadosReq[req.id]?.subido && <CheckMark />}</div>
                <span>{req.nombre}</span>
              </div>
            ))}
          </div>

          {/* Contacto */}
          <div className="p2-help-contact">
            <p className="p2-help-contact-title">¿Necesitas ayuda?</p>
            <p className="p2-help-contact-text">
              Mesa de Partes:<br />
              <a href="tel:066123456" className="p2-help-contact-tel">(066) 123-456</a><br />
              L–V de 8:00 a 16:30
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}