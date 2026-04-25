// src/services/email.service.ts
// Notificaciones automáticas por email al ciudadano.
// Diseño institucional: #216ece (primario) y #4abdef (secundario)
// RF19: Al registrar expediente
// RF20: Al cambiar estado

import { Resend } from 'resend';
import { env }    from '../config/env';

const resend  = new Resend(env.RESEND_API_KEY);
const FROM    = 'Municipalidad Carmen Alto <noreply@municipalidadcarmenalto.site>';
const SISTEMA = 'Sistema de Trámite Documentario';

// ── URL del logo (imagen pública en Supabase Storage) ────────
// Usamos una URL de imagen pública para el logo en emails HTML
const LOGO_URL = 'https://hibajtrydjemcmljpwky.supabase.co/storage/v1/object/public/documentos/assets/logoCA.png';

// ── Colores institucionales ──────────────────────────────────
const C = {
  primario:   '#216ece',
  secundario: '#4abdef',
  oscuro:     '#1a4f8a',
  claro:      '#e8f4fd',
  claroMedio: '#d1e9f7',
};

// ── Helpers ──────────────────────────────────────────────────
const formatFecha = (d: Date) =>
  new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

// ── Template base ─────────────────────────────────────────────
const baseHtml = (titulo: string, contenido: string, emojiEstado = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#eef3f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f8;padding:28px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(33,110,206,0.12);">

        <!-- ══ ENCABEZADO INSTITUCIONAL ══ -->
        <tr>
          <td style="background:${C.primario};padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- Logo -->
                <td width="80" style="padding:18px 0 18px 24px;vertical-align:middle;">
                  <img src="${LOGO_URL}" width="58" height="58"
                       style="display:block;border-radius:8px;background:#ffffff;padding:4px;"
                       alt="Logo Municipalidad Carmen Alto" />
                </td>
                <!-- Texto -->
                <td style="padding:18px 20px;vertical-align:middle;">
                  <p style="margin:0;color:#ffffff;font-size:16px;font-weight:700;line-height:1.3;">
                    Municipalidad Distrital de Carmen Alto
                  </p>
                  <p style="margin:4px 0 0;color:${C.secundario};font-size:11px;letter-spacing:0.5px;">
                    ${SISTEMA}
                  </p>
                  <p style="margin:3px 0 0;color:rgba(255,255,255,0.7);font-size:10px;">
                    Ayacucho — Perú
                  </p>
                </td>
              </tr>
            </table>
            <!-- Franja secundaria -->
            <div style="height:4px;background:${C.secundario};"></div>
          </td>
        </tr>

        <!-- ══ TÍTULO DEL MENSAJE ══ -->
        <tr>
          <td style="background:${C.claro};padding:20px 40px;text-align:center;border-bottom:1px solid ${C.claroMedio};">
            ${emojiEstado ? `<p style="margin:0 0 6px;font-size:28px;">${emojiEstado}</p>` : ''}
            <p style="margin:0;color:${C.primario};font-size:20px;font-weight:700;">${titulo}</p>
          </td>
        </tr>

        <!-- ══ CONTENIDO ══ -->
        <tr>
          <td style="padding:28px 40px;">
            ${contenido}
          </td>
        </tr>

        <!-- ══ PIE DE PÁGINA ══ -->
        <tr>
          <td style="background:${C.oscuro};padding:0;">
            <div style="height:3px;background:${C.secundario};"></div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:16px 32px;text-align:center;">
                  <p style="margin:0;color:rgba(255,255,255,0.8);font-size:11px;line-height:1.6;">
                    Este correo fue enviado automáticamente por el <strong style="color:${C.secundario};">${SISTEMA}</strong>.<br>
                    Municipalidad Distrital de Carmen Alto — Huamanga, Ayacucho, Perú<br>
                    <span style="color:rgba(255,255,255,0.5);font-size:10px;">
                      No responda este correo. Para consultas comuníquese con Mesa de Partes.
                    </span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ── Componentes reutilizables ────────────────────────────────
const infoBox = (items: { label: string; value: string }[]) => `
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:${C.claro};border-radius:8px;border:1px solid ${C.claroMedio};margin:16px 0;overflow:hidden;">
    ${items.map(({ label, value }, i) => `
      <tr>
        <td style="padding:10px 16px;${i < items.length - 1 ? `border-bottom:1px solid ${C.claroMedio};` : ''}">
          <p style="margin:0;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
          <p style="margin:3px 0 0;color:#111827;font-size:14px;font-weight:600;">${value}</p>
        </td>
      </tr>
    `).join('')}
  </table>
`;

const alerta = (texto: string, tipo: 'warning' | 'info' | 'success' | 'error' = 'warning') => {
  const estilos = {
    warning: { bg: '#fffbeb', border: '#f59e0b', color: '#92400e' },
    info:    { bg: C.claro,   border: C.secundario, color: C.oscuro },
    success: { bg: '#f0fdf4', border: '#22c55e', color: '#15803d' },
    error:   { bg: '#fef2f2', border: '#ef4444', color: '#991b1b' },
  };
  const s = estilos[tipo];
  return `
    <div style="background:${s.bg};border-left:4px solid ${s.border};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;">
      <p style="margin:0;color:${s.color};font-size:13px;">${texto}</p>
    </div>
  `;
};

const comentarioBox = (texto: string) => `
  <div style="background:#f9fafb;border-left:4px solid ${C.primario};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;">
    <p style="margin:0;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Comentario del responsable</p>
    <p style="margin:6px 0 0;color:#111827;font-size:13px;line-height:1.5;">${texto}</p>
  </div>
`;

const boton = (texto: string, url: string, color = C.primario) => `
  <div style="text-align:center;margin:24px 0;">
    <a href="${url}"
      style="background:${color};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;letter-spacing:0.3px;">
      ${texto}
    </a>
  </div>
`;

const botonDescarga = (url: string) => `
  <div style="text-align:center;margin:20px 0;">
    <a href="${url}"
      style="background:#15803d;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
      📥 Descargar documento resuelto
    </a>
  </div>
`;

const divider = () => `<hr style="border:none;border-top:1px solid ${C.claroMedio};margin:20px 0;">`;

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
    <p style="color:#374151;font-size:14px;margin:0 0 6px;">
      Estimado/a <strong style="color:${C.oscuro};">${nombres}</strong>,
    </p>
    <p style="color:#374151;font-size:14px;margin:0 0 16px;line-height:1.6;">
      Su solicitud de trámite ha sido
      <strong style="color:#15803d;">registrada exitosamente</strong>
      en la Municipalidad Distrital de Carmen Alto. A continuación encontrará el detalle de su expediente.
    </p>

    ${infoBox([
      { label: 'Número de Expediente', value: codigo },
      { label: 'Tipo de Trámite',      value: tipoTramite },
      { label: 'Fecha de Registro',    value: formatFecha(fecha_registro) },
      { label: 'Fecha Límite',         value: formatFecha(fecha_limite) },
      { label: 'Costo del Trámite',    value: `S/ ${Number(costo_soles).toFixed(2)}` },
    ])}

    ${alerta('⚠️ Para activar su trámite, acérquese a la ventanilla de Caja de la Municipalidad con su número de expediente y realice el pago correspondiente.', 'warning')}

    ${divider()}
    ${boton('Consultar estado de mi trámite', `http://localhost:5173/consulta/${codigo}`)}

    <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">
      Guarde este correo como constancia de presentación. Código: <strong>${codigo}</strong>
    </p>
  `;

  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `✅ Trámite registrado — ${codigo} | Municipalidad Carmen Alto`,
    html:    baseHtml('¡Trámite Registrado!', contenido, '📋'),
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

  const config: Record<string, { titulo: string; mensaje: string; emoji: string; alertaTipo?: 'warning' | 'info' | 'success' | 'error' }> = {
    RECIBIDO: {
      titulo:  'Pago Verificado — Trámite Recibido',
      mensaje: 'Su pago ha sido verificado correctamente. Su trámite está siendo revisado por Mesa de Partes.',
      emoji:   '📋',
      alertaTipo: 'info',
    },
    SUBSANADO: {
      titulo:  'Documentos Subsanados',
      mensaje: 'Sus documentos adicionales han sido revisados y aceptados. Su trámite continúa el proceso de evaluación.',
      emoji:   '✅',
      alertaTipo: 'success',
    },
    DERIVADO: {
      titulo:  'Trámite Derivado al Área Técnica',
      mensaje: `Su trámite ha sido derivado${area ? ` al área de <strong>${area}</strong>` : ' al área técnica correspondiente'} para su evaluación técnica.`,
      emoji:   '📤',
      alertaTipo: 'info',
    },
    EN_PROCESO: {
      titulo:  'Trámite en Evaluación Técnica',
      mensaje: 'Su trámite está siendo evaluado por el técnico responsable del área correspondiente.',
      emoji:   '⚙️',
      alertaTipo: 'info',
    },
    LISTO_DESCARGA: {
      titulo:  'Trámite Aprobado — Pendiente de Firma',
      mensaje: 'Su trámite ha sido aprobado satisfactoriamente por el técnico y está siendo preparado para la firma digital del Jefe de Área. Recibirá una notificación cuando el documento esté listo.',
      emoji:   '📝',
      alertaTipo: 'info',
    },
    OBSERVADO: {
      titulo:  'Trámite Observado — Se Requieren Documentos',
      mensaje: 'Su trámite ha sido observado. Es necesario que adjunte los documentos adicionales indicados para continuar con el proceso.',
      emoji:   '⚠️',
      alertaTipo: 'warning',
    },
    RECHAZADO: {
      titulo:  'Trámite Rechazado',
      mensaje: 'Lamentablemente su trámite ha sido rechazado. Revise el motivo indicado y comuníquese con Mesa de Partes para más información.',
      emoji:   '❌',
      alertaTipo: 'error',
    },
    RESUELTO: {
      titulo:  '¡Trámite Resuelto!',
      mensaje: 'Su trámite ha sido <strong>resuelto y firmado digitalmente</strong> por el Jefe de Área mediante FirmaPeru. El documento oficial está disponible para su descarga.',
      emoji:   '🎉',
      alertaTipo: 'success',
    },
    PDF_FIRMADO: {
      titulo:  'Documento Firmado Disponible',
      mensaje: 'El documento oficial de su trámite ha sido firmado digitalmente y está disponible para descarga.',
      emoji:   '📄',
      alertaTipo: 'success',
    },
  };

  const cfg = config[estado];
  if (!cfg) return;

  const infoItems = [
    { label: 'Número de Expediente', value: codigo },
    { label: 'Tipo de Trámite',      value: tipoTramite },
    { label: 'Estado Actual',        value: estado.replace(/_/g, ' ') },
    ...(area ? [{ label: 'Área Responsable', value: area }] : []),
  ];

  const contenido = `
    <p style="color:#374151;font-size:14px;margin:0 0 6px;">
      Estimado/a <strong style="color:${C.oscuro};">${nombres}</strong>,
    </p>
    <p style="color:#374151;font-size:14px;margin:0 0 16px;line-height:1.6;">
      ${cfg.mensaje}
    </p>

    ${infoBox(infoItems)}

    ${comentario ? comentarioBox(comentario) : ''}

    ${estado === 'OBSERVADO' ? alerta('📎 Ingrese al portal de consulta y adjunte los documentos adicionales solicitados para reactivar su trámite.', 'warning') : ''}

    ${estado === 'RESUELTO' || estado === 'PDF_FIRMADO'
      ? botonDescarga(`http://localhost:5173/consulta/${codigo}`)
      : ''
    }

    ${divider()}
    ${boton('Ver mi trámite en el portal', `http://localhost:5173/consulta/${codigo}`)}

    <p style="color:#9ca3af;font-size:11px;text-align:center;margin:8px 0 0;">
      Código de expediente: <strong>${codigo}</strong>
    </p>
  `;

  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `${cfg.emoji} ${cfg.titulo} — ${codigo} | Municipalidad Carmen Alto`,
    html:    baseHtml(cfg.titulo, contenido, cfg.emoji),
  });
};