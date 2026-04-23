// src/services/storage.service.ts
// Maneja la subida y eliminación de archivos en Supabase Storage.
// Usa la service_role key para bypassear RLS.

import { createClient } from '@supabase/supabase-js';
import { env }          from '../config/env';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

const BUCKET = 'documentos';

export const storageService = {
  // Sube un archivo y retorna la URL pública
  subirArchivo: async (
    buffer:   Buffer,
    mimetype: string,
    carpeta:  string  // ej: 'expedientes' | 'firmados'
  ): Promise<string> => {
    const extension = mimetype === 'application/pdf' ? 'pdf' : 'bin';
    const nombre    = `${carpeta}/${uuidv4()}.${extension}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(nombre, buffer, {
        contentType:  mimetype,
        cacheControl: '3600',
        upsert:       false,
      });

    if (error) throw new Error(`Error al subir archivo: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(nombre);
    return data.publicUrl;
  },

  // Elimina un archivo por su URL pública
  eliminarArchivo: async (url: string): Promise<void> => {
    // Extraer el path del archivo desde la URL pública
    const path = url.split(`${BUCKET}/`)[1];
    if (!path) return;

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([path]);

    if (error) throw new Error(`Error al eliminar archivo: ${error.message}`);
  },
};