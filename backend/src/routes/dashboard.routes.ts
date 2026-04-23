// src/routes/dashboard.routes.ts

import { Router }       from 'express';
import { getDashboard } from '../controllers/dashboard.controller';
import { autenticar }   from '../middlewares/auth.middleware';

const router = Router();

router.use(autenticar);
router.get('/', getDashboard);

export default router;