// src/routes/auditoria.routes.ts

import { Router } from 'express';
import {
  listarAuditoria,
  auditoriaExpediente,
  resumenAuditoria,
} from '../controllers/auditoria.controller';
import { autenticar } from '../middlewares/auth.middleware';
import { autorizar }  from '../middlewares/roles.middleware';

const router = Router();

router.use(autenticar, autorizar('ADMIN'));

router.get('/',                  listarAuditoria);
router.get('/resumen',           resumenAuditoria);
router.get('/expediente/:id',    auditoriaExpediente);

export default router;