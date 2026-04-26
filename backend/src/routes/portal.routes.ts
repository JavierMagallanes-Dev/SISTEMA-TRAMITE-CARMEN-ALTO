// src/routes/portal.routes.ts
// Rutas públicas — sin autenticación.

import { Router }  from 'express';
import multer      from 'multer';
import {
  listarTiposTramitePublico,
  consultarDniPublico,
  registrarTramitePublico,
  consultarEstado,
  subirComprobantePago,
  verificarPdfFirmado,
} from '../controllers/portal.controller';

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Todas públicas — sin middleware de autenticación
router.get('/tipos-tramite',                    listarTiposTramitePublico);
router.get('/consultar-dni/:dni',               consultarDniPublico);
router.post('/registrar',                       registrarTramitePublico);
router.get('/consultar/:codigo',                consultarEstado);
router.post('/comprobante/:codigo',             upload.single('comprobante'), subirComprobantePago);
router.get('/verificar/:codigo_verificacion',   verificarPdfFirmado);

export default router;