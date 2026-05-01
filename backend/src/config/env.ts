const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'STRIPE_SECRET_KEY',
  'APIPERU_TOKEN',
  'FRONTEND_URL',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`❌ Variable de entorno requerida no encontrada: ${envVar}`);
  }
}

export const env = {
  // Servidor
  PORT:         parseInt(process.env.PORT ?? '3000', 10),
  NODE_ENV:     process.env.NODE_ENV ?? 'development',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',

  // Base de datos
  DATABASE_URL: process.env.DATABASE_URL!,
  DIRECT_URL:   process.env.DIRECT_URL!,

  // JWT
  JWT_SECRET:     process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '8h',

  // Servicios externos (opcionales por ahora)
  RESEND_API_KEY:       process.env.RESEND_API_KEY!,
  STRIPE_SECRET_KEY:    process.env.STRIPE_SECRET_KEY!,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY ?? '',
  APIPERU_TOKEN: process.env.APIPERU_TOKEN ?? '',
  // Supabase Storage
  SUPABASE_URL:      process.env.SUPABASE_URL ?? '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ?? '',

  // Helpers
  isDev:  process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const;