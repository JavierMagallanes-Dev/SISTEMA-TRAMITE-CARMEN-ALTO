// src/routes/areas.routes.ts
import { Router } from 'express';
import {
  bandejaPorArea,
  detalleExpediente,
  descargarPdfUnificadoArea,
  tomarExpediente,
  observarExpediente,
  rechazarExpediente,
  darVistoBueno,
  archivarExpediente,
  historialExpedientes,
  reactivarExpediente,
  solicitarCodigoFirma,
  firmarExpediente,
  firmarExpedienteTecnico, // 1. Importar la nueva función
} from '../controllers/areas.controller';
import { autenticar } from '../middlewares/auth.middleware';
import { autorizar }  from '../middlewares/roles.middleware';

const router = Router();

router.use(autenticar, autorizar('TECNICO', 'JEFE_AREA', 'ADMIN', 'MESA_DE_PARTES'));

router.get('/bandeja',                        bandejaPorArea);
router.get('/historial',                      historialExpedientes);
router.get('/expediente/:id',                 detalleExpediente);
router.get('/expediente/:id/pdf-unificado',   descargarPdfUnificadoArea);

router.patch('/tomar/:id',                    tomarExpediente);
router.patch('/observar/:id',                 observarExpediente);
router.patch('/rechazar/:id',                 rechazarExpediente);
router.patch('/visto-bueno/:id',              darVistoBueno);
router.patch('/archivar/:id',                 archivarExpediente);
router.patch('/reactivar/:id',                reactivarExpediente);

// Firma digital con imagen PNG + código por email (Jefe)
router.post('/solicitar-codigo-firma/:id',    solicitarCodigoFirma);
router.post('/firmar/:id',                    firmarExpediente);

// 2. Nueva ruta para la firma del Técnico (Sin código de aprobación)
router.post('/firmar-tecnico/:id',            firmarExpedienteTecnico);

export default router;