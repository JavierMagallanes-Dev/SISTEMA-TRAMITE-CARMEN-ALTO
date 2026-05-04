// src/routes/mesaPartes.routes.ts
import { Router } from 'express';
import {
  consultarDni,
  listarTiposTramite,
  listarAreasTecnicas,
  registrarExpediente,
  bandejaMDP,
  descargarPdfUnificado,
  solicitarCodigoDerivacion,
  derivarExpediente,
  confirmarDerivacion,
  observarExpedienteMDP,
  reactivarExpediente,
} from '../controllers/mesaPartes.controller';
import { autenticar } from '../middlewares/auth.middleware';
import { autorizar }  from '../middlewares/roles.middleware';

const router = Router();

router.get('/tipos-tramite', listarTiposTramite);

router.use(autenticar, autorizar('MESA_DE_PARTES', 'ADMIN'));

router.get('/consultar-dni/:dni',                    consultarDni);
router.get('/areas',                                 listarAreasTecnicas);
router.get('/bandeja',                               bandejaMDP);
router.get('/expediente/:id/pdf-unificado',          descargarPdfUnificado);

router.post('/registrar',                            registrarExpediente);
router.post('/solicitar-codigo-derivacion',          solicitarCodigoDerivacion);
router.post('/derivar',                              derivarExpediente);
router.post('/confirmar-derivacion',                 confirmarDerivacion);

router.patch('/observar/:id',                        observarExpedienteMDP);
router.patch('/reactivar/:id',                       reactivarExpediente);

export default router;