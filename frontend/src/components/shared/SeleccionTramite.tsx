// src/components/shared/SeleccionTramite.tsx
// Paso 1 del PortalPage — nuevo estilo con step tabs y panel de detalle.
import '../../styles/paso1.css';

import { ArrowRight, CheckCircle, Info, Monitor, ShieldCheck } from 'lucide-react';

interface TipoTramite {
  id: number; nombre: string; descripcion: string | null;
  costo_soles: number; plazo_dias: number;
}

interface TramiteInfo {
  iconColor: 'blue' | 'teal';
  reqs: string[];
}

const TRAMITE_MAP: Record<string, TramiteInfo> = {
  'Licencia de Construcción': {
    iconColor: 'blue',
    reqs: [
      'DNI del propietario',
      'Planos arquitectónicos firmados',
      'Memoria descriptiva del proyecto',
      'Título de propiedad o contrato',
      'Recibo de pago del trámite',
    ],
  },
  'Certificado de No Adeudo': {
    iconColor: 'teal',
    reqs: [
      'DNI o RUC del solicitante',
      'Código predial o dirección del inmueble',
      'Recibo de pago del trámite',
    ],
  },
  'Partida de Nacimiento': {
    iconColor: 'blue',
    reqs: [
      'DNI del solicitante',
      'Formulario de solicitud firmado',
      'Recibo de pago del trámite',
    ],
  },
};

function IconTramite({ nombre, color }: { nombre: string; color: 'blue' | 'teal' }) {
  const stroke = color === 'blue' ? '#185FA5' : '#1D9E75';
  const w = 19;
  if (nombre.includes('Funcionamiento'))
    return <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  if (nombre.includes('Renovación'))
    return <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  if (nombre.includes('Construcción'))
    return <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
  if (nombre.includes('Adeudo'))
    return <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  if (nombre.includes('Nacimiento'))
    return <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  return <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}

interface Props {
  tipos:         TipoTramite[];
  seleccionado:  TipoTramite | null;
  paso:          number;
  onSeleccionar: (tipo: TipoTramite) => void;
  onContinuar:   () => void;
}

export default function SeleccionTramite({ tipos, seleccionado, paso, onSeleccionar, onContinuar }: Props) {
  const info = seleccionado ? TRAMITE_MAP[seleccionado.nombre] : null;

  const tabClass = (n: number) => {
    if (n === paso) return 'p1-tab active';
    if (n < paso)  return 'p1-tab done';
    return 'p1-tab inactive';
  };

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="p1-hero">
        <div className="p1-label">
          <span className="p1-dot" />
          Portal Ciudadano — Paso 1 de 3
        </div>
        <h1 className="p1-title">¿Qué trámite necesitas realizar?</h1>
        <p className="p1-sub">Selecciona el tipo de trámite y te mostraremos los requisitos y el costo estimado.</p>

        {/* Step tabs */}
        <div className="p1-tabs">
          <div className={tabClass(1)}>
            <span className="p1-tab-num">{paso > 1 ? '✓' : '1'}</span>
            Seleccionar trámite
          </div>
          <span className="p1-tab-sep">›</span>
          <div className={tabClass(2)}>
            <span className="p1-tab-num">2</span>
            Completar datos
          </div>
          <span className="p1-tab-sep">›</span>
          <div className={tabClass(3)}>
            <span className="p1-tab-num">3</span>
            Pagar y enviar
          </div>
        </div>
      </div>

      {/* ── Contenido ─────────────────────────────────────── */}
      <div className="p1-main">
        <p className="p1-section-label">Tipos de trámite disponibles</p>

        {/* Grid de trámites */}
        <div className="p1-grid">
          {tipos.map((tipo) => {
            const t = TRAMITE_MAP[tipo.nombre];
            return (
              <div
                key={tipo.id}
                className={`p1-card ${seleccionado?.id === tipo.id ? 'selected' : ''}`}
                onClick={() => onSeleccionar(tipo)}>
                <div className="p1-card-check">
                  <CheckCircle size={11} color="white" />
                </div>
                <div className={`p1-card-icon ic-${t?.iconColor ?? 'blue'}`}>
                  <IconTramite nombre={tipo.nombre} color={t?.iconColor ?? 'blue'} />
                </div>
                <p className="p1-card-name">{tipo.nombre}</p>
                <div className="p1-card-meta">
                  <span className="p1-price">S/ {Number(tipo.costo_soles).toFixed(2)}</span>
                  <span className="p1-days">{tipo.plazo_dias} días</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Panel de detalle */}
        {info && seleccionado ? (
          <div className="p1-detail" key={seleccionado.id}>
            <div className="p1-detail-header">
              <div className="p1-detail-title">{seleccionado.nombre}</div>
              <div className="p1-detail-badges">
                <span className="p1-badge-price">S/ {Number(seleccionado.costo_soles).toFixed(2)}</span>
                <span className="p1-badge-days">{seleccionado.plazo_dias} días hábiles</span>
              </div>
            </div>
            <p className="p1-docs-label">Documentos requeridos</p>
            {info.reqs.map((r, i) => (
              <div key={i} className="p1-doc-item">
                <div className="p1-doc-dot" />
                {r}
              </div>
            ))}
          </div>
        ) : (
          <div className="p1-placeholder">
            Selecciona un trámite para ver los requisitos
          </div>
        )}

        {/* CTA */}
        <button
          className="p1-cta"
          onClick={onContinuar}
          disabled={!seleccionado}
          style={{ opacity: seleccionado ? 1 : 0.4, cursor: seleccionado ? 'pointer' : 'not-allowed' }}>
          Continuar con este trámite
          <ArrowRight size={19} color="white" />
        </button>

        {/* Info row */}
        <div className="p1-info-row">
          <div className="p1-info-chip">
            <Info size={17} color="#185FA5" strokeWidth={2} />
            <div className="p1-info-chip-text">
              <strong>¿Necesitas ayuda?</strong>
              Llama al (066) 123-456
            </div>
          </div>
          <div className="p1-info-chip">
            <Monitor size={17} color="#185FA5" strokeWidth={2} />
            <div className="p1-info-chip-text">
              <strong>Trámite en línea</strong>
              Sin ir a ventanilla
            </div>
          </div>
          <div className="p1-info-chip">
            <ShieldCheck size={17} color="#185FA5" strokeWidth={2} />
            <div className="p1-info-chip-text">
              <strong>Pago seguro</strong>
              Plataforma oficial
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}