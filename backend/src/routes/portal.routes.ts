// src/routes/portal.routes.ts
// Rutas públicas — sin autenticación.

import { Router } from 'express';
import {
  listarTiposTramitePublico,
  consultarDniPublico,
  registrarTramitePublico,
  consultarEstado,
  verificarPdfFirmado,
} from '../controllers/portal.controller';

const router = Router();

// Todas públicas — sin middleware de autenticación
router.get('/tipos-tramite',           listarTiposTramitePublico);
router.get('/consultar-dni/:dni',      consultarDniPublico);
router.post('/registrar',              registrarTramitePublico);
router.get('/consultar/:codigo',       consultarEstado);
router.get('/verificar/:codigo_verificacion', verificarPdfFirmado);

export default router;