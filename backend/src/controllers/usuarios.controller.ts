// src/controllers/usuarios.controller.ts
// CRUD de usuarios municipales + PIN de derivación + CRUD de áreas.

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma }         from '../config/prisma';
import { AppError }       from '../middlewares/error.middleware';
import { storageService } from '../services/storage.service';

// ── GET /api/usuarios ────────────────────────────────────────
export const listarUsuarios = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { activo } = req.query;
    const usuarios = await prisma.usuario.findMany({
      where: activo !== undefined ? { activo: activo === 'true' } : undefined,
      select: {
        id: true, dni: true, nombre_completo: true, email: true,
        activo: true, created_at: true, url_firma_png: true,
        rol:  { select: { nombre: true } },
        area: { select: { id: true, nombre: true, sigla: true } },
      },
      orderBy: { nombre_completo: 'asc' },
    });
    res.json(usuarios);
  } catch (err) { next(err); }
};

// ── GET /api/usuarios/:id ────────────────────────────────────
export const obtenerUsuario = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(req.params['id']) },
      select: {
        id: true, dni: true, nombre_completo: true, email: true,
        activo: true, created_at: true, updated_at: true, url_firma_png: true,
        rol:  { select: { nombre: true } },
        area: { select: { id: true, nombre: true, sigla: true } },
      },
    });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');
    res.json(usuario);
  } catch (err) { next(err); }
};

// ── POST /api/usuarios ───────────────────────────────────────
export const crearUsuario = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { dni, nombre_completo, email, password, rolNombre, areaId, pin_derivacion } = req.body;

    if (!dni || !nombre_completo || !email || !password || !rolNombre)
      throw new AppError(400, 'Faltan campos requeridos: dni, nombre_completo, email, password, rolNombre.');
    if (dni.length !== 8 || !/^\d+$/.test(dni))
      throw new AppError(400, 'El DNI debe tener exactamente 8 dígitos.');
    if (password.length < 6)
      throw new AppError(400, 'La contraseña debe tener al menos 6 caracteres.');

    // Validar PIN si se proporciona
    if (pin_derivacion && !/^\d{4,6}$/.test(pin_derivacion))
      throw new AppError(400, 'El PIN de derivación debe tener entre 4 y 6 dígitos.');

    const rol = await prisma.rol.findUnique({ where: { nombre: rolNombre } });
    if (!rol) throw new AppError(400, `Rol inválido: ${rolNombre}.`);

    if (areaId) {
      const area = await prisma.area.findUnique({ where: { id: Number(areaId) } });
      if (!area) throw new AppError(400, 'El área especificada no existe.');
    }

    const existe = await prisma.usuario.findFirst({
      where: { OR: [{ email: email.toLowerCase().trim() }, { dni }] },
    });
    if (existe) throw new AppError(409, 'Ya existe un usuario con ese email o DNI.');

    const password_hash = await bcrypt.hash(password, 10);

    const nuevo = await prisma.usuario.create({
      data: {
        dni,
        nombre_completo: nombre_completo.trim(),
        email:           email.toLowerCase().trim(),
        password_hash,
        rolId:           rol.id,
        areaId:          areaId ? Number(areaId) : null,
        pin_derivacion:  pin_derivacion?.trim() || null,
      },
      select: {
        id: true, dni: true, nombre_completo: true, email: true,
        activo: true, created_at: true,
        rol:  { select: { nombre: true } },
        area: { select: { id: true, nombre: true, sigla: true } },
      },
    });

    res.status(201).json(nuevo);
  } catch (err) { next(err); }
};

// ── PUT /api/usuarios/:id ────────────────────────────────────
export const editarUsuario = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { nombre_completo, email, rolNombre, areaId, pin_derivacion } = req.body;
    const id = Number(req.params['id']);

    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');

    if (id === req.usuario!.id && rolNombre && rolNombre !== 'ADMIN')
      throw new AppError(400, 'No puedes cambiar tu propio rol de Administrador.');

    // Validar PIN si se proporciona
    if (pin_derivacion && !/^\d{4,6}$/.test(pin_derivacion))
      throw new AppError(400, 'El PIN de derivación debe tener entre 4 y 6 dígitos.');

    let rolId = usuario.rolId;
    if (rolNombre) {
      const rol = await prisma.rol.findUnique({ where: { nombre: rolNombre } });
      if (!rol) throw new AppError(400, `Rol inválido: ${rolNombre}.`);
      rolId = rol.id;
    }

    const actualizado = await prisma.usuario.update({
      where: { id },
      data: {
        ...(nombre_completo && { nombre_completo: nombre_completo.trim() }),
        ...(email           && { email: email.toLowerCase().trim() }),
        rolId,
        ...(areaId !== undefined && { areaId: areaId ? Number(areaId) : null }),
        ...(pin_derivacion !== undefined && { pin_derivacion: pin_derivacion?.trim() || null }),
      },
      select: {
        id: true, dni: true, nombre_completo: true, email: true,
        activo: true, updated_at: true,
        rol:  { select: { nombre: true } },
        area: { select: { id: true, nombre: true, sigla: true } },
      },
    });

    res.json(actualizado);
  } catch (err) { next(err); }
};

// ── PATCH /api/usuarios/:id/desactivar ───────────────────────
export const desactivarUsuario = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    if (id === req.usuario!.id) throw new AppError(400, 'No puedes desactivar tu propia cuenta.');
    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');
    if (!usuario.activo) throw new AppError(400, 'El usuario ya está desactivado.');
    await prisma.usuario.update({ where: { id }, data: { activo: false } });
    res.json({ message: `Usuario ${usuario.nombre_completo} desactivado correctamente.` });
  } catch (err) { next(err); }
};

