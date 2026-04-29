// src/routes/portal.routes.ts
import { Router } from 'express';
import multer      from 'multer';
import {
  listarTiposTramitePublico,
  consultarDniPublico,
  registrarTramitePublico,
  consultarEstado,
  subirComprobantePago,
  verificarPdfFirmado,
} from '../controllers/portal.controller';
import { verificarTurnstile } from '../middlewares/turnstile.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/tipos-tramite',                  listarTiposTramitePublico);
router.get('/consultar-dni/:dni',             consultarDniPublico);
router.get('/consultar/:codigo',              consultarEstado);
router.get('/verificar/:codigo_verificacion', verificarPdfFirmado);

// Registro con verificación Turnstile server-side
router.post('/registrar',
  verificarTurnstile,
  registrarTramitePublico,
);

// Subir comprobante de pago
router.post('/comprobante/:codigo',
  upload.single('comprobante'),
  subirComprobantePago,
);

export default router;