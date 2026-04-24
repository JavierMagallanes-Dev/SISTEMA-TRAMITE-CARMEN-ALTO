// src/index.ts

import dotenv from 'dotenv';
dotenv.config();

import express    from 'express';
import cors       from 'cors';
import { env }    from './config/env';
import { prisma } from './config/prisma';

// ── Rutas ────────────────────────────────────────────────────────
import authRoutes       from './routes/auth.routes';
import usuariosRoutes   from './routes/usuarios.routes';
import cajeroRoutes     from './routes/cajero.routes';
import mesaPartesRoutes from './routes/mesaPartes.routes';
import areasRoutes      from './routes/areas.routes';
import portalRoutes     from './routes/portal.routes';
import auditoriaRoutes  from './routes/auditoria.routes';
import documentosRoutes from './routes/documentos.routes';
// ── Middleware de error ──────────────────────────────────────────
import { errorHandler } from './middlewares/error.middleware';
import dashboardRoutes from './routes/dashboard.routes';
import recepcionRoutes from './routes/recepcion.routes';
import reportesRoutes from './routes/reportes.routes';


const app = express();

// ── Middlewares globales ─────────────────────────────────────────
app.use(cors({
  origin:      env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    message: 'API - Sistema de Trámite Documentario | Municipalidad Carmen Alto',
    version: '1.0.0',
    status:  'ok',
    env:     env.NODE_ENV,
  });
});

// ── Registro de rutas ────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/usuarios',    usuariosRoutes);
app.use('/api/cajero',      cajeroRoutes);
app.use('/api/mesa-partes', mesaPartesRoutes);
app.use('/api/areas',       areasRoutes);
app.use('/api/portal',      portalRoutes);
app.use('/api/auditoria',   auditoriaRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/recepcion', recepcionRoutes);
app.use('/api/reportes', reportesRoutes);
// ── Ruta no encontrada ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ── Manejo centralizado de errores ───────────────────────────────
app.use(errorHandler);

// ── Iniciar servidor ─────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${env.PORT}`);
  console.log(`📦 Entorno: ${env.NODE_ENV}`);
  console.log(`🗄️  Base de datos: Supabase (PostgreSQL)\n`);
});

// ── Cierre limpio ────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n⏹  Cerrando servidor...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente.');
    process.exit(0);
  });
});

export default app;