// ── PATCH /api/usuarios/:id/activar ─────────────────────────
export const activarUsuario = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id      = Number(req.params['id']);
    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');
    if (usuario.activo) throw new AppError(400, 'El usuario ya está activo.');
    await prisma.usuario.update({ where: { id }, data: { activo: true } });
    res.json({ message: `Usuario ${usuario.nombre_completo} activado correctamente.` });
  } catch (err) { next(err); }
};

// ── PATCH /api/usuarios/:id/reset-password ───────────────────
export const resetPassword = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { nueva_password } = req.body;
    if (!nueva_password || nueva_password.length < 6)
      throw new AppError(400, 'La nueva contraseña debe tener al menos 6 caracteres.');
    const usuario = await prisma.usuario.findUnique({ where: { id: Number(req.params['id']) } });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');
    const password_hash = await bcrypt.hash(nueva_password, 10);
    await prisma.usuario.update({ where: { id: Number(req.params['id']) }, data: { password_hash } });
    res.json({ message: `Contraseña de ${usuario.nombre_completo} actualizada correctamente.` });
  } catch (err) { next(err); }
};

// ── POST /api/usuarios/:id/firma ─────────────────────────────
export const subirFirmaPng = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id   = Number(req.params['id']);
    const file = req.file;

    if (id !== req.usuario!.id && req.usuario!.rol !== 'ADMIN')
      throw new AppError(403, 'Solo puedes subir tu propia firma.');
    if (!file) throw new AppError(400, 'No se recibió ningún archivo.');

    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp'];
    if (!tiposPermitidos.includes(file.mimetype))
      throw new AppError(400, 'Solo se aceptan imágenes PNG, JPG o WebP.');
    if (file.size > 2 * 1024 * 1024)
      throw new AppError(400, 'La imagen de firma no puede superar 2MB.');

    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');

    const url = await storageService.subirArchivo(file.buffer, file.mimetype, 'firmas');
    await prisma.usuario.update({ where: { id }, data: { url_firma_png: url } });

    res.json({ message: 'Firma subida correctamente.', url_firma_png: url });
  } catch (err) { next(err); }
};

// ── PATCH /api/usuarios/:id/email ────────────────────────────
export const actualizarEmail = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id    = Number(req.params['id']);
    const { email } = req.body as { email: string };

    if (id !== req.usuario!.id && req.usuario!.rol !== 'ADMIN')
      throw new AppError(403, 'Solo puedes actualizar tu propio email.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new AppError(400, 'Email inválido.');

    const existe = await prisma.usuario.findFirst({
      where: { email: email.toLowerCase().trim(), NOT: { id } },
    });
    if (existe) throw new AppError(409, 'Ese email ya está en uso.');

    await prisma.usuario.update({
      where: { id },
      data:  { email: email.toLowerCase().trim() },
    });

    res.json({ message: 'Email actualizado correctamente.', email: email.toLowerCase().trim() });
  } catch (err) { next(err); }
};

// ── GET /api/usuarios/mi-perfil ──────────────────────────────
export const miPerfil = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = req.usuario!.id;
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true, dni: true, nombre_completo: true, email: true,
        activo: true, url_firma_png: true,
        rol:  { select: { nombre: true } },
        area: { select: { id: true, nombre: true, sigla: true } },
      },
    });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');
    res.json(usuario);
  } catch (err) { next(err); }
};

// ── GET /api/usuarios/areas ──────────────────────────────────
export const listarAreas = async (
  _req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const areas = await prisma.area.findMany({ orderBy: { nombre: 'asc' } });
    res.json(areas);
  } catch (err) { next(err); }
};

// ── GET /api/usuarios/roles ──────────────────────────────────
export const listarRoles = async (
  _req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const roles = await prisma.rol.findMany({ orderBy: { nombre: 'asc' } });
    res.json(roles);
  } catch (err) { next(err); }
};

// ── POST /api/usuarios/areas ─────────────────────────────────
export const crearArea = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { nombre, sigla } = req.body as { nombre: string; sigla: string };
    if (!nombre?.trim()) throw new AppError(400, 'El nombre del área es obligatorio.');
    if (!sigla?.trim())  throw new AppError(400, 'La sigla del área es obligatoria.');

    const existe = await prisma.area.findFirst({
      where: { OR: [{ nombre: nombre.trim() }, { sigla: sigla.trim().toUpperCase() }] },
    });
    if (existe) throw new AppError(409, 'Ya existe un área con ese nombre o sigla.');

    const area = await prisma.area.create({
      data: { nombre: nombre.trim(), sigla: sigla.trim().toUpperCase() },
    });
    res.status(201).json(area);
  } catch (err) { next(err); }
};

// ── PUT /api/usuarios/areas/:id ──────────────────────────────
export const editarArea = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);
    const { nombre, sigla, activo } = req.body as { nombre?: string; sigla?: string; activo?: boolean };

    const area = await prisma.area.findUnique({ where: { id } });
    if (!area) throw new AppError(404, 'Área no encontrada.');

    const actualizada = await prisma.area.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(sigla  !== undefined && { sigla:  sigla.trim().toUpperCase() }),
        ...(activo !== undefined && { activo }),
      },
    });
    res.json(actualizada);
  } catch (err) { next(err); }
};

// ── DELETE /api/usuarios/areas/:id ──────────────────────────
export const eliminarArea = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params['id']);

    // Verificar que no tenga usuarios asignados
    const usuariosEnArea = await prisma.usuario.count({ where: { areaId: id } });
    if (usuariosEnArea > 0)
      throw new AppError(400, `No se puede eliminar: hay ${usuariosEnArea} usuario(s) asignado(s) a esta área.`);

    await prisma.area.delete({ where: { id } });
    res.json({ message: 'Área eliminada correctamente.' });
  } catch (err) { next(err); }
};