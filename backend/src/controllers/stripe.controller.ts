// src/controllers/stripe.controller.ts
// Integración con Stripe para pagos en línea.
// Flujo:
// 1. Frontend solicita Payment Intent con el monto del trámite
// 2. Stripe devuelve client_secret para procesar el pago
// 3. Frontend confirma el pago con Stripe Elements
// 4. Frontend llama a /confirmar-pago para registrar en BD
// 5. Backend actualiza el expediente a RECIBIDO automáticamente

import { Request, Response, NextFunction } from 'express';
import Stripe     from 'stripe';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';
import { notificarCambioEstado } from '../services/email.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

// ── POST /api/stripe/crear-payment-intent ────────────────────────
export const crearPaymentIntent = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { codigo } = req.body as { codigo: string };
    if (!codigo) throw new AppError(400, 'Se requiere el código del expediente.');

    const expediente = await prisma.expediente.findUnique({
      where:  { codigo: codigo.toUpperCase() },
      select: {
        id: true, codigo: true, estado: true,
        tipoTramite: { select: { nombre: true, costo_soles: true } },
        ciudadano:   { select: { nombres: true, apellido_pat: true, email: true } },
      },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');
    if (expediente.estado !== 'PENDIENTE_PAGO') {
      throw new AppError(400, 'Este expediente no está pendiente de pago.');
    }

    const pagoExistente = await prisma.pago.findFirst({
      where: { expedienteId: expediente.id, estado: 'VERIFICADO' },
    });
    if (pagoExistente) throw new AppError(409, 'Este expediente ya tiene un pago verificado.');

    const montoCentimos = Math.round(Number(expediente.tipoTramite.costo_soles) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   montoCentimos,
      currency: 'usd',
      metadata: {
        expediente_codigo: expediente.codigo,
        expediente_id:     String(expediente.id),
        tramite:           expediente.tipoTramite.nombre,
        ciudadano:         `${expediente.ciudadano.nombres} ${expediente.ciudadano.apellido_pat}`,
        email:             expediente.ciudadano.email,
      },
      description:   `Trámite: ${expediente.tipoTramite.nombre} | Expediente: ${expediente.codigo}`,
      receipt_email: expediente.ciudadano.email ?? undefined,
    });

    console.log(`💳 Payment Intent creado para ${expediente.codigo}: ${paymentIntent.id}`);

    res.json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      monto:           Number(expediente.tipoTramite.costo_soles),
      montoFormateado: `S/ ${Number(expediente.tipoTramite.costo_soles).toFixed(2)}`,
      tramite:         expediente.tipoTramite.nombre,
      codigo:          expediente.codigo,
    });
  } catch (err) { next(err); }
};

// ── POST /api/stripe/confirmar-pago ─────────────────────────────
// El frontend llama esto directamente después del pago exitoso.
// No depende del webhook — funciona en localhost y en producción.
export const confirmarPago = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { paymentIntentId, codigo } = req.body as { paymentIntentId: string; codigo: string };

    if (!paymentIntentId || !codigo) {
      throw new AppError(400, 'Se requiere paymentIntentId y codigo.');
    }

    // Verificar con Stripe que el pago realmente fue exitoso
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new AppError(400, `El pago no fue completado. Estado: ${paymentIntent.status}`);
    }

    const expediente = await prisma.expediente.findUnique({
      where:  { codigo: codigo.toUpperCase() },
      select: {
        id: true, estado: true, codigo: true,
        ciudadano:   { select: { email: true, nombres: true } },
        tipoTramite: { select: { nombre: true } },
      },
    });

    if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

    // Idempotencia — evitar doble registro
    const pagoExistente = await prisma.pago.findFirst({
      where: { expedienteId: expediente.id, boleta: `STRIPE-${paymentIntentId}` },
    });
    if (pagoExistente) {
      res.json({ message: 'Pago ya registrado.', estado: 'RECIBIDO' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.pago.create({
        data: {
          expedienteId:  expediente.id,
          cajeroId:      1,
          boleta:        `STRIPE-${paymentIntentId}`,
          monto_cobrado: paymentIntent.amount / 100,
          estado:        'VERIFICADO',
          fecha_pago:    new Date(),
        },
      });

      await tx.expediente.update({
        where: { id: expediente.id },
        data:  { estado: 'RECIBIDO' },
      });

      await tx.movimiento.create({
        data: {
          expedienteId:     expediente.id,
          usuarioId:        1,
          tipo_accion:      'VERIFICACION_PAGO',
          estado_resultado: 'RECIBIDO',
          comentario:       `Pago verificado automáticamente via Stripe. ID: ${paymentIntentId} | Monto: S/ ${(paymentIntent.amount / 100).toFixed(2)}`,
        },
      });
    });

    try {
      await notificarCambioEstado({
        email: expediente.ciudadano.email ?? '',
        nombres:     expediente.ciudadano.nombres,
        codigo:      expediente.codigo,
        tipoTramite: expediente.tipoTramite.nombre,
        estado:      'RECIBIDO',
        comentario:  'Pago procesado exitosamente con tarjeta de crédito/débito via Stripe.',
      });
    } catch (e) { console.warn('⚠️ Email no enviado:', e); }

    console.log(`✅ Pago Stripe confirmado para ${codigo}`);
    res.json({ message: 'Pago confirmado. Expediente actualizado a RECIBIDO.', estado: 'RECIBIDO' });
  } catch (err) { next(err); }
};

