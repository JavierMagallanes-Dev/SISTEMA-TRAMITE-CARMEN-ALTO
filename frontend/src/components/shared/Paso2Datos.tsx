// src/pages/portal/Paso2Datos.tsx
// Paso 2 — Datos del solicitante · Carmen Alto
// Solo presentación. Toda la lógica/handlers/estado vive en PortalPage.tsx
// y se pasa por props. NO se tocan llamadas al backend ni servicios.

import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import {
  IdCard, User, Phone, Mail, FileText, Shield, Search,
  Upload, ArrowLeft, ArrowRight, AlertTriangle, Check,
  Plane, Globe, FileCheck2,
} from 'lucide-react';
import './paso2.css';

// ── Tipos compartidos con tu PortalPage ─────────────────────────────
export interface TipoTramite {
  id:          number;
  nombre:      string;
  descripcion: string | null;
  costo_soles: number;
  plazo_dias:  number;
}

export interface FormDatos {
  dni:           string;
  nombres:       string;
  apellido_pat:  string;
  apellido_mat:  string;
  email:         string;
  telefono:      string;
}

export type TipoDocumento = 'DNI' | 'CARNET' | 'PASAPORTE';

// Estructura de cada requisito del trámite (lo que ya manejas en PortalPage)
export interface RequisitoArchivo {
  id:             string | number;
  nombre:         string;
  descripcion:    string | null;
  obligatorio:    boolean;
  archivo:        File | null;       // archivo seleccionado por el ciudadano
  subido:         boolean;           // si ya está confirmado en el servidor
  subiendo?:      boolean;
}

// ── Props ───────────────────────────────────────────────────────────
export interface Paso2DatosProps {
  // Trámite seleccionado en Paso 1
  tipoSeleccionado: TipoTramite;

  // Tipo de documento (DNI/CARNET/PASAPORTE)
  tipoDocumento:    TipoDocumento;
  onTipoDocumento:  (t: TipoDocumento) => void;

  // Formulario
  form:             FormDatos;
  onChangeForm:     (field: keyof FormDatos, value: string) => void;

  // RENIEC
  buscandoDni:      boolean;
  onBuscarDni:      () => void;

  // Requisitos
  requisitos:       RequisitoArchivo[];
  onSeleccionarArchivo: (reqId: RequisitoArchivo['id'], file: File | null) => void;
  onSubirArchivo:       (reqId: RequisitoArchivo['id']) => void;

  // Turnstile / captcha
  captchaOk:        boolean;
  onCaptchaToggle:  () => void;

  // Acciones
  onAtras:          () => void;
  onSubmit:         () => void;
  loadingSubmit:    boolean;

  // Estado registro (overlay)
  registrando?:     boolean;
  pasoRegistro?:    1 | 2 | 3 | 4;     // 1: identidad, 2: expediente, 3: docs, 4: email
}

// ── Helpers ─────────────────────────────────────────────────────────
const inputClass = (value: string, error?: boolean): string => {
  if (error)                  return 'p2-input p2-input--error';
  if (value && value.trim())  return 'p2-input p2-input--valid';
  return 'p2-input';
};

