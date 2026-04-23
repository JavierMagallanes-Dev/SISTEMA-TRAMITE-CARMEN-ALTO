// src/routes/mesaPartes.routes.ts

import { Router } from 'express';
import {
  consultarDni,
  listarTiposTramite,
  listarAreasTecnicas,
  registrarExpediente,
  bandejaMDP,
  derivarExpediente,
  confirmarDerivacion,
} from '../controllers/mesaPartes.controller';
import { autenticar } from '../middlewares/auth.middleware';
import { autorizar }  from '../middlewares/roles.middleware';

const router = Router();

// Catálogos públicos para el formulario de registro del portal ciudadano
router.get('/tipos-tramite', listarTiposTramite);

// Rutas protegidas — Mesa de Partes y Admin
router.use(autenticar, autorizar('MESA_DE_PARTES', 'ADMIN'));

router.get('/consultar-dni/:dni',  consultarDni);
router.get('/areas',               listarAreasTecnicas);
router.get('/bandeja',             bandejaMDP);
router.post('/registrar',          registrarExpediente);
router.post('/derivar',            derivarExpediente);
router.post('/confirmar-derivacion', confirmarDerivacion);

export default router;