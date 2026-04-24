// src/services/email.service.ts
// Notificaciones automáticas por email al ciudadano.

import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

const FROM = 'Municipalidad Carmen Alto <noreply@municipalidadcarmenalto.site>';
const SISTEMA = 'Sistema de Trámite Documentario';

// ── Helpers ──────────────────────────────────────────────────
const formatFecha = (d: Date) =>
  new Date(d).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

const baseHtml = (titulo: string, contenido: string) => `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1e40af;padding:28px 40px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;">Municipalidad Distrital de Carmen Alto</p>
            <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">${SISTEMA}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 0;text-align:center;">
            <p style="margin:0;color:#1e40af;font-size:20px;font-weight:bold;">${titulo}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 32px;">
            ${contenido}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Este correo fue enviado automáticamente por el ${SISTEMA}.<br>
              Municipalidad Distrital de Carmen Alto — Ayacucho, Perú
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

const infoBox = (items: { label: string; value: string }[]) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;margin:16px 0;">
    ${items.map(({ label, value }) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #dbeafe;">
          <p style="margin:0;color:#6b7280;font-size:11px;">${label}</p>
          <p style="margin:2px 0 0;color:#111827;font-size:14px;font-weight:600;">${value}</p>
        </td>
      </tr>
    `).join('')}
  </table>
`;

const alerta = (texto: string, color = '#f59e0b', bg = '#fffbeb', border = '#fde68a') => `
  <div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:14px 16px;margin:16px 0;">
    <p style="margin:0;color:${color === '#f59e0b' ? '#92400e' : '#1e3a8a'};font-size:13px;">${texto}</p>
  </div>
`;

const boton = (texto: string, url: string) => `
  <div style="text-align:center;margin:24px 0;">
    <a href="${url}" style="background:#1e40af;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
      ${texto}
    </a>
  </div>
`;

// ── RF19: Notificación al registrar expediente ───────────────
export const notificarRegistro = async (params: {
  email:          string;
  nombres:        string;
  codigo:         string;
  tipoTramite:    string;
  fecha_registro: Date;
  fecha_limite:   Date;
  costo_soles:    number;
}) => {
  const { email, nombres, codigo, tipoTramite, fecha_registro, fecha_limite, costo_soles } = params;

  const contenido = `
    <p style="color:#374151;font-size:14px;margin:0 0 8px;">Estimado/a <strong>${nombres}</strong>,</p>
    <p style="color:#374151;font-size:14px;margin:0 0 16px;">
      Su solicitud de trámite ha sido <strong style="color:#15803d;">registrada exitosamente</strong> en nuestra institución.
    </p>
    ${infoBox([
      { label: 'Número de Expediente', value: codigo },
      { label: 'Tipo de Trámite',      value: tipoTramite },
      { label: 'Fecha de Registro',    value: formatFecha(fecha_registro) },
      { label: 'Fecha Límite',         value: formatFecha(fecha_limite) },
      { label: 'Costo del Trámite',    value: `S/ ${Number(costo_soles).toFixed(2)}` },
    ])}
    ${alerta('⚠️ Acérquese a la ventanilla de Caja con su número de expediente para realizar el pago y activar su trámite.')}
    ${boton('Consultar estado de mi trámite', `http://localhost:5173/consulta/${codigo}`)}
  `;

  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `✅ Trámite registrado — ${codigo} | Municipalidad Carmen Alto`,
    html:    baseHtml('¡Trámite Registrado!', contenido),
  });
};

// ── RF20: Notificación al cambiar estado ─────────────────────
export const notificarCambioEstado = async (params: {
  email:       string;
  nombres:     string;
  codigo:      string;
  tipoTramite: string;
  estado:      string;
  comentario:  string | null;
  area?:       string;
}) => {
  const { email, nombres, codigo, tipoTramite, estado, comentario, area } = params;

  const config: Record<string, { titulo: string; mensaje: string; color: string; emoji: string }> = {
    RECIBIDO: {
      titulo:  'Trámite Recibido',
      mensaje: 'Su trámite ha sido recibido y está siendo revisado por Mesa de Partes.',
      color:   '#1d4ed8',
      emoji:   '📋',
    },
    SUBSANADO: {
      titulo:  'Documentos Subsanados',
      mensaje: 'Sus documentos han sido revisados y aceptados por Mesa de Partes. Su trámite está en espera de ser derivado al área técnica correspondiente.',
      color:   '#15803d',
      emoji:   '✅',
    },
    DERIVADO: {
      titulo:  'Trámite Derivado',
      mensaje: `Su trámite ha sido derivado al área técnica${area ? ` de <strong>${area}</strong>` : ''} para su evaluación.`,
      color:   '#6d28d9',
      emoji:   '📤',
    },
    EN_PROCESO: {
      titulo:  'Trámite en Proceso',
      mensaje: 'Su trámite está siendo evaluado por el técnico responsable.',
      color:   '#c2410c',
      emoji:   '⚙️',
    },
    OBSERVADO: {
      titulo:  'Trámite Observado',
      mensaje: 'Su trámite ha sido observado. Revise las indicaciones y presente los documentos solicitados.',
      color:   '#b45309',
      emoji:   '⚠️',
    },
    RECHAZADO: {
      titulo:  'Trámite Rechazado',
      mensaje: 'Lamentablemente su trámite ha sido rechazado. Revise el motivo indicado.',
      color:   '#dc2626',
      emoji:   '❌',
    },
    RESUELTO: {
      titulo:  '¡Trámite Resuelto!',
      mensaje: 'Su trámite ha sido resuelto satisfactoriamente. Ya puede descargar el documento de respuesta.',
      color:   '#15803d',
      emoji:   '✅',
    },
    PDF_FIRMADO: {
      titulo:  'Documento Firmado Disponible',
      mensaje: 'El documento oficial de su trámite ha sido firmado digitalmente y está listo para descarga.',
      color:   '#0f766e',
      emoji:   '📄',
    },
  };

  const cfg = config[estado];
  if (!cfg) return;

  const contenido = `
    <p style="color:#374151;font-size:14px;margin:0 0 8px;">Estimado/a <strong>${nombres}</strong>,</p>
    <p style="color:#374151;font-size:14px;margin:0 0 16px;">
      ${cfg.emoji} ${cfg.mensaje}
    </p>
    ${infoBox([
      { label: 'Número de Expediente', value: codigo },
      { label: 'Tipo de Trámite',      value: tipoTramite },
      { label: 'Estado Actual',        value: estado.replace(/_/g, ' ') },
      ...(area ? [{ label: 'Área Responsable', value: area }] : []),
    ])}
    ${comentario ? `
      <div style="background:#f9fafb;border-left:4px solid #6b7280;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
        <p style="margin:0;color:#6b7280;font-size:11px;">Comentario del responsable:</p>
        <p style="margin:4px 0 0;color:#111827;font-size:13px;">${comentario}</p>
      </div>
    ` : ''}
    ${estado === 'OBSERVADO' ? alerta('📎 Ingrese al portal de consulta para adjuntar los documentos adicionales solicitados.') : ''}
    ${estado === 'RESUELTO' || estado === 'PDF_FIRMADO' ? alerta('📥 Su documento oficial está disponible para descarga en el portal ciudadano.', '#1d4ed8', '#eff6ff', '#bfdbfe') : ''}
    ${boton('Ver mi trámite en el portal', `http://localhost:5173/consulta/${codigo}`)}
  `;

  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `${cfg.emoji} ${cfg.titulo} — ${codigo} | Municipalidad Carmen Alto`,
    html:    baseHtml(cfg.titulo, contenido),
  });
};