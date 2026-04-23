// src/controllers/auth.controller.ts
// Maneja el login del personal municipal y la consulta del perfil.
// El ciudadano NO se autentica — accede al portal público sin login.

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { generarToken } from '../utils/jwt';
import { AppError } from '../middlewares/error.middleware';

// ----------------------------------------------------------------
// POST /api/auth/login
// Body: { email, password }
// Responde con el token JWT y los datos básicos del usuario.
// ----------------------------------------------------------------
export const login = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validación básica de campos
    if (!email || !password) {
      throw new AppError(400, 'Email y contraseña son requeridos.');
    }

    // Buscar usuario con su rol
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        rol:  { select: { nombre: true } },
        area: { select: { id: true, nombre: true, sigla: true } },
      },
    });

    // Usuario no existe o está inactivo
    if (!usuario) {
      throw new AppError(401, 'Credenciales incorrectas.');
    }

    if (!usuario.activo) {
      throw new AppError(401, 'Tu cuenta está desactivada. Contacta al administrador.');
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      throw new AppError(401, 'Credenciales incorrectas.');
    }

    // Generar token JWT
    const token = generarToken({
      id:     usuario.id,
      email:  usuario.email,
      rol:    usuario.rol.nombre,
      areaId: usuario.areaId,
    });

    res.json({
      token,
      usuario: {
        id:              usuario.id,
        nombre_completo: usuario.nombre_completo,
        email:           usuario.email,
        dni:             usuario.dni,
        rol: { nombre: usuario.rol.nombre },  // ← devuelve { nombre: "CAJERO" }
        area:            usuario.area ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// GET /api/auth/perfil
// Requiere: autenticar (middleware)
// Devuelve los datos completos del usuario autenticado.
// ----------------------------------------------------------------
export const perfil = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario!.id },
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

    if (!usuario) {
      throw new AppError(404, 'Usuario no encontrado.');
    }

    res.json(usuario);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------
// POST /api/auth/cambiar-password
// Requiere: autenticar (middleware)
// Body: { password_actual, password_nuevo }
// ----------------------------------------------------------------
export const cambiarPassword = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { password_actual, password_nuevo } = req.body;

    if (!password_actual || !password_nuevo) {
      throw new AppError(400, 'Debes proporcionar la contraseña actual y la nueva.');
    }

    if (password_nuevo.length < 8) {
      throw new AppError(400, 'La nueva contraseña debe tener al menos 8 caracteres.');
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario!.id },
    });

    if (!usuario) {
      throw new AppError(404, 'Usuario no encontrado.');
    }

    const passwordValida = await bcrypt.compare(password_actual, usuario.password_hash);
    if (!passwordValida) {
      throw new AppError(401, 'La contraseña actual es incorrecta.');
    }

    const nuevoHash = await bcrypt.hash(password_nuevo, 12);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data:  { password_hash: nuevoHash },
    });

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    next(err);
  }
};