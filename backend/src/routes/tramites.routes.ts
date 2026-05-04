// src/routes/tramites.routes.ts
import { Router } from 'express';
import {
  listarTramites, crearTramite, editarTramite, toggleTramite,
  listarRequisitos, crearRequisito, editarRequisito, eliminarRequisito,
} from '../controllers/tramites.controller';
import { autenticar } from '../middlewares/auth.middleware';
import { autorizar }  from '../middlewares/roles.middleware';

const router = Router();

router.use(autenticar, autorizar('ADMIN'));

router.get('/',                        listarTramites);
router.post('/',                       crearTramite);
router.put('/:id',                     editarTramite);
router.patch('/:id/toggle',            toggleTramite);

router.get('/:id/requisitos',          listarRequisitos);
router.post('/:id/requisitos',         crearRequisito);
router.put('/requisitos/:reqId',       editarRequisito);
router.delete('/requisitos/:reqId',    eliminarRequisito);

export default router;