// src/components/shared/StripePago.tsx
// Formulario de pago con Stripe Elements — diseño institucional mejorado.
import '../../styles/stripe.css';

import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { loadStripe }          from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  CreditCard, Lock, CheckCircle,
  AlertCircle, Loader, ArrowLeft, Search, FileText,
} from 'lucide-react';

const VITE_API_URL           = import.meta.env.VITE_API_URL           ?? 'http://localhost:3000/api';
const VITE_STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? '';

const stripePromise = loadStripe(VITE_STRIPE_PUBLIC_KEY);

const STRIPE_STYLE = {
  style: {
    base: {
      fontSize:        '14px',
      color:           '#1A1D2E',
      fontFamily:      'Plus Jakarta Sans, Inter, system-ui, sans-serif',
      '::placeholder': { color: '#9CA3B5' },
    },
    invalid: { color: '#D94040' },
  },
};



// ── Formulario interno ───────────────────────────────────────────
interface FormPagoProps {
  clientSecret:    string;
  paymentIntentId: string;
  codigo:          string;
  monto:           number;
  tramite:         string;
  onExito:         () => void;
  onError:         (msg: string) => void;
  onCancel:        () => void;
}

// Reemplaza SOLO la función FormPago en StripePago.tsx
// El resto del archivo queda igual.

