// src/routes/documentos.routes.ts

import { Router }    from 'express';
import multer        from 'multer';
import {
  subirDocumento,
  listarDocumentos,
  subirPdfFirmado,
} from '../controllers/documentos.controller';
import { autenticar } from '../middlewares/auth.middleware';
import { autorizar }  from '../middlewares/roles.middleware';

const router = Router();

// Multer en memoria — el archivo va directo a Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos PDF.'));
    }
  },
});

// ── Subir documento (ciudadano vía portal — sin auth) ──────────
router.post(
  '/subir/:expedienteId',
  upload.single('archivo'),
  subirDocumento
);

// ── Listar documentos de un expediente ────────────────────────
router.get(
  '/expediente/:expedienteId',
  autenticar,
  listarDocumentos
);

// ── Subir PDF firmado (solo Jefe de Área) ──────────────────────
router.post(
  '/subir-firmado/:expedienteId',
  autenticar,
  autorizar('JEFE_AREA', 'ADMIN'),
  upload.single('archivo'),
  subirPdfFirmado
);

export default router;