// src/routes/usuarios.routes.ts
import { Router } from 'express';
import multer      from 'multer';
import {
  listarUsuarios, obtenerUsuario, crearUsuario, editarUsuario,
  desactivarUsuario, activarUsuario, resetPassword,
  listarAreas, listarRoles, subirFirmaPng, miPerfil, actualizarEmail,
  crearArea, editarArea, eliminarArea,
} from '../controllers/usuarios.controller';
import { autenticar } from '../middlewares/auth.middleware';
import { autorizar }  from '../middlewares/roles.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Rutas sin restricción de Admin
router.get('/mi-perfil',          autenticar, miPerfil);
router.post('/:id/firma',         autenticar, upload.single('firma'), subirFirmaPng);
router.patch('/:id/email',        autenticar, actualizarEmail);

// Rutas de Admin
router.use(autenticar, autorizar('ADMIN'));

router.get('/areas',              listarAreas);
router.get('/roles',              listarRoles);
router.post('/areas',             crearArea);
router.put('/areas/:id',          editarArea);
router.delete('/areas/:id',       eliminarArea);

router.get('/',                   listarUsuarios);
router.get('/:id',                obtenerUsuario);
router.post('/',                  crearUsuario);
router.put('/:id',                editarUsuario);
router.patch('/:id/desactivar',   desactivarUsuario);
router.patch('/:id/activar',      activarUsuario);
router.patch('/:id/reset-password', resetPassword);

export default router;