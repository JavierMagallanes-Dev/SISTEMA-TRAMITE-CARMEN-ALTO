// src/routes/reportes.routes.ts

import { Router }        from 'express';
import { exportarExcel, exportarPdf, getDatosReporte } from '../controllers/reportes.controller';
import { autenticar }    from '../middlewares/auth.middleware';
import { autorizar }     from '../middlewares/roles.middleware';

const router = Router();

router.use(autenticar, autorizar('ADMIN', 'MESA_DE_PARTES', 'JEFE_AREA'));

router.get('/datos',  getDatosReporte);
router.get('/excel',  exportarExcel);
router.get('/pdf',    exportarPdf);

export default router;