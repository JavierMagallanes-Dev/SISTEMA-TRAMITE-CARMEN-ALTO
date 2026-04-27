// src/components/shared/StripePago.tsx
// Componente de pago con Stripe Elements.
// Después del pago exitoso llama al backend para registrar el pago
// sin depender del webhook (que no funciona en localhost).

import { useState, useEffect } from 'react';
import { loadStripe }          from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const VITE_API_URL           = import.meta.env.VITE_API_URL           ?? 'http://localhost:3000/api';
const VITE_STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? '';

const stripePromise = loadStripe(VITE_STRIPE_PUBLIC_KEY);

const STRIPE_STYLE = {
  style: {
    base: {
      fontSize:        '14px',
      color:           '#111827',
      fontFamily:      'Inter, system-ui, sans-serif',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#dc2626' },
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
}

function FormPago({ clientSecret, paymentIntentId, codigo, monto, tramite, onExito, onError }: FormPagoProps) {
  const stripe   = useStripe();
  const elements = useElements();

  const [procesando, setProcesando] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');
  const [cardReady,  setCardReady]  = useState(false);

  const handlePagar = async () => {
    if (!stripe || !elements) return;
    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) return;

    setProcesando(true);
    setErrorLocal('');

    try {
      // 1. Confirmar pago con Stripe
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
        // 2. Notificar al backend para registrar el pago y cambiar estado
        const res = await fetch(`${VITE_API_URL}/stripe/confirmar-pago`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            paymentIntentId: paymentIntent.id,
            codigo,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          console.warn('⚠️ Backend confirmación:', data.error);
          // Aun así el pago fue exitoso en Stripe — mostrar éxito
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
    <div className="space-y-4">
      {/* Info del pago */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Trámite</p>
            <p className="text-sm font-semibold text-gray-800">{tramite}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{codigo}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total a pagar</p>
            <p className="text-2xl font-bold text-blue-700">S/ {monto.toFixed(2)}</p>
          </div>
        </div>
      </div>

     

      {/* Formulario */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Número de tarjeta</label>
          <div className="px-3 py-2.5 border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white">
            <CardNumberElement options={STRIPE_STYLE} onChange={(e) => setCardReady(!e.empty && !e.error)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Vencimiento</label>
            <div className="px-3 py-2.5 border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white">
              <CardExpiryElement options={STRIPE_STYLE} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">CVC</label>
            <div className="px-3 py-2.5 border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white">
              <CardCvcElement options={STRIPE_STYLE} />
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {errorLocal && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={15} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-700">{errorLocal}</p>
        </div>
      )}

      {/* Botón pagar */}
      <button onClick={handlePagar}
        disabled={procesando || !stripe || !cardReady}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
          procesando || !stripe || !cardReady
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}>
        {procesando ? (
          <><Loader size={16} className="animate-spin" />Procesando pago...</>
        ) : (
          <><CreditCard size={16} />Pagar S/ {monto.toFixed(2)}</>
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <Lock size={11} />
        <span>Pago seguro procesado por Stripe</span>
      </div>
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

  if (pagoExitoso) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">¡Pago exitoso!</h3>
          <p className="text-sm text-gray-500 mt-1">Tu trámite ha sido activado automáticamente.</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-xs text-green-700 font-medium">
            📧 Recibirás un email de confirmación con los detalles de tu trámite.
          </p>
        </div>
        <p className="text-xs text-gray-400">Redirigiendo...</p>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader size={24} className="animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Preparando el pago seguro...</p>
      </div>
    );
  }

  if (errorInit) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">No se pudo iniciar el pago</p>
            <p className="text-xs text-red-600 mt-0.5">{errorInit}</p>
          </div>
        </div>
        <button onClick={onCancel}
          className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors">
          Volver
        </button>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
          <CreditCard size={16} className="text-blue-600" />
          <h3 className="text-sm font-bold text-gray-800">Pago con tarjeta</h3>
        </div>
        <FormPago
          clientSecret={clientSecret}
          paymentIntentId={paymentIntentId}
          codigo={codigo}
          monto={monto}
          tramite={tramite}
          onExito={handleExito}
          onError={(msg) => console.error('Error Stripe:', msg)}
        />
        <button onClick={onCancel}
          className="w-full px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Volver a las opciones de pago
        </button>
      </div>
    </Elements>
  );
}