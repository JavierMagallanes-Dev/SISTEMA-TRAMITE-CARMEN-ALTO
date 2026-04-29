// src/components/shared/StripePago.tsx
// Formulario de pago con Stripe Elements — diseño institucional.
// La lógica de backend NO fue modificada.
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

// ── Hero compartido ──────────────────────────────────────────────
function Hero() {
  return (
    <div className="sp-hero">
      <div className="sp-label"><span className="sp-dot" />Portal Ciudadano — Pago</div>
      <h1 className="sp-title">Pago con tarjeta</h1>
      <p className="sp-sub">
        Ingresa los datos de tu tarjeta para completar el pago de forma segura a través de Stripe.
      </p>
      <div className="sp-tabs">
        <div className="sp-tab done"><span className="sp-tab-num">✓</span>Seleccionar trámite</div>
        <span className="sp-tab-sep">›</span>
        <div className="sp-tab done"><span className="sp-tab-num">✓</span>Tus datos</div>
        <span className="sp-tab-sep">›</span>
        <div className="sp-tab active"><span className="sp-tab-num">3</span>Pago</div>
      </div>
    </div>
  );
}

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

function FormPago({ clientSecret, codigo, monto, tramite, onExito, onError, onCancel }: FormPagoProps) {
  const stripe   = useStripe();
  const elements = useElements();

  const [procesando, setProcesando] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');
  const [cardReady,  setCardReady]  = useState(false);
  const [cardExpStr, setCardExpStr] = useState('MM/AA');

  const handlePagar = async () => {
    if (!stripe || !elements) return;
    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) return;

    setProcesando(true);
    setErrorLocal('');

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardNumber },
      });

      if (error) {
        const msg = error.message ?? 'Error al procesar el pago.';
        setErrorLocal(msg);
        onError(msg);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        const res = await fetch(`${VITE_API_URL}/stripe/confirmar-pago`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ paymentIntentId: paymentIntent.id, codigo }),
        });
        if (!res.ok) {
          const data = await res.json();
          console.warn('⚠️ Backend confirmación:', data.error);
        }
        onExito();
      }
    } catch (err: any) {
      const msg = err.message ?? 'Error inesperado.';
      setErrorLocal(msg);
      onError(msg);
    } finally {
      setProcesando(false);
    }
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

      {/* Section label */}
      <p className="sp-section-label">Datos de la tarjeta</p>

      {/* Card type badges */}
      <div className="sp-card-types">
        {['Visa', 'Mastercard', 'Amex'].map((b) => (
          <div key={b} className="sp-card-badge">
            <CreditCard size={14} strokeWidth={2} />
            {b}
          </div>
        ))}
      </div>

      {/* Card visual + fields */}
      <div className="sp-card-wrap">

        {/* Tarjeta visual */}
        <div className="sp-card-visual">
          <div className="sp-cv-chip" />
          <div className="sp-cv-number">•••• •••• •••• ••••</div>
          <div className="sp-cv-bottom">
            <div>
              <div className="sp-cv-label">Vence</div>
              <div className="sp-cv-value">{cardExpStr}</div>
            </div>
            <div className="sp-cv-brand">VISA</div>
          </div>
        </div>

        {/* Campos Stripe */}
        <div className="sp-card-fields">
          <div className="sp-field">
            <label className="sp-field-label">
              Número de tarjeta <span className="req">*</span>
            </label>
            <div className="sp-stripe-wrap">
              <div className="sp-stripe-inner">
                <CardNumberElement
                  options={STRIPE_STYLE}
                  onChange={(e) => setCardReady(!e.empty && !e.error)}
                />
              </div>
            </div>
          </div>

          <div className="sp-field-row">
            <div>
              <label className="sp-field-label">Vencimiento <span className="req">*</span></label>
              <div className="sp-stripe-wrap">
                <div className="sp-stripe-inner">
                  <CardExpiryElement
                    options={STRIPE_STYLE}
                    onChange={(e) => setCardExpStr(e.complete ? '••/••' : 'MM/AA')}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="sp-field-label">CVC <span className="req">*</span></label>
              <div className="sp-stripe-wrap">
                <div className="sp-stripe-inner">
                  <CardCvcElement options={STRIPE_STYLE} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {errorLocal && (
        <div className="sp-error">
          <AlertCircle size={16} color="#D94040" />
          {errorLocal}
        </div>
      )}

      <div className="sp-divider" />

      {/* Botón pagar */}
      <button
        className="sp-btn-pay"
        onClick={handlePagar}
        disabled={procesando || !stripe || !cardReady}>
        {procesando
          ? <><Loader size={18} className="animate-spin" />Procesando pago...</>
          : <><Lock size={18} />Pagar S/ {monto.toFixed(2)}</>
        }
      </button>

      <div className="sp-security">
        <Lock size={14} color="#9CA3B0" />
        Pago seguro procesado por Stripe · SSL 256-bit
      </div>

      <button className="sp-back" onClick={onCancel}>
        <ArrowLeft size={14} />
        Volver a las opciones de pago
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

  const [cargando,        setCargando]    = useState(true);
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
      <Hero />
      <div className="sp-main">
        <div className="sp-success">
          <div className="sp-success-icon">
            <CheckCircle size={32} color="#1D9E75" strokeWidth={2.2} />
          </div>
          <h2 className="sp-success-title">¡Pago realizado!</h2>
          <p className="sp-success-sub">
            Tu pago fue procesado exitosamente.<br />
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
      <Hero />
      <div className="sp-main">
        <div className="sp-loading">
          <Loader size={28} className="animate-spin" style={{ color: '#185FA5' }} />
          <p>Preparando el pago seguro...</p>
        </div>
      </div>
    </div>
  );

  // Error inicialización
  if (errorInit) return (
    <div>
      <Hero />
      <div className="sp-main">
        <div className="sp-init-error">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <AlertCircle size={18} color="#D94040" />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#D94040' }}>No se pudo iniciar el pago</p>
          </div>
          <p style={{ fontSize: 13, color: '#5C6278' }}>{errorInit}</p>
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
      <Hero />
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