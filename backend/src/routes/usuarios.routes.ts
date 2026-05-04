// src/routes/usuarios.routes.ts
import { Router } from 'express';
import multer      from 'multer';
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
  subirFirmaPng,
  miPerfil,
  actualizarEmail,
} from '../controllers/usuarios.controller';
import { autenticar }  from '../middlewares/auth.middleware';
import { autorizar }   from '../middlewares/roles.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Perfil propio — cualquier usuario autenticado
router.get('/mi-perfil', autenticar, miPerfil);

// Subir firma PNG — el propio usuario o Admin
router.post(
  '/:id/firma',
  autenticar,
  upload.single('firma'),
  subirFirmaPng,
);

// Actualizar email propio — cualquier usuario autenticado
router.patch('/:id/email', autenticar, actualizarEmail);

// Rutas de Admin
router.use(autenticar, autorizar('ADMIN'));

router.get('/areas', listarAreas);
router.get('/roles', listarRoles);
router.get('/',      listarUsuarios);
router.get('/:id',   obtenerUsuario);
router.post('/',     crearUsuario);
router.put('/:id',   editarUsuario);

router.patch('/:id/desactivar',     desactivarUsuario);
router.patch('/:id/activar',        activarUsuario);
router.patch('/:id/reset-password', resetPassword);

export default router;