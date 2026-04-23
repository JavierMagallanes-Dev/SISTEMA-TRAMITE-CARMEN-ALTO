// src/types/index.ts

export type NombreRol =
  | 'ADMIN'
  | 'MESA_DE_PARTES'
  | 'CAJERO'
  | 'TECNICO'
  | 'JEFE_AREA';

export type EstadoExpediente =
  | 'PENDIENTE_PAGO'
  | 'RECIBIDO'
  | 'EN_REVISION_MDP'
  | 'DERIVADO'
  | 'EN_PROCESO'
  | 'LISTO_DESCARGA'
  | 'PDF_FIRMADO'
  | 'RESUELTO'
  | 'OBSERVADO'
  | 'RECHAZADO'
  | 'ARCHIVADO';

export interface Usuario {
  id:              number;
  dni:             string;
  nombre_completo: string;
  email:           string;
  activo:          boolean;
  rol:             { nombre: NombreRol };
  area:            { id: number; nombre: string; sigla: string } | null;
}

export interface Ciudadano {
  id:           number;
  dni:          string;
  nombres:      string;
  apellido_pat: string;
  apellido_mat: string;
  email:        string;
  telefono:     string | null;
}

export interface TipoTramite {
  id:          number;
  nombre:      string;
  descripcion: string | null;
  plazo_dias:  number;
  costo_soles: number;
  activo:      boolean;
}

export interface Pago {
  boleta:        string;
  monto_cobrado: number;
  fecha_pago:    string;
}

export interface Movimiento {
  tipo_accion:      string;
  estado_resultado: EstadoExpediente;
  comentario:       string | null;
  fecha_hora:       string;
  usuario: {
    nombre_completo: string;
    rol: { nombre: NombreRol };
  };
}

export interface Expediente {
  id:                       number;
  codigo:                   string;
  estado:                   EstadoExpediente;
  fecha_registro:           string;
  fecha_limite:             string;
  fecha_resolucion:         string | null;
  url_pdf_firmado:          string | null;
  codigo_verificacion_firma: string | null;
  fecha_firma:              string | null;
  ciudadano:                Ciudadano;
  tipoTramite:              TipoTramite;
  areaActual:               { id: number; nombre: string; sigla: string } | null;
  pagos?:                   Pago[];
  movimientos?:             Movimiento[];
}

export interface AuthResponse {
  token:   string;
  usuario: Usuario;
}

export interface Area {
  id:     number;
  nombre: string;
  sigla:  string;
}