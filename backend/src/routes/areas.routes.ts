import { Router } from 'express';
import {
  bandejaPorArea, detalleExpediente, descargarPdfUnificadoArea,
  tomarExpediente, observarExpediente, rechazarExpediente,
  darVistoBueno, archivarExpediente, historialExpedientes,
  reactivarExpediente, solicitarCodigoFirma, firmarExpediente,
  firmarExpedienteTecnico, reemplazarPdfUnificado,
} from '../controllers/areas.controller';
import { autenticar } from '../middlewares/auth.middleware';
import { autorizar }  from '../middlewares/roles.middleware';
import multer         from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

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

router.post('/solicitar-codigo-firma/:id',    solicitarCodigoFirma);
router.post('/firmar/:id',                    firmarExpediente);
router.post('/firmar-tecnico/:id',            firmarExpedienteTecnico);
router.post('/expediente/:id/reemplazar-pdf', upload.single('archivo'), reemplazarPdfUnificado);

export default router;