function FormPago({ clientSecret, codigo, monto, tramite, onExito, onError, onCancel }: FormPagoProps) {
  const stripe   = useStripe();
  const elements = useElements();

  const [procesando,  setProcesando]  = useState(false);
  const [errorLocal,  setErrorLocal]  = useState('');
  const [cardReady,   setCardReady]   = useState(false);
  const [expiryReady, setExpiryReady] = useState(false);
  const [cvcReady,    setCvcReady]    = useState(false);

  // Estado visual de la tarjeta
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• ••••');
  const [cardExpiry, setCardExpiry] = useState('MM/AA');
  const [cardCvc,    setCardCvc]    = useState('•••');
  const [isFlipped,  setIsFlipped]  = useState(false);

  const todoListo = cardReady && expiryReady && cvcReady;

  const handlePagar = async () => {
    if (!stripe || !elements) return;
    const cardNumberEl = elements.getElement(CardNumberElement);
    if (!cardNumberEl) return;
    setProcesando(true); setErrorLocal('');
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardNumberEl },
      });
      if (error) {
        const msg = error.message ?? 'Error al procesar el pago.';
        setErrorLocal(msg); onError(msg); return;
      }
      if (paymentIntent?.status === 'succeeded') {
        const res = await fetch(`${VITE_API_URL}/stripe/confirmar-pago`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id, codigo }),
        });
        if (!res.ok) { const d = await res.json(); console.warn('Backend:', d.error); }
        onExito();
      }
    } catch (err: any) {
      const msg = err.message ?? 'Error inesperado.';
      setErrorLocal(msg); onError(msg);
    } finally { setProcesando(false); }
  };

  return (
    <div className="sp-main">

      {/* Resumen */}
      <div className="sp-resumen">
        <div className="sp-resumen-left">
          <div className="sp-resumen-icon">
            <FileText size={19} color="#0C447C" strokeWidth={1.8} />
          </div>
          <div>
            <p className="sp-res-label">Trámite</p>
            <p className="sp-res-name">{tramite}</p>
            <p className="sp-res-exp">{codigo}</p>
          </div>
        </div>
        <div>
          <p className="sp-res-total-label">Total a pagar</p>
          <p className="sp-res-total-price">S/ {monto.toFixed(2)}</p>
        </div>
      </div>

      <p className="sp-section-label">Datos de la tarjeta</p>

      {/* Card type badges */}
      <div className="sp-card-types">
        {['Visa', 'Mastercard', 'Amex'].map((b) => (
          <div key={b} className="sp-card-badge">
            <CreditCard size={13} strokeWidth={2} />{b}
          </div>
        ))}
      </div>

      {/* ── Tarjeta visual mejorada con flip ── */}
      <div className="sp-card-wrap">
        <div style={{ width: 220, flexShrink: 0, perspective: 900 }}>
          <div style={{
            width: 220, height: 135,
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.55s cubic-bezier(.4,0,.2,1)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}>

            {/* FRENTE */}
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #042C53 0%, #185FA5 60%, #1a7bc4 100%)',
              padding: '18px 20px',
              boxShadow: '0 12px 32px rgba(4,44,83,.3), 0 2px 8px rgba(0,0,0,.1)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              overflow: 'hidden',
            }}>
              {/* Círculos decorativos */}
              <div style={{
                position: 'absolute', top: -30, right: -30,
                width: 120, height: 120, borderRadius: '50%',
                background: 'rgba(255,255,255,.07)', pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', bottom: -20, left: -20,
                width: 90, height: 90, borderRadius: '50%',
                background: 'rgba(255,255,255,.05)', pointerEvents: 'none',
              }} />

              {/* Top: chip + brand */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 32, height: 24, borderRadius: 5,
                  background: 'linear-gradient(135deg, #e8c84a, #c8902a)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3)',
                }} />
                <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 16, fontWeight: 900, fontStyle: 'italic' }}>
                  VISA
                </span>
              </div>

              {/* Número */}
              <div style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 16, fontWeight: 600, letterSpacing: 2,
                color: cardNumber === '•••• •••• •••• ••••' ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.95)',
                position: 'relative', zIndex: 1,
                transition: 'color .3s',
              }}>
                {cardNumber}
              </div>

              {/* Bottom: vence */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 2 }}>Vence</div>
                  <div style={{
                    fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 700,
                    color: cardExpiry === 'MM/AA' ? 'rgba(255,255,255,.4)' : '#fff',
                    transition: 'color .3s',
                  }}>{cardExpiry}</div>
                </div>
              </div>
            </div>

            {/* REVERSO */}
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1a2a3a 0%, #0d1d2e 100%)',
              boxShadow: '0 12px 32px rgba(4,44,83,.3)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Banda magnética */}
              <div style={{ height: 36, background: 'linear-gradient(to bottom, #111, #2a2a2a, #111)', marginTop: 20, marginBottom: 14 }} />
              {/* Strip CVC */}
              <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  flex: 1, height: 32, borderRadius: 4,
                  background: 'repeating-linear-gradient(-45deg, #f8f8f8, #f8f8f8 3px, #e8e8e8 3px, #e8e8e8 6px)',
                  display: 'flex', alignItems: 'center', padding: '0 8px',
                }}>
                  <span style={{ fontSize: 9, color: '#aaa', fontStyle: 'italic' }}>Firma autorizada</span>
                </div>
                <div style={{
                  background: '#fff', borderRadius: 6, padding: '4px 10px', textAlign: 'center', minWidth: 44,
                }}>
                  <div style={{ fontSize: 7, color: '#999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>CVC</div>
                  <div style={{
                    fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 800, color: '#1a1d2e',
                    letterSpacing: 2, transition: 'all .2s',
                  }}>
                    {cardCvc === '•••' ? '•••' : '•'.repeat(cardCvc.length)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Campos Stripe */}
        <div className="sp-card-fields">
          <div className="sp-field">
            <label className="sp-field-label">
              Número de tarjeta <span className="req">*</span>
              {cardReady && <span className="sp-field-check"><CheckCircle size={13} color="#1D9E75" /></span>}
            </label>
            <div className={`sp-stripe-wrap${cardReady ? ' valid' : ''}`}>
              <div className="sp-stripe-inner">
                <CardNumberElement
                  options={STRIPE_STYLE}
                  onChange={(e) => {
                    setCardReady(!e.empty && !e.error);
                    if (e.empty) setCardNumber('•••• •••• •••• ••••');
                    else if (e.complete) setCardNumber('•••• •••• •••• ••••');
                    // Stripe no expone el número real por seguridad — mostramos placeholder animado
                    else setCardNumber('•••• •••• •••• ••••');
                  }}
                  onFocus={() => setIsFlipped(false)}
                />
              </div>
            </div>
          </div>

          <div className="sp-field-row">
            <div>
              <label className="sp-field-label">
                Vencimiento <span className="req">*</span>
                {expiryReady && <span className="sp-field-check"><CheckCircle size={13} color="#1D9E75" /></span>}
              </label>
              <div className={`sp-stripe-wrap${expiryReady ? ' valid' : ''}`}>
                <div className="sp-stripe-inner">
                  <CardExpiryElement
                    options={STRIPE_STYLE}
                    onChange={(e) => {
                      setExpiryReady(e.complete && !e.error);
                      if (e.complete) setCardExpiry('••/••');
                      else if (e.empty) setCardExpiry('MM/AA');
                    }}
                    onFocus={() => setIsFlipped(false)}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="sp-field-label">
                CVC <span className="req">*</span>
                {cvcReady && <span className="sp-field-check"><CheckCircle size={13} color="#1D9E75" /></span>}
              </label>
              <div className={`sp-stripe-wrap${cvcReady ? ' valid' : ''}`}>
                <div className="sp-stripe-inner">
                  <CardCvcElement
                    options={STRIPE_STYLE}
                    onChange={(e) => {
                      setCvcReady(e.complete && !e.error);
                      if (e.complete) setCardCvc('•••');
                      else if (e.empty) setCardCvc('•••');
                    }}
                    onFocus={() => { setIsFlipped(true); setCardCvc('···'); }}
                    onBlur={() => setIsFlipped(false)}
                  />
                </div>
              </div>
              <p className="sp-cvc-hint">3 dígitos al dorso de tu tarjeta</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {errorLocal && (
        <div className="sp-error">
          <AlertCircle size={16} color="#D94040" />
          <div>
            <p style={{ fontWeight: 700, marginBottom: 2 }}>No se pudo procesar el pago</p>
            <p style={{ fontSize: 12 }}>{errorLocal}</p>
          </div>
        </div>
      )}

      {/* Procesando */}
      {procesando && (
        <div className="sp-procesando">
          <Loader size={16} className="animate-spin" />
          Procesando tu pago de forma segura...
        </div>
      )}

      <div className="sp-divider" />

      <button className="sp-btn-pay" onClick={handlePagar} disabled={procesando || !stripe || !todoListo}>
        {procesando
          ? <><Loader size={18} className="animate-spin" />Procesando...</>
          : <><Lock size={18} />Pagar S/ {monto.toFixed(2)} de forma segura</>}
      </button>

      <button className="sp-back" onClick={onCancel}>
        <ArrowLeft size={14} />Volver a las opciones de pago
      </button>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────
interface StripePagoProps {
  codigo:   string;
  onExito:  () => void;
  onCancel: () => void;
}

export default function StripePago({ codigo, onExito, onCancel }: StripePagoProps) {
  const navigate = useNavigate();

  const [cargando,        setCargando]        = useState(true);
  const [clientSecret,    setClientSecret]    = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [monto,           setMonto]           = useState(0);
  const [tramite,         setTramite]         = useState('');
  const [errorInit,       setErrorInit]       = useState('');
  const [pagoExitoso,     setPagoExitoso]     = useState(false);

  useEffect(() => {
    const crearIntent = async () => {
      try {
        const res = await fetch(`${VITE_API_URL}/stripe/crear-payment-intent`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ codigo }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Error al iniciar el pago.');
        }
        const data = await res.json();
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setMonto(data.monto);
        setTramite(data.tramite);
      } catch (err: any) {
        setErrorInit(err.message ?? 'No se pudo iniciar el pago.');
      } finally {
        setCargando(false);
      }
    };
    crearIntent();
  }, [codigo]);

  const handleExito = () => {
    setPagoExitoso(true);
    setTimeout(() => onExito(), 2500);
  };

  // Pago exitoso
  if (pagoExitoso) return (
    <div>
      
      <div className="sp-main">
        <div className="sp-success">
          <div className="sp-success-icon">
            <CheckCircle size={32} color="#1D9E75" strokeWidth={2.2} />
          </div>
          <h2 className="sp-success-title">¡Pago realizado exitosamente!</h2>
          <p className="sp-success-sub">
            Tu pago fue procesado de forma segura por Stripe.<br />
            Recibirás un comprobante en tu correo electrónico.
          </p>
          <div className="sp-receipt">
            <div>
              <p className="sp-receipt-label">Trámite pagado</p>
              <p className="sp-receipt-name">{tramite}</p>
              <p style={{ fontSize: 12, color: '#9CA3B0', marginTop: 3 }}>{codigo}</p>
            </div>
            <p className="sp-receipt-price">S/ {monto.toFixed(2)}</p>
          </div>
          <button className="sp-btn-done" onClick={() => navigate(`/consulta/${codigo}`)}>
            <Search size={17} color="white" />
            Ver estado de mi trámite
          </button>
        </div>
      </div>
    </div>
  );

  // Cargando
  if (cargando) return (
    <div>
      
      <div className="sp-main">
        <div className="sp-loading">
          <Loader size={28} className="animate-spin" style={{ color: '#185FA5' }} />
          <p>Preparando el entorno de pago seguro...</p>
          <p style={{ fontSize: 12, color: '#9CA3B0', marginTop: 4 }}>Conectando con Stripe...</p>
        </div>
      </div>
    </div>
  );

  // Error inicialización
  if (errorInit) return (
    <div>
      
      <div className="sp-main">
        <div className="sp-init-error">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <AlertCircle size={18} color="#D94040" />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#D94040' }}>No se pudo iniciar el pago</p>
          </div>
          <p style={{ fontSize: 13, color: '#5C6278', marginBottom: 8 }}>{errorInit}</p>
          <p style={{ fontSize: 12, color: '#9CA3B0' }}>
            Verifica tu conexión a internet e intenta nuevamente. Si el problema persiste,
            utiliza la opción de pago con comprobante o acércate a Caja.
          </p>
        </div>
        <button className="sp-back" onClick={onCancel}>
          <ArrowLeft size={14} />Volver a las opciones de pago
        </button>
      </div>
    </div>
  );

  // Formulario
  return (
    <div>
      
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <FormPago
          clientSecret={clientSecret}
          paymentIntentId={paymentIntentId}
          codigo={codigo}
          monto={monto}
          tramite={tramite}
          onExito={handleExito}
          onError={(msg) => console.error('Error Stripe:', msg)}
          onCancel={onCancel}
        />
      </Elements>
    </div>
  );
}