// ── Componente ──────────────────────────────────────────────────────
export default function Paso2Datos({
  tipoSeleccionado,
  tipoDocumento, onTipoDocumento,
  form, onChangeForm,
  buscandoDni, onBuscarDni,
  requisitos,
  onSeleccionarArchivo, onSubirArchivo,
  captchaOk, onCaptchaToggle,
  onAtras, onSubmit, loadingSubmit,
  registrando = false, pasoRegistro = 1,
}: Paso2DatosProps) {

  // Refs para inputs de archivo
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Cálculos de UI ──────────────────────────────────────────────
  const camposObligatorios: Array<keyof FormDatos> = [
    'dni', 'nombres', 'apellido_pat', 'apellido_mat', 'telefono', 'email',
  ];
  const validados = camposObligatorios.filter((k) => form[k]?.trim().length > 0);

  const reqObligatorios       = requisitos.filter((r) => r.obligatorio);
  const reqObligatoriosSubidos = reqObligatorios.filter((r) => r.subido).length;
  const reqObligatoriosPend    = reqObligatorios.length - reqObligatoriosSubidos;

  // Progreso total (campos + captcha + requisitos obligatorios subidos)
  const totalChecks   = camposObligatorios.length + 1 /* captcha */ + reqObligatorios.length;
  const okChecks      = validados.length + (captchaOk ? 1 : 0) + reqObligatoriosSubidos;
  const progresoPct   = Math.round((okChecks / totalChecks) * 100);

  // SVG ring para progreso lateral
  const ringDash       = 94.2;
  const ringOffset     = ringDash * (1 - progresoPct / 100);

  // Bloqueo de submit
  const submitDisabled =
    loadingSubmit ||
    validados.length < camposObligatorios.length ||
    reqObligatoriosPend > 0 ||
    !captchaOk;

  // ── Handlers internos ───────────────────────────────────────────
  const onFileChange = (reqId: RequisitoArchivo['id']) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onSeleccionarArchivo(reqId, file);
  };

  return (
    <div className="p2">

      {/* ════════ Top progress sticky ════════ */}
      <div className="p2-sticky">
        <div className="p2-sticky-inner">
          <div className="p2-sticky-bcr">
            <span className="p2-sticky-bcr-done">
              <Check size={14} strokeWidth={2.5} />
              Trámite
            </span>
            <span style={{ color: '#cbd5e1' }}>›</span>
            <span className="p2-sticky-bcr-curr">Tus datos</span>
            <span style={{ color: '#cbd5e1' }}>›</span>
            <span>Pagar y enviar</span>
          </div>
          <div className="p2-bar">
            <div className="p2-bar-fill" style={{ width: `${progresoPct}%` }} />
          </div>
          <span className="p2-bar-pct">{progresoPct}%</span>
        </div>
      </div>

      {/* ════════ Hero ════════ */}
      <section className="p2-hero">
        <div className="p2-hero-inner">
          <div className="p2-hero-meta">
            <span className="p2-hero-tag">
              <span className="p2-pulse" />
              Portal Ciudadano · Paso 2 de 3
            </span>
            <h1 className="p2-hero-title">Completa tus datos personales</h1>
            <p className="p2-hero-sub">
              Verificamos tu identidad para registrar tu trámite. Todos los campos son obligatorios.
            </p>
          </div>

          <div className="p2-steps">
            <div className="p2-step p2-step--done">
              <span className="p2-step-num"><Check size={10} strokeWidth={3.5} /></span>
              Seleccionar trámite
            </div>
            <span className="p2-steps-sep">›</span>
            <div className="p2-step p2-step--active">
              <span className="p2-step-num">2</span>
              Tus datos
            </div>
            <span className="p2-steps-sep">›</span>
            <div className="p2-step p2-step--idle">
              <span className="p2-step-num">3</span>
              Pagar y enviar
            </div>
          </div>
        </div>
      </section>

      {/* ════════ Main ════════ */}
      <div className="p2-wrap">
        <div className="p2-layout">

          {/* ─── Columna formulario ─── */}
          <main className="p2-form">

            {/* Banner trámite */}
            <div className="p2-banner">
              <div className="p2-banner-info">
                <div className="p2-banner-icon">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="p2-banner-eyebrow">Trámite seleccionado</p>
                  <p className="p2-banner-title">{tipoSeleccionado.nombre}</p>
                  <p className="p2-banner-meta">
                    ⏱ {tipoSeleccionado.plazo_dias} días hábiles · Mesa de Partes
                  </p>
                </div>
              </div>
              <span className="p2-banner-price">
                S/ {Number(tipoSeleccionado.costo_soles).toFixed(2)}
              </span>
            </div>

            {/* ── Tipo de documento ── */}
            <p className="p2-section-label">
              <span className="p2-section-label-icon"><IdCard size={13} /></span>
              Documento de identidad
            </p>

            <div className="p2-doc-tabs" role="tablist">
              {([
                { value: 'DNI',       label: 'DNI',       sub: 'Peruano',       Icon: IdCard },
                { value: 'CARNET',    label: 'Carnet',    sub: 'Extranjería',    Icon: Globe },
                { value: 'PASAPORTE', label: 'Pasaporte', sub: 'Internacional', Icon: Plane },
              ] as const).map(({ value, label, sub, Icon }) => {
                const active = tipoDocumento === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`p2-doc-tab ${active ? 'p2-doc-tab--active' : ''}`}
                    onClick={() => onTipoDocumento(value)}
                  >
                    <div className="p2-doc-tab-icon">
                      <Icon size={15} />
                    </div>
                    <div className="p2-doc-tab-text">
                      <span className="p2-doc-tab-name">{label}</span>
                      <span className="p2-doc-tab-sub">{sub}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Número documento */}
            <div className="p2-field">
              <label className="p2-field-label">
                Número de {tipoDocumento === 'DNI' ? 'DNI' : tipoDocumento === 'CARNET' ? 'Carnet' : 'Pasaporte'}
                <span className="p2-field-req">*</span>
              </label>
              <div className="p2-dni-row">
                <div className="p2-field-input-wrap">
                  <span className="p2-field-prefix"><IdCard size={16} /></span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`${inputClass(form.dni)} p2-mono`}
                    placeholder={tipoDocumento === 'DNI' ? '12345678' : 'Número de documento'}
                    maxLength={tipoDocumento === 'DNI' ? 8 : 12}
                    value={form.dni}
                    onChange={(e) => onChangeForm('dni', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="p2-btn-search"
                  disabled={form.dni.length !== 8 || buscandoDni}
                  onClick={onBuscarDni}
                >
                  {buscandoDni ? (
                    <>
                      <span className="p2-spin" style={{ borderTopColor: '#216ece', borderColor: 'rgba(33,110,206,.3)' }} />
                      Buscando…
                    </>
                  ) : (
                    <>
                      <Search size={14} />
                      Autocompletar
                    </>
                  )}
                </button>
              </div>
              <span className="p2-field-hint">
                {tipoDocumento === 'DNI'
                  ? 'Ingresa tus 8 dígitos y pulsa Autocompletar para rellenar tus datos desde RENIEC.'
                  : 'Ingresa tu número de documento.'}
              </span>
            </div>

            {/* ── Datos personales ── */}
            <div className="p2-divider" />

            <p className="p2-section-label">
              <span className="p2-section-label-icon"><User size={13} /></span>
              Datos del solicitante
            </p>

            <div className="p2-field-grid">
              <div className="p2-field">
                <label className="p2-field-label">
                  Nombres <span className="p2-field-req">*</span>
                </label>
                <div className="p2-field-input-wrap">
                  <input
                    type="text"
                    className={`${inputClass(form.nombres)} p2-input--no-prefix`}
                    placeholder="Tus nombres"
                    value={form.nombres}
                    onChange={(e) => onChangeForm('nombres', e.target.value)}
                  />
                </div>
              </div>

              <div className="p2-field">
                <label className="p2-field-label">
                  Apellido paterno <span className="p2-field-req">*</span>
                </label>
                <div className="p2-field-input-wrap">
                  <input
                    type="text"
                    className={`${inputClass(form.apellido_pat)} p2-input--no-prefix`}
                    placeholder="Apellido paterno"
                    value={form.apellido_pat}
                    onChange={(e) => onChangeForm('apellido_pat', e.target.value)}
                  />
                </div>
              </div>

              <div className="p2-field">
                <label className="p2-field-label">
                  Apellido materno <span className="p2-field-req">*</span>
                </label>
                <div className="p2-field-input-wrap">
                  <input
                    type="text"
                    className={`${inputClass(form.apellido_mat)} p2-input--no-prefix`}
                    placeholder="Apellido materno"
                    value={form.apellido_mat}
                    onChange={(e) => onChangeForm('apellido_mat', e.target.value)}
                  />
                </div>
              </div>

              <div className="p2-field">
                <label className="p2-field-label">
                  Teléfono <span className="p2-field-req">*</span>
                </label>
                <div className="p2-field-input-wrap">
                  <span className="p2-field-prefix"><Phone size={16} /></span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className={`${inputClass(form.telefono)} p2-mono`}
                    placeholder="987654321"
                    maxLength={9}
                    value={form.telefono}
                    onChange={(e) => onChangeForm('telefono', e.target.value)}
                  />
                </div>
              </div>

              <div className="p2-field p2-field-grid-full">
                <label className="p2-field-label">
                  Correo electrónico <span className="p2-field-req">*</span>
                </label>
                <div className="p2-field-input-wrap">
                  <span className="p2-field-prefix"><Mail size={16} /></span>
                  <input
                    type="email"
                    className={inputClass(form.email)}
                    placeholder="ejemplo@correo.com"
                    value={form.email}
                    onChange={(e) => onChangeForm('email', e.target.value)}
                  />
                </div>
                <span className="p2-field-hint">
                  📧 Recibirás notificaciones de tu trámite en este correo
                </span>
              </div>
            </div>

            {/* ── Documentos requeridos ── */}
            <div className="p2-divider" />

            <p className="p2-section-label">
              <span className="p2-section-label-icon"><FileText size={13} /></span>
              Documentos requeridos
              <span className="p2-section-label-counter">
                {reqObligatoriosSubidos}/{reqObligatorios.length} obligatorios
              </span>
            </p>

            <div className="p2-req-list">
              {requisitos.map((req, idx) => {
                const refKey = String(req.id);
                return (
                  <div key={req.id} className={`p2-req ${req.subido ? 'p2-req--done' : ''}`}>
                    <div className="p2-req-head">
                      <span className={`p2-req-num ${req.subido ? 'p2-req-num--done' : ''}`}>
                        {req.subido
                          ? <Check size={14} strokeWidth={3} />
                          : idx + 1}
                      </span>
                      <div className="p2-req-info">
                        <p className="p2-req-name">
                          {req.nombre}
                          <span
                            className={`p2-req-badge ${req.obligatorio ? 'p2-req-badge--req' : 'p2-req-badge--opt'}`}
                          >
                            {req.obligatorio ? 'Obligatorio' : 'Opcional'}
                          </span>
                        </p>
                        {req.descripcion && (
                          <p className="p2-req-desc">{req.descripcion}</p>
                        )}
                      </div>
                    </div>

                    <div className="p2-req-body">
                      {req.subido ? (
                        <div className="p2-file-done">
                          <FileCheck2 size={16} strokeWidth={2.5} />
                          <span>Documento adjuntado correctamente</span>
                        </div>
                      ) : req.archivo ? (
                        <div className="p2-file">
                          <div className="p2-file-info">
                            <div className="p2-file-icon">
                              <FileText size={14} />
                            </div>
                            <div className="p2-file-meta">
                              <div className="p2-file-name" title={req.archivo.name}>
                                {req.archivo.name}
                              </div>
                              <div className="p2-file-size">
                                {(req.archivo.size / 1024).toFixed(0)} KB · listo para subir
                              </div>
                            </div>
                          </div>
                          <div className="p2-file-actions">
                            <button
                              type="button"
                              className="p2-btn-upload"
                              disabled={req.subiendo}
                              onClick={() => onSubirArchivo(req.id)}
                            >
                              {req.subiendo ? (
                                <>
                                  <span className="p2-spin" />
                                  Subiendo
                                </>
                              ) : (
                                <>
                                  <Upload size={12} strokeWidth={2.5} />
                                  Subir
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="p2-btn-x"
                              aria-label="Quitar archivo"
                              onClick={() => onSeleccionarArchivo(req.id, null)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className="p2-dropzone"
                            role="button"
                            tabIndex={0}
                            onClick={() => fileRefs.current[refKey]?.click()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                fileRefs.current[refKey]?.click();
                              }
                            }}
                          >
                            <div className="p2-dropzone-icon">
                              <Upload size={16} />
                            </div>
                            <span className="p2-dropzone-text">
                              Haz clic para seleccionar un PDF
                            </span>
                            <span className="p2-dropzone-sub">Máximo 10 MB</span>
                          </div>
                          <input
                            ref={(el) => { fileRefs.current[refKey] = el; }}
                            type="file"
                            accept="application/pdf"
                            style={{ display: 'none' }}
                            onChange={onFileChange(req.id)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {reqObligatoriosPend > 0 && (
              <div className="p2-req-warn">
                <AlertTriangle size={15} />
                Faltan {reqObligatoriosPend} documento(s) obligatorio(s) por subir.
              </div>
            )}

            {/* ── Verificación ── */}
            <div className="p2-divider" />

            <p className="p2-section-label">
              <span className="p2-section-label-icon"><Shield size={13} /></span>
              Verificación de seguridad
            </p>

            <div className="p2-turnstile">
              <button
                type="button"
                onClick={onCaptchaToggle}
                aria-pressed={captchaOk}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  border: `2px solid ${captchaOk ? '#16a34a' : '#cbd5e1'}`,
                  background: captchaOk ? '#16a34a' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: '.2s',
                }}
              >
                {captchaOk && <Check size={16} strokeWidth={3} color="white" />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                  Confirmo que soy una persona
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                  Protegido por Cloudflare Turnstile · Sin captchas molestos
                </div>
              </div>
              <span className="p2-turnstile-brand">CLOUDFLARE</span>
            </div>

            {/* ── Footer ── */}
            <div className="p2-form-footer">
              <button type="button" className="p2-btn-back" onClick={onAtras}>
                <ArrowLeft size={14} />
                Atrás
              </button>
              <button
                type="button"
                className="p2-btn-submit"
                disabled={submitDisabled}
                onClick={onSubmit}
              >
                {loadingSubmit ? (
                  <>
                    <span className="p2-spin" />
                    Registrando…
                  </>
                ) : (
                  <>
                    Continuar al pago
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </main>

          {/* ─── Columna lateral ─── */}
          <aside className="p2-aside">
            <div className="p2-aside-sticky">

              {/* Progreso del registro */}
              <div className="p2-aside-card">
                <p className="p2-aside-card-title">Progreso del registro</p>
                <div className="p2-progress-row">
                  <div>
                    <div className="p2-progress-num">
                      {progresoPct}<span className="p2-progress-num-pct">%</span>
                    </div>
                    <p className="p2-progress-text">{okChecks} de {totalChecks} completados</p>
                  </div>
                  <div className="p2-progress-ring">
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15" fill="none"
                        stroke="url(#p2-grad)" strokeWidth="3"
                        strokeDasharray={ringDash}
                        strokeDashoffset={ringOffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.22,.61,.36,1)' }}
                      />
                      <defs>
                        <linearGradient id="p2-grad">
                          <stop offset="0%"   stopColor="#216ece" />
                          <stop offset="100%" stopColor="#4abdef" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Chips info trámite */}
              <div className="p2-chips">
                <div className="p2-chip">
                  <div className="p2-chip-val">{tipoSeleccionado.plazo_dias}d</div>
                  <div className="p2-chip-lbl">Plazo</div>
                </div>
                <div className="p2-chip">
                  <div className="p2-chip-val">S/{Number(tipoSeleccionado.costo_soles).toFixed(0)}</div>
                  <div className="p2-chip-lbl">Costo</div>
                </div>
                <div className="p2-chip">
                  <div className="p2-chip-val">~3m</div>
                  <div className="p2-chip-lbl">Registro</div>
                </div>
              </div>

              {/* Help card */}
              <div className="p2-help p2-help--info">
                <div className="p2-help-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <p className="p2-help-title">Documento de identidad</p>
                <p className="p2-help-text">
                  Selecciona el tipo de documento. Con DNI peruano puedes autocompletar tus datos directamente desde RENIEC.
                </p>
              </div>

              {/* Checklist */}
              <div className="p2-aside-card">
                <p className="p2-aside-card-title">Lista de verificación</p>
                <div className="p2-checklist">
                  {([
                    { label: 'DNI o documento',         ok: form.dni.trim().length > 0 },
                    { label: 'Nombres completos',       ok: form.nombres.trim().length > 0 },
                    { label: 'Apellido paterno',        ok: form.apellido_pat.trim().length > 0 },
                    { label: 'Apellido materno',        ok: form.apellido_mat.trim().length > 0 },
                    { label: 'Teléfono',                ok: form.telefono.trim().length > 0 },
                    { label: 'Correo electrónico',      ok: form.email.trim().length > 0 },
                    { label: 'Verificación de seguridad', ok: captchaOk },
                    ...reqObligatorios.map((r) => ({
                      label: r.nombre,
                      ok:    r.subido,
                    })),
                  ]).map((row, i) => (
                    <div key={i} className={`p2-check-row ${row.ok ? 'p2-check-row--ok' : 'p2-check-row--pending'}`}>
                      <div className="p2-check-dot">
                        {row.ok && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span>{row.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contacto */}
              <div className="p2-contact">
                <div className="p2-contact-head">
                  <div className="p2-contact-icon">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="p2-contact-t">¿Necesitas ayuda?</p>
                    <a href="tel:066123456" className="p2-contact-tel">(066) 123-456</a>
                  </div>
                </div>
                <p className="p2-contact-s">
                  Mesa de Partes · L–V de 8:00 a 16:30. También puedes escribirnos a{' '}
                  <a href="mailto:mesadepartes@carmenalto.gob.pe" className="p2-contact-mail">
                    mesadepartes@carmenalto.gob.pe
                  </a>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ════════ Overlay registro ════════ */}
      {registrando && (
        <div className="p2-reg-overlay" role="alertdialog" aria-live="polite">
          <div className="p2-reg-logo">CA</div>
          <div style={{ textAlign: 'center' }}>
            <p className="p2-reg-title">Registrando tu trámite…</p>
            <p className="p2-reg-sub">No cierres esta página. Solo tomará unos segundos.</p>
          </div>
          <div className="p2-reg-steps">
            {([
              'Verificando tu identidad',
              'Creando tu expediente',
              'Subiendo documentos adjuntos',
              'Enviando confirmación a tu correo',
            ]).map((label, idx) => {
              const step    = (idx + 1) as 1 | 2 | 3 | 4;
              const done    = step < pasoRegistro;
              const active  = step === pasoRegistro;
              const cls = done
                ? 'p2-reg-step p2-reg-step--done'
                : active
                  ? 'p2-reg-step p2-reg-step--active'
                  : 'p2-reg-step';

              return (
                <div key={step} className={cls}>
                  <div className="p2-reg-step-icon">
                    {done ? (
                      <Check size={12} strokeWidth={3} />
                    ) : active ? (
                      <div className="p2-reg-step-spin" />
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                  </div>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
