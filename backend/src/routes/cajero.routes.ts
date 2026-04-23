// src/routes/cajero.routes.ts

import { Router } from 'express';
import {
  listarPendientesPago,
  verificarPago,
  anularPago,
  historialPagos,
  resumenHoy,
} from '../controllers/cajero.controller';
import { autenticar } from '../middlewares/auth.middleware';
import { autorizar }  from '../middlewares/roles.middleware';

const router = Router();

// Solo CAJERO y ADMIN acceden a este módulo
router.use(autenticar, autorizar('CAJERO', 'ADMIN'));

router.get('/pendientes',    listarPendientesPago);
router.get('/historial',     historialPagos);
router.get('/resumen-hoy',   resumenHoy);
router.post('/verificar-pago', verificarPago);
router.post('/anular-pago',    anularPago);

export default router;