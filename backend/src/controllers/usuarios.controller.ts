// src/controllers/usuarios.controller.ts
// CRUD de usuarios municipales.
// Solo accesible por el rol ADMIN.

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/error.middleware';

// ----------------------------------------------------------------
// GET /api/usuarios
// Lista todos los usuarios con su rol y área.
// Query params opcionales: ?activo=true|false
// ----------------------------------------------------------------
export const listarUsuarios = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { activo } = req.query;

    const usuarios = await prisma.usuario.findMany({
      where: activo !== undefined
        ? { activo: activo === 'true' }
        : undefined,
      select: {
        id:              true,
        dni:             true,
        nombre_completo: true,
        email:           true,
        activo:          true,
        created_at:      true,
        rol:  { select: { nombre: true } },
        area: { select: { id: true, nombre: true, sigla: true } },
      },
      orderBy: { nombre_completo: 'asc' },
    });

    res.json(usuarios);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/usuarios/:id
// Devuelve un usuario por ID.
// ----------------------------------------------------------------
export const obtenerUsuario = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: {
        id:              true,
        dni:             true,
        nombre_completo: true,
        email:           true,
        activo:          true,
        created_at:      true,
        updated_at:      true,
        rol:  { select: { nombre: true } },
        area: { select: { id: true, nombre: true, sigla: true } },
      },
    });

    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');

    res.json(usuario);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// POST /api/usuarios
// Crea un nuevo usuario municipal.
// Body: { dni, nombre_completo, email, password, rolNombre, areaId? }
// ----------------------------------------------------------------
export const crearUsuario = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { dni, nombre_completo, email, password, rolNombre, areaId } = req.body;

    // Validaciones
    if (!dni || !nombre_completo || !email || !password || !rolNombre) {
      throw new AppError(400, 'Faltan campos requeridos: dni, nombre_completo, email, password, rolNombre.');
    }

    if (dni.length !== 8 || !/^\d+$/.test(dni)) {
      throw new AppError(400, 'El DNI debe tener exactamente 8 dígitos.');
    }

    if (password.length < 6) {
      throw new AppError(400, 'La contraseña debe tener al menos 6 caracteres.');
    }

    // Verificar que el rol existe
    const rol = await prisma.rol.findUnique({ where: { nombre: rolNombre } });
    if (!rol) throw new AppError(400, `Rol inválido: ${rolNombre}.`);

    // Verificar que el área existe si se proporcionó
    if (areaId) {
      const area = await prisma.area.findUnique({ where: { id: Number(areaId) } });
      if (!area) throw new AppError(400, 'El área especificada no existe.');
    }

    // Verificar duplicados
    const existe = await prisma.usuario.findFirst({
      where: { OR: [{ email: email.toLowerCase().trim() }, { dni }] },
    });
    if (existe) {
      throw new AppError(409, 'Ya existe un usuario con ese email o DNI.');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const nuevo = await prisma.usuario.create({
      data: {
        dni,
        nombre_completo: nombre_completo.trim(),
        email:           email.toLowerCase().trim(),
        password_hash,
        rolId:           rol.id,
        areaId:          areaId ? Number(areaId) : null,
      },
      select: {
        id:              true,
        dni:             true,
        nombre_completo: true,
        email:           true,
        activo:          true,
        created_at:      true,
        rol:  { select: { nombre: true } },
        area: { select: { id: true, nombre: true, sigla: true } },
      },
    });

    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// PUT /api/usuarios/:id
// Edita datos de un usuario existente.
// Body: { nombre_completo?, email?, rolNombre?, areaId? }
// ----------------------------------------------------------------
export const editarUsuario = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre_completo, email, rolNombre, areaId } = req.body;

    const usuario = await prisma.usuario.findUnique({ where: { id: Number(id) } });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');

    // No permitir editar el propio rol si es el admin logueado
    if (Number(id) === req.usuario!.id && rolNombre && rolNombre !== 'ADMIN') {
      throw new AppError(400, 'No puedes cambiar tu propio rol de Administrador.');
    }

    let rolId = usuario.rolId;
    if (rolNombre) {
      const rol = await prisma.rol.findUnique({ where: { nombre: rolNombre } });
      if (!rol) throw new AppError(400, `Rol inválido: ${rolNombre}.`);
      rolId = rol.id;
    }

    const actualizado = await prisma.usuario.update({
      where: { id: Number(id) },
      data: {
        ...(nombre_completo && { nombre_completo: nombre_completo.trim() }),
        ...(email           && { email: email.toLowerCase().trim() }),
        rolId,
        ...(areaId !== undefined && { areaId: areaId ? Number(areaId) : null }),
      },
      select: {
        id:              true,
        dni:             true,
        nombre_completo: true,
        email:           true,
        activo:          true,
        updated_at:      true,
        rol:  { select: { nombre: true } },
        area: { select: { id: true, nombre: true, sigla: true } },
      },
    });

    res.json(actualizado);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// PATCH /api/usuarios/:id/desactivar
// Desactiva un usuario (soft delete — no se elimina de la BD).
// El historial de movimientos queda intacto para auditoría.
// ----------------------------------------------------------------
export const desactivarUsuario = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (Number(id) === req.usuario!.id) {
      throw new AppError(400, 'No puedes desactivar tu propia cuenta.');
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: Number(id) } });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');
    if (!usuario.activo) throw new AppError(400, 'El usuario ya está desactivado.');

    await prisma.usuario.update({
      where: { id: Number(id) },
      data:  { activo: false },
    });

    res.json({ message: `Usuario ${usuario.nombre_completo} desactivado correctamente.` });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// PATCH /api/usuarios/:id/activar
// Reactiva un usuario previamente desactivado.
// ----------------------------------------------------------------
export const activarUsuario = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({ where: { id: Number(id) } });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');
    if (usuario.activo) throw new AppError(400, 'El usuario ya está activo.');

    await prisma.usuario.update({
      where: { id: Number(id) },
      data:  { activo: true },
    });

    res.json({ message: `Usuario ${usuario.nombre_completo} activado correctamente.` });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// PATCH /api/usuarios/:id/reset-password
// El Admin resetea la contraseña de cualquier usuario.
// Body: { nueva_password }
// ----------------------------------------------------------------
export const resetPassword = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nueva_password } = req.body;

    if (!nueva_password || nueva_password.length < 6) {
      throw new AppError(400, 'La nueva contraseña debe tener al menos 6 caracteres.');
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: Number(id) } });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado.');

    const password_hash = await bcrypt.hash(nueva_password, 10);

    await prisma.usuario.update({
      where: { id: Number(id) },
      data:  { password_hash },
    });

    res.json({ message: `Contraseña de ${usuario.nombre_completo} actualizada correctamente.` });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/usuarios/areas
// Lista todas las áreas disponibles (para el formulario de creación).
// ----------------------------------------------------------------
export const listarAreas = async (
  _req: Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const areas = await prisma.area.findMany({
      orderBy: { nombre: 'asc' },
    });
    res.json(areas);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/usuarios/roles
// Lista todos los roles disponibles (para el formulario de creación).
// ----------------------------------------------------------------
export const listarRoles = async (
  _req: Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roles = await prisma.rol.findMany({
      orderBy: { nombre: 'asc' },
    });
    res.json(roles);
  } catch (err) {
    next(err);
  }
};