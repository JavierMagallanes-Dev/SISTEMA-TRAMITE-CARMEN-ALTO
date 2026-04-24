// src/routes/recepcion.routes.ts

import { Router }                                    from 'express';
import { descargarCargo, descargarCargoPorCodigo }   from '../controllers/recepcion.controller';
import { autenticar }                                from '../middlewares/auth.middleware';
import { autorizar }                                 from '../middlewares/roles.middleware';

const router = Router();

// ── Pública — ciudadano descarga por código ──────────────────
router.get('/cargo/publico/:codigo', descargarCargoPorCodigo);

// ── Privada — Mesa de Partes descarga por ID ─────────────────
router.get(
  '/cargo/:expedienteId',
  autenticar,
  autorizar('MESA_DE_PARTES', 'ADMIN'),
  descargarCargo
);

export default router;