// ── POST /api/stripe/webhook ─────────────────────────────────────
// Stripe llama este endpoint cuando el pago fue procesado.
// Funciona como respaldo en producción con webhook secret configurado.
export const stripeWebhook = async (
  req: Request, res: Response
): Promise<void> => {
  const sigHeader     = req.headers['stripe-signature'];
  const sig           = Array.isArray(sigHeader) ? sigHeader[0] : (sigHeader ?? '');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err: any) {
    console.error('❌ Error verificando webhook de Stripe:', err.message);
    res.status(400).json({ error: `Webhook error: ${err.message}` });
    return;
  }

  console.log(`📩 Webhook Stripe: ${event.type}`);

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as any;
    const codigoExp     = paymentIntent.metadata.expediente_codigo;
    const expedienteId  = Number(paymentIntent.metadata.expediente_id);

    try {
      const expediente = await prisma.expediente.findUnique({
        where:  { id: expedienteId },
        select: {
          id: true, estado: true, codigo: true,
          ciudadano:   { select: { email: true, nombres: true } },
          tipoTramite: { select: { nombre: true } },
        },
      });

      if (!expediente || expediente.estado !== 'PENDIENTE_PAGO') {
        console.warn(`⚠️ ${codigoExp} no está en PENDIENTE_PAGO — ignorando webhook`);
        res.json({ received: true });
        return;
      }

      // Idempotencia
      const pagoExistente = await prisma.pago.findFirst({
        where: { expedienteId, boleta: `STRIPE-${paymentIntent.id}` },
      });
      if (pagoExistente) {
        res.json({ received: true });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.pago.create({
          data: {
            expedienteId,
            cajeroId:      1,
            boleta:        `STRIPE-${paymentIntent.id}`,
            monto_cobrado: Number(paymentIntent.amount) / 100,
            estado:        'VERIFICADO',
            fecha_pago:    new Date(),
          },
        });
        await tx.expediente.update({ where: { id: expedienteId }, data: { estado: 'RECIBIDO' } });
        await tx.movimiento.create({
          data: {
            expedienteId,
            usuarioId:        1,
            tipo_accion:      'VERIFICACION_PAGO',
            estado_resultado: 'RECIBIDO',
            comentario:       `Pago via Stripe. ID: ${paymentIntent.id}`,
          },
        });
      });

      console.log(`✅ Expediente ${codigoExp} → RECIBIDO (webhook)`);
    } catch (err) {
      console.error('❌ Error procesando webhook:', err);
    }
  }

  res.json({ received: true });
};

// ── GET /api/stripe/verificar/:paymentIntentId ───────────────────
export const verificarPago = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const paymentIntentId = String(req.params['paymentIntentId'] ?? '');
    const paymentIntent   = await stripe.paymentIntents.retrieve(paymentIntentId);
    const codigoExp       = paymentIntent.metadata['expediente_codigo'] ?? '';

    const expediente = await prisma.expediente.findUnique({
      where:  { codigo: codigoExp },
      select: { estado: true, codigo: true },
    });

    res.json({
      status:     paymentIntent.status,
      pagado:     paymentIntent.status === 'succeeded',
      expediente: expediente?.estado ?? null,
    });
  } catch (err) { next(err); }
};