// src/utils/reniec.ts
// Valida un DNI en tiempo real mediante APIperu.dev (RENIEC).
// Si la API no está disponible o el DNI no existe, retorna null.
// El backend NO falla si RENIEC no responde — el usuario puede
// ingresar los datos manualmente en ese caso.

import { env } from '../config/env';

interface DatosReniec {
  nombres:     string;
  apellidoPat: string;
  apellidoMat: string;
}

export const consultarReniec = async (
  dni: string
): Promise<DatosReniec | null> => {
  try {
    // APIperu.dev requiere token en el header
    const res = await fetch(`https://apiperu.dev/api/dni/${dni}`, {
      headers: {
        Authorization: `Bearer ${env.APIPERU_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) return null;

    const data = await res.json() as any;

    if (!data.success || !data.data) return null;

    return {
      nombres:     data.data.nombres,
      apellidoPat: data.data.apellido_paterno,
      apellidoMat: data.data.apellido_materno,
    };
  } catch {
    // Si la API falla, retornamos null — el frontend muestra
    // los campos para ingreso manual
    return null;
  }
};