// src/routes/stripe.routes.ts
// Rutas para integración con Stripe.
// El webhook requiere el raw body — por eso se maneja antes del express.json()

import { Router }           from 'express';
import express              from 'express';
import { autenticar }       from '../middlewares/auth.middleware';
import {
  crearPaymentIntent,
  confirmarPago,
  stripeWebhook,
  verificarPago,
} from '../controllers/stripe.controller';

const router = Router();

// Webhook de Stripe — DEBE recibir raw body, no JSON parseado
// Esta ruta se registra ANTES de express.json() en index.ts
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook,
);

// Crear Payment Intent — público (ciudadano sin login)
router.post('/crear-payment-intent', crearPaymentIntent);

// Confirmar pago después del pago exitoso — público
router.post('/confirmar-pago', confirmarPago);

// Verificar estado — público
router.get('/verificar/:paymentIntentId', verificarPago);

export default router;