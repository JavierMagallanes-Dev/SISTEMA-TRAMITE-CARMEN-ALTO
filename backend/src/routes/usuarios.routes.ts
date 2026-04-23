// src/routes/usuarios.routes.ts
// Todas las rutas requieren: autenticado + rol ADMIN

import { Router } from 'express';
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  editarUsuario,
  desactivarUsuario,
  activarUsuario,
  resetPassword,
  listarAreas,
  listarRoles,
} from '../controllers/usuarios.controller';
import { autenticar }  from '../middlewares/auth.middleware';
import { autorizar }   from '../middlewares/roles.middleware';

const router = Router();

// Aplicar autenticación y rol ADMIN a todas las rutas
router.use(autenticar, autorizar('ADMIN'));

// Catálogos
router.get('/areas', listarAreas);
router.get('/roles', listarRoles);

// CRUD usuarios
router.get('/',    listarUsuarios);
router.get('/:id', obtenerUsuario);
router.post('/',   crearUsuario);
router.put('/:id', editarUsuario);

// Acciones sobre el estado del usuario
router.patch('/:id/desactivar',    desactivarUsuario);
router.patch('/:id/activar',       activarUsuario);
router.patch('/:id/reset-password', resetPassword);

export default router;