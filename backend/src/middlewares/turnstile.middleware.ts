// src/middlewares/turnstile.middleware.ts
// Verifica el token de Cloudflare Turnstile en el servidor.
// NUNCA confiar solo en el frontend — la verificación real es aquí.

import { Request, Response, NextFunction } from 'express';

const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY ?? '';
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const verificarTurnstile = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  // En desarrollo sin key configurada, pasar directo
  if (!SECRET_KEY || process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Turnstile: sin SECRET_KEY — verificación omitida en desarrollo.');
    return next();
  }

  const token = req.body['cf-turnstile-response'] as string | undefined;

  if (!token) {
    res.status(400).json({ error: 'Verificación de seguridad requerida.' });
    return;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret',   SECRET_KEY);
    formData.append('response', token);
    formData.append('remoteip', req.ip ?? '');

    const resp = await fetch(VERIFY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    formData.toString(),
    });

    const data = await resp.json() as { success: boolean; 'error-codes'?: string[] };

    if (!data.success) {
      console.warn('❌ Turnstile inválido:', data['error-codes']);
      res.status(400).json({ error: 'Verificación de seguridad fallida. Intenta nuevamente.' });
      return;
    }

    console.log('✅ Turnstile verificado correctamente');
    next();
  } catch (err) {
    console.error('❌ Error al verificar Turnstile:', err);
    // En caso de error de red con Cloudflare, dejar pasar (no bloquear al ciudadano)
    next();
  }
};