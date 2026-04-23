// src/routes/auth.routes.ts

import { Router } from 'express';
import { login, perfil, cambiarPassword } from '../controllers/auth.controller';
import { autenticar } from '../middlewares/auth.middleware';

const router = Router();

// Pública — no requiere token
router.post('/login', login);

// Protegidas — requiere token válido
router.get('/perfil',           autenticar, perfil);
router.put('/cambiar-password', autenticar, cambiarPassword);

export default router;