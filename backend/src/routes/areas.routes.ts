// src/routes/areas.routes.ts

import { Router } from 'express';
import {
  bandejaPorArea,
  detalleExpediente,
  tomarExpediente,
  observarExpediente,
  rechazarExpediente,
  darVistoBueno,
  subirPdfFirmado,
  archivarExpediente,
} from '../controllers/areas.controller';
import { autenticar } from '../middlewares/auth.middleware';
import { autorizar }  from '../middlewares/roles.middleware';

const router = Router();

// Autenticación requerida para todas las rutas
router.use(autenticar);

// Bandeja y detalle — Técnico, Jefe y Admin
router.get('/bandeja', autorizar('TECNICO', 'JEFE_AREA', 'ADMIN', 'MESA_DE_PARTES'), bandejaPorArea);
router.get('/expediente/:id', autorizar('TECNICO', 'JEFE_AREA', 'ADMIN', 'MESA_DE_PARTES'), detalleExpediente);


// Acciones del Técnico
router.patch('/tomar/:id',    autorizar('TECNICO', 'ADMIN'),              tomarExpediente);
router.patch('/observar/:id', autorizar('TECNICO', 'ADMIN'),              observarExpediente);
router.patch('/rechazar/:id', autorizar('TECNICO', 'JEFE_AREA', 'ADMIN'), rechazarExpediente);

// Acciones del Jefe de Área
router.patch('/visto-bueno/:id',      autorizar('JEFE_AREA', 'ADMIN'), darVistoBueno);
router.post('/subir-pdf-firmado/:id', autorizar('JEFE_AREA', 'ADMIN'), subirPdfFirmado);
router.patch('/archivar/:id',         autorizar('JEFE_AREA', 'ADMIN'), archivarExpediente);

export default router;