// src/routes/notificaciones.routes.ts

import { Router } from 'express';
import { getNotificaciones, marcarLeida, marcarTodasLeidas } from '../controllers/notificaciones.controller';
import { autenticar } from '../middlewares/auth.middleware';

const router = Router();

router.use(autenticar);

router.get('/',                    getNotificaciones);
router.patch('/:id/leer',          marcarLeida);
router.patch('/leer-todas',        marcarTodasLeidas);

export default router;