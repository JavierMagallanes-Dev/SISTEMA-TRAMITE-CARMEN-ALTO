// src/components/shared/Paso3Pago.tsx
// Paso 3 del PortalPage — pago con comprobante o Stripe.
// Diseño mejorado: código destacado, opciones claras, aviso de caja con horario.
import '../../styles/paso3.css';

import { useRef, useState } from 'react';
import { useNavigate }      from 'react-router-dom';
import {
  CheckCircle, Copy, Mail, Home,
  Upload, X, CreditCard, ImageIcon, Search,
  Clock, Building2,
} from 'lucide-react';
import StripePago from './StripePago';

interface TipoTramite {
  id: number; nombre: string; descripcion: string | null;
  costo_soles: number; plazo_dias: number;
}

interface Props {
  codigoGenerado: string;
  tipoRegistrado: TipoTramite;
  onResetForm:    () => void;
}

const VITE_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

type OpcionPago = 'seleccion' | 'comprobante' | 'stripe' | 'exitoso';

export default function Paso3Pago({ codigoGenerado, tipoRegistrado, onResetForm }: Props) {
  const navigate = useNavigate();

  const [opcionPago,        setOpcionPago]        = useState<OpcionPago>('seleccion');
  const [comprobante,       setComprobante]        = useState<File | null>(null);
  const [subiendoComp,      setSubiendoComp]       = useState(false);
  const [comprobanteSubido, setComprobanteSubido]  = useState(false);
  const [copiado,           setCopiado]            = useState(false);
  const comprobanteRef = useRef<HTMLInputElement>(null);

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoGenerado).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleComprobanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tipos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!tipos.includes(file.type)) return;
    if (file.size > 10 * 1024 * 1024) return;
    setComprobante(file);
    if (comprobanteRef.current) comprobanteRef.current.value = '';
  };

  const handleSubirComprobante = async () => {
    if (!comprobante) return;
    setSubiendoComp(true);
    try {
      const formData = new FormData();
      formData.append('comprobante', comprobante);
      const res = await fetch(`${VITE_API_URL}/portal/comprobante/${codigoGenerado}`, {
        method: 'POST', body: formData,
      });
      if (!res.ok) throw new Error('Error al subir el comprobante.');
      setComprobanteSubido(true);
      setComprobante(null);
    } catch { /* toast manejado en padre */ }
    finally { setSubiendoComp(false); }
  };

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="p3-hero">
        <div className="p3-label">
          <span className="p3-dot" />
          Portal Ciudadano — Paso 3 de 3
        </div>
        <h1 className="p3-title">
          {opcionPago === 'exitoso' ? '¡Pago completado!' : '¡Tu trámite fue registrado!'}
        </h1>
        <p className="p3-sub">
          {opcionPago === 'exitoso'
            ? 'Tu expediente ha sido activado. Puedes consultar su estado en cualquier momento.'
            : 'Elige cómo deseas realizar el pago para activar tu solicitud.'}
        </p>
        <div className="p3-tabs">
          <div className="p3-tab done"><span className="p3-tab-num">✓</span>Seleccionar trámite</div>
          <span className="p3-tab-sep">›</span>
          <div className="p3-tab done"><span className="p3-tab-num">✓</span>Tus datos</div>
          <span className="p3-tab-sep">›</span>
          <div className="p3-tab active"><span className="p3-tab-num">3</span>Pago</div>
        </div>
      </div>

      {/* ── Main ──────────────────────────────────────────── */}
      <div className="p3-main">

        {/* ══ PAGO EXITOSO CON STRIPE ══ */}
        {opcionPago === 'exitoso' ? (
          <div className="p3-exito-wrap">
            <div className="p3-success-icon" style={{ background: '#E1F5EE', borderColor: '#9FE1CB' }}>
              <CheckCircle size={38} color="#1D9E75" strokeWidth={2.2} />
            </div>
            <p className="p3-success-title">¡Pago procesado exitosamente!</p>
            <p className="p3-success-sub">Tu trámite ha sido activado automáticamente. Recibirás un correo de confirmación.</p>

            <div className="p3-codigo-importante">

              <div className="p3-exp-code" onClick={copiarCodigo}>{codigoGenerado}</div>
              <p className="p3-copy-hint">
                <Copy size={13} color="#9CA3B0" />
                {copiado ? '¡Copiado!' : 'Haz clic para copiar'}
              </p>
            </div>

            <div className="p3-footer" style={{ marginTop: 28, justifyContent: 'center', gap: 12 }}>
              <button className="p3-btn-secondary" onClick={onResetForm}>
                <Home size={15} />Registrar otro trámite
              </button>
              <button className="p3-btn-primary" onClick={() => navigate(`/consulta/${codigoGenerado}`)}>
                <Search size={15} color="white" />Ver estado de mi trámite
              </button>
            </div>
          </div>

        ) : opcionPago === 'stripe' ? (
          <StripePago
            codigo={codigoGenerado}
            onExito={() => setOpcionPago('exitoso')}
            onCancel={() => setOpcionPago('seleccion')}
          />

        ) : (
          <>
            {/* ══ BLOQUE CÓDIGO + RESUMEN ══ */}
            <div className="p3-top-block">

              {/* Código destacado */}
              <div className="p3-codigo-block">
                <div className="p3-success-icon-sm">
                  <CheckCircle size={26} color="#1D9E75" strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="p3-success-title" style={{ fontSize: 18, marginBottom: 4 }}>
                    ¡Trámite registrado!
                  </h2>
                  <p className="p3-success-sub" style={{ marginBottom: 0 }}>
                    Tu número de expediente es:
                  </p>
                </div>
              </div>

              {/* Código con aviso importante */}
              <div className="p3-codigo-importante">
                <div className="p3-exp-code" onClick={copiarCodigo}>
                  {codigoGenerado}
                </div>
                <p className="p3-copy-hint">
                  <Copy size={13} color="#9CA3B0" />
                  {copiado ? '¡Código copiado!' : 'Haz clic para copiar el código'}
                </p>
              </div>

              {/* Resumen */}
              <div className="p3-resumen">
                <div>
                  <p className="p3-resumen-label">Trámite</p>
                  <p className="p3-resumen-name">{tipoRegistrado.nombre}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="p3-resumen-label">Monto a pagar</p>
                  <p className="p3-resumen-monto">S/ {Number(tipoRegistrado.costo_soles).toFixed(2)}</p>
                </div>
              </div>

              {/* Email notice */}
              <div className="p3-email-notice">
                <Mail size={16} color="#0C447C" strokeWidth={2} />
                Te enviamos un correo con los detalles de tu trámite. Revisa tu bandeja de entrada y spam.
              </div>
            </div>

            {/* ══ OPCIONES DE PAGO ══ */}
            <p className="p3-section-label">¿Cómo deseas realizar el pago?</p>

            <div className="p3-payment-grid">

              {/* ── Comprobante ── */}
              <div
                className={`p3-pay-card ${opcionPago === 'comprobante' ? 'selected' : ''}`}
                onClick={() => opcionPago !== 'comprobante' && setOpcionPago('comprobante')}>
                <div className="p3-sel-dot">
                  <CheckCircle size={10} color="white" />
                </div>

                <div className="p3-pay-icon ic-amber">
                  <ImageIcon size={20} color="#D97706" strokeWidth={1.8} />
                </div>
                <p className="p3-pay-title">Adjuntar comprobante</p>
                <p className="p3-pay-sub">Yape · Plin · Transferencia bancaria</p>
                <div className="p3-pay-tiempo">
                  <Clock size={11} color="#9CA3B0" />
                  Verificación en 1-2 días hábiles
                </div>

                {opcionPago === 'comprobante' ? (
                  comprobanteSubido ? (
                    <div className="p3-comp-enviado">
                      <CheckCircle size={16} color="#1D9E75" />
                      ¡Enviado! El cajero lo verificará pronto.
                    </div>
                  ) : (
                    <>
                      {comprobante ? (
                        <div className="p3-file-attached">
                          <ImageIcon size={14} color="#1D9E75" />
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#1D9E75', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {comprobante.name}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); setComprobante(null); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3B0' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="p3-upload-zone"
                          onClick={(e) => { e.stopPropagation(); comprobanteRef.current?.click(); }}>
                          <Upload size={18} color="#D97706" strokeWidth={1.8} style={{ margin: '0 auto 6px', display: 'block' }} />
                          <p className="p3-uz-title">Seleccionar comprobante</p>
                          <p className="p3-uz-sub">JPG, PNG o PDF · Máx. 10MB</p>
                        </div>
                      )}
                      <input
                        ref={comprobanteRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={handleComprobanteChange}
                      />
                      {comprobante && (
                        <button
                          className="p3-btn-enviar"
                          disabled={subiendoComp}
                          onClick={(e) => { e.stopPropagation(); handleSubirComprobante(); }}>
                          <Upload size={15} color="white" />
                          {subiendoComp ? 'Enviando...' : 'Enviar comprobante'}
                        </button>
                      )}
                    </>
                  )
                ) : (
                  <button className="p3-btn-seleccionar">
                    Seleccionar esta opción
                  </button>
                )}
              </div>

              {/* ── Stripe ── */}
              <div className="p3-pay-card" onClick={() => setOpcionPago('stripe')}>
                <div className="p3-sel-dot">
                  <CheckCircle size={10} color="white" />
                </div>
                <div className="p3-pay-badge-top">
                  <CheckCircle size={10} color="#1D9E75" />
                  Activación inmediata
                </div>
                <div className="p3-pay-icon ic-blue">
                  <CreditCard size={20} color="#185FA5" strokeWidth={1.8} />
                </div>
                <p className="p3-pay-title">Pago en línea</p>
                <p className="p3-pay-sub">Tarjeta de crédito o débito</p>
                <button
                  className="p3-btn-pay"
                  onClick={(e) => { e.stopPropagation(); setOpcionPago('stripe'); }}>
                  <CreditCard size={15} color="white" strokeWidth={2} />
                  Pagar con tarjeta
                </button>
              </div>
            </div>

            {/* ── Aviso caja ── */}
            <div className="p3-caja-notice">
              <Building2 size={18} color="#D97706" strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <div>
                <p className="p3-caja-title">También puedes pagar presencialmente en Caja</p>
                <p className="p3-caja-text">
                  Acércate a la Municipalidad de Carmen Alto con tu código <strong>{codigoGenerado}</strong>.<br />
                  Horario de atención: Lunes a Viernes de 8:00 a 16:30 · Sábados de 8:00 a 12:00.
                </p>
              </div>
            </div>

            <div className="p3-divider" />

            {/* ── Footer ── */}
            <div className="p3-footer">
              <button className="p3-btn-secondary" onClick={onResetForm}>
                <Home size={15} />
                Registrar otro trámite
              </button>
              <button className="p3-btn-primary" onClick={() => navigate(`/consulta/${codigoGenerado}`)}>
                <Search size={15} color="white" />
                Ver estado de mi trámite
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}