// src/services/email.service.ts
// Notificaciones automáticas por email al ciudadano.
// Diseño institucional profesional — HTML puro, sin emojis, sin SVG, sin imágenes externas.
// Compatible con Gmail, Outlook, Apple Mail y todos los clientes de correo.
// RF19: Al registrar expediente
// RF20: Al cambiar estado

import { Resend } from 'resend';
import { env }    from '../config/env';

const resend  = new Resend(env.RESEND_API_KEY);
const FROM    = 'Municipalidad Carmen Alto <noreply@municipalidadcarmenalto.site>';
const SISTEMA = 'Sistema de Tramite Documentario';
const PORTAL  = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const LOGO_URL = 'https://hibajtrydjemcmljpwky.supabase.co/storage/v1/object/public/documentos/assets/logoCA.png';

const C = {
  primario:   '#1a5fb4',
  secundario: '#3584e4',
  oscuro:     '#0d3b7a',
  claro:      '#eaf2fb',
  claroMedio: '#c8dcf5',
  texto:      '#1e293b',
  textoSub:   '#64748b',
  fondo:      '#f1f5f9',
};

// ── Helpers ──────────────────────────────────────────────────
const formatFecha = (d: Date) =>
  new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

// ── Círculo de estado (HTML puro) ─────────────────────────────
const circuloEstado = (letra: string, color: string, bgClaro: string) => `
  <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
    <tr>
      <td style="width:56px;height:56px;border-radius:50%;background:${bgClaro};border:3px solid ${color};text-align:center;vertical-align:middle;">
        <span style="color:${color};font-size:22px;font-weight:800;line-height:1;font-family:'Segoe UI',Arial,sans-serif;">${letra}</span>
      </td>
    </tr>
  </table>
`;

// ── Template base ─────────────────────────────────────────────
const baseHtml = (
  titulo:     string,
  contenido:  string,
  circulo:    string,
  colorBanda: string,
) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:${C.fondo};font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.fondo};padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dde3ec;">

  <!-- ══ ENCABEZADO ══ -->
  <tr>
    <td style="background:${C.primario};padding:22px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="52" style="vertical-align:middle;">
            <img src="${LOGO_URL}" width="48" height="48"
              style="display:block;border-radius:6px;border:2px solid rgba(255,255,255,0.25);"
              alt="Municipalidad Carmen Alto" />
          </td>
          <td style="padding-left:14px;vertical-align:middle;">
            <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;">
              Municipalidad Distrital de Carmen Alto
            </p>
            <p style="margin:3px 0 0;color:rgba(255,255,255,0.65);font-size:11px;letter-spacing:0.3px;">
              ${SISTEMA} &nbsp;·&nbsp; Ayacucho, Peru
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ══ BANDA DE COLOR ══ -->
  <tr><td style="height:4px;background:${colorBanda};font-size:0;">&nbsp;</td></tr>

  <!-- ══ TITULO CON CIRCULO ══ -->
  <tr>
    <td style="background:${C.claro};padding:28px 32px 24px;text-align:center;border-bottom:1px solid ${C.claroMedio};">
      ${circulo}
      <p style="margin:0;color:${C.oscuro};font-size:19px;font-weight:700;line-height:1.3;">
        ${titulo}
      </p>
    </td>
  </tr>

  <!-- ══ CONTENIDO ══ -->
  <tr>
    <td style="padding:28px 32px 24px;">
      ${contenido}
    </td>
  </tr>

  <!-- ══ PIE ══ -->
  <tr>
    <td style="background:${C.oscuro};">
      <div style="height:3px;background:${C.secundario};font-size:0;">&nbsp;</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:18px 32px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:11px;line-height:1.7;">
              Correo generado automaticamente por el
              <strong style="color:rgba(255,255,255,0.9);">${SISTEMA}</strong><br>
              Municipalidad Distrital de Carmen Alto — Huamanga, Ayacucho, Peru
            </p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.4);font-size:10px;">
              No responda este mensaje &nbsp;|&nbsp; Consultas: Mesa de Partes &nbsp;|&nbsp; (066) 123-456
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
</html>`;

// ── Componentes reutilizables ─────────────────────────────────

const infoBox = (items: { label: string; value: string }[]) => `
<table width="100%" cellpadding="0" cellspacing="0"
  style="border:1px solid ${C.claroMedio};border-radius:10px;overflow:hidden;margin:18px 0;">
  ${items.map(({ label, value }, i) => `
  <tr>
    <td style="padding:11px 16px;width:42%;background:${i % 2 === 0 ? C.claro : '#ffffff'};border-bottom:${i < items.length - 1 ? `1px solid ${C.claroMedio}` : 'none'};">
      <p style="margin:0;color:${C.textoSub};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">${label}</p>
    </td>
    <td style="padding:11px 16px;background:${i % 2 === 0 ? C.claro : '#ffffff'};border-bottom:${i < items.length - 1 ? `1px solid ${C.claroMedio}` : 'none'};">
      <p style="margin:0;color:${C.texto};font-size:13px;font-weight:600;">${value}</p>
    </td>
  </tr>`).join('')}
</table>`;

const bannerAccion = (
  letra:      string,
  color:      string,
  bgClaro:    string,
  titulo:     string,
  descripcion: string,
  borderColor: string,
) => `
<table width="100%" cellpadding="0" cellspacing="0"
  style="background:${bgClaro};border:1px solid ${borderColor};border-radius:10px;margin:18px 0;">
  <tr>
    <td width="52" style="padding:16px 0 16px 18px;vertical-align:top;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:36px;height:36px;border-radius:50%;background:${color};text-align:center;vertical-align:middle;">
            <span style="color:#ffffff;font-size:15px;font-weight:800;line-height:36px;display:block;">${letra}</span>
          </td>
        </tr>
      </table>
    </td>
    <td style="padding:16px 18px 16px 10px;vertical-align:top;">
      <p style="margin:0;color:${C.texto};font-size:13px;font-weight:700;">${titulo}</p>
      <p style="margin:5px 0 0;color:${C.textoSub};font-size:12px;line-height:1.6;">${descripcion}</p>
    </td>
  </tr>
</table>`;

const comentarioBox = (texto: string) => `
<table width="100%" cellpadding="0" cellspacing="0"
  style="margin:16px 0;border-radius:0 8px 8px 0;overflow:hidden;">
  <tr>
    <td width="4" style="background:${C.primario};font-size:0;">&nbsp;</td>
    <td style="background:#f8fafc;padding:14px 16px;border:1px solid #e2e8f0;border-left:none;border-radius:0 8px 8px 0;">
      <p style="margin:0;color:${C.textoSub};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">
        Observacion del area responsable
      </p>
      <p style="margin:6px 0 0;color:${C.texto};font-size:13px;line-height:1.6;">${texto}</p>
    </td>
  </tr>
</table>`;

const boton = (texto: string, url: string, color = C.primario) => `
<div style="text-align:center;margin:24px 0;">
  <a href="${url}"
    style="background:${color};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:9px;font-size:14px;font-weight:700;display:inline-block;letter-spacing:0.2px;">
    ${texto}
  </a>
</div>`;

const botonDescarga = (url: string) => `
<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:20px 0;">
  <tr>
    <td style="padding:20px 24px;text-align:center;">
      <p style="margin:0 0 4px;color:#15803d;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
        Su documento esta listo
      </p>
      <p style="margin:0 0 16px;color:#166534;font-size:13px;line-height:1.5;">
        El documento oficial ha sido firmado digitalmente y tiene validez legal.<br>
        Descárguelo y guárdelo en un lugar seguro.
      </p>
      <a href="${url}"
        style="background:#15803d;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:9px;font-size:15px;font-weight:700;display:inline-block;">
        Descargar Documento Oficial
      </a>
      <p style="margin:12px 0 0;color:#4ade80;font-size:11px;">
        Documento con firma digital valida ante cualquier institucion
      </p>
    </td>
  </tr>
</table>`;

const divider = () =>
  `<hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;">`;

const saludo = (nombres: string) => `
<p style="color:${C.texto};font-size:15px;font-weight:600;margin:0 0 8px;">
  Estimado/a ${nombres},
</p>`;

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
    ${saludo(nombres)}
    <p style="color:${C.textoSub};font-size:14px;margin:0 0 18px;line-height:1.65;">
      Su solicitud ha sido <strong style="color:#15803d;">registrada correctamente</strong>
      en el sistema de tramites de la Municipalidad Distrital de Carmen Alto.
      A continuacion encontrara los detalles de su expediente.
    </p>

    ${infoBox([
      { label: 'N. de Expediente', value: codigo },
      { label: 'Tipo de Tramite',  value: tipoTramite },
      { label: 'Fecha de Registro',value: formatFecha(fecha_registro) },
      { label: 'Fecha Limite',     value: formatFecha(fecha_limite) },
      { label: 'Costo',            value: `S/ ${Number(costo_soles).toFixed(2)}` },
    ])}

    ${bannerAccion(
      '!',
      '#d97706',
      '#fffbeb',
      'Accion requerida: Realizar el pago',
      `Para activar su tramite, acerquese a la ventanilla de <strong>Caja</strong> de la Municipalidad con su codigo <strong>${codigo}</strong> y realice el pago de <strong>S/ ${Number(costo_soles).toFixed(2)}</strong>. Tambien puede pagarlo desde el portal en linea.`,
      '#fde68a',
    )}

    ${divider()}
    ${boton('Ver mi tramite en el portal', `${PORTAL}/consulta/${codigo}`)}

    <p style="color:#94a3b8;font-size:11px;text-align:center;margin:8px 0 0;">
      Guarde este correo como constancia de su solicitud &nbsp;·&nbsp;
      Codigo: <strong style="font-family:monospace;">${codigo}</strong>
    </p>
  `;

  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: `Tramite registrado: ${codigo} — ${tipoTramite} | Municipalidad Carmen Alto`,
    html:    baseHtml(
      'Tramite Registrado Correctamente',
      contenido,
      circuloEstado('R', C.primario, C.claro),
      C.primario,
    ),
  });
};

// ── RF20: Notificación al cambiar estado ─────────────────────
export const notificarCambioEstado = async (params: {
  email:        string;
  nombres:      string;
  codigo:       string;
  tipoTramite:  string;
  estado:       string;
  comentario:   string | null;
  area?:        string;
  urlDescarga?: string;
}) => {
  const { email, nombres, codigo, tipoTramite, estado, comentario, area, urlDescarga } = params;

  type CfgEstado = {
    titulo:      string;
    mensaje:     string;
    letra:       string;
    color:       string;
    bgClaro:     string;
    colorBanda:  string;
    subject:     string;
    banner?:     { letra: string; color: string; bgClaro: string; titulo: string; desc: string; border: string };
  };

  const config: Record<string, CfgEstado> = {
    RECIBIDO: {
      titulo:     'Pago Verificado — Tramite Activo',
      mensaje:    'Su pago ha sido verificado por el cajero municipal. Su expediente ha ingresado al proceso de revision y sera atendido a la brevedad por Mesa de Partes.',
      letra:      'V',
      color:      '#15803d',
      bgClaro:    '#f0fdf4',
      colorBanda: '#15803d',
      subject:    `Pago verificado — ${codigo} | Municipalidad Carmen Alto`,
    },
    SUBSANADO: {
      titulo:     'Documentos Aceptados',
      mensaje:    'Los documentos adicionales que presento han sido revisados y aceptados por el area responsable. Su tramite continua el proceso de evaluacion tecnica.',
      letra:      'V',
      color:      '#15803d',
      bgClaro:    '#f0fdf4',
      colorBanda: '#15803d',
      subject:    `Documentos aceptados — ${codigo} | Municipalidad Carmen Alto`,
    },
    DERIVADO: {
      titulo:     'Expediente Derivado al Area Tecnica',
      mensaje:    `Su expediente fue derivado${area ? ` al <strong>${area}</strong>` : ' al area tecnica correspondiente'} para su evaluacion. Le notificaremos cuando haya novedades sobre su tramite.`,
      letra:      'D',
      color:      '#7c3aed',
      bgClaro:    '#f5f3ff',
      colorBanda: '#7c3aed',
      subject:    `Expediente derivado — ${codigo} | Municipalidad Carmen Alto`,
    },
    EN_PROCESO: {
      titulo:     'Expediente en Evaluacion Tecnica',
      mensaje:    'Su expediente se encuentra siendo evaluado por el personal tecnico del area responsable. Este proceso puede tomar algunos dias habiles segun la complejidad del tramite.',
      letra:      'E',
      color:      '#ea580c',
      bgClaro:    '#fff7ed',
      colorBanda: '#ea580c',
      subject:    `En evaluacion tecnica — ${codigo} | Municipalidad Carmen Alto`,
    },
    LISTO_DESCARGA: {
      titulo:     'Tramite Aprobado — Pendiente de Firma',
      mensaje:    'Su tramite fue aprobado satisfactoriamente por el area tecnica y se encuentra en proceso de firma digital por el Jefe de Area. Recibira una notificacion cuando el documento oficial este disponible para su descarga.',
      letra:      'A',
      color:      '#0284c7',
      bgClaro:    '#f0f9ff',
      colorBanda: '#0284c7',
      subject:    `Tramite aprobado — ${codigo} | Municipalidad Carmen Alto`,
    },
    OBSERVADO: {
      titulo:     'Se Requieren Documentos Adicionales',
      mensaje:    'Su tramite ha sido observado por el area tecnica. Para continuar con el proceso de evaluacion, es necesario que presente los documentos indicados a continuacion.',
      letra:      'O',
      color:      '#d97706',
      bgClaro:    '#fffbeb',
      colorBanda: '#d97706',
      subject:    `Observacion en su tramite — ${codigo} | Municipalidad Carmen Alto`,
      banner: {
        letra:   'i',
        color:   '#d97706',
        bgClaro: '#fffbeb',
        titulo:  'Como subsanar la observacion',
        desc:    `Ingrese al portal ciudadano con su codigo <strong>${codigo}</strong>, ubique su expediente y adjunte los documentos solicitados en la seccion de observaciones. Una vez revisados, su tramite continuara automaticamente.`,
        border:  '#fde68a',
      },
    },
    RECHAZADO: {
      titulo:     'Tramite No Aprobado',
      mensaje:    'Lamentamos informarle que su tramite no ha sido aprobado por el area responsable. A continuacion encontrara el motivo detallado indicado por el evaluador.',
      letra:      'X',
      color:      '#dc2626',
      bgClaro:    '#fef2f2',
      colorBanda: '#dc2626',
      subject:    `Resultado de su tramite — ${codigo} | Municipalidad Carmen Alto`,
      banner: {
        letra:   'i',
        color:   '#64748b',
        bgClaro: '#f8fafc',
        titulo:  'Que puede hacer a continuacion',
        desc:    'Puede acercarse a Mesa de Partes para recibir orientacion personalizada sobre los pasos a seguir, o presentar una nueva solicitud subsanando las observaciones indicadas.',
        border:  '#e2e8f0',
      },
    },
    RESUELTO: {
      titulo:     'Tramite Resuelto — Documento Disponible',
      mensaje:    'Su tramite ha sido resuelto satisfactoriamente. El documento oficial ha sido <strong>firmado digitalmente</strong> por el Jefe de Area y esta disponible para su descarga inmediata.',
      letra:      'R',
      color:      '#15803d',
      bgClaro:    '#f0fdf4',
      colorBanda: '#15803d',
      subject:    `Documento listo para descargar — ${codigo} | Municipalidad Carmen Alto`,
    },
    PDF_FIRMADO: {
      titulo:     'Documento Firmado Disponible',
      mensaje:    'El documento oficial de su tramite ha sido firmado digitalmente y esta disponible para su descarga.',
      letra:      'R',
      color:      '#15803d',
      bgClaro:    '#f0fdf4',
      colorBanda: '#15803d',
      subject:    `Documento firmado — ${codigo} | Municipalidad Carmen Alto`,
    },
  };

  const cfg = config[estado];
  if (!cfg) return;

  const infoItems = [
    { label: 'N. de Expediente', value: codigo },
    { label: 'Tipo de Tramite',  value: tipoTramite },
    { label: 'Estado',           value: estado.replace(/_/g, ' ') },
    ...(area ? [{ label: 'Area Responsable', value: area }] : []),
  ];

  const contenido = `
    ${saludo(nombres)}
    <p style="color:${C.textoSub};font-size:14px;margin:0 0 18px;line-height:1.65;">
      ${cfg.mensaje}
    </p>

    ${infoBox(infoItems)}

    ${comentario ? comentarioBox(comentario) : ''}

    ${cfg.banner
      ? bannerAccion(
          cfg.banner.letra,
          cfg.banner.color,
          cfg.banner.bgClaro,
          cfg.banner.titulo,
          cfg.banner.desc,
          cfg.banner.border,
        )
      : ''
    }

    ${(estado === 'RESUELTO' || estado === 'PDF_FIRMADO')
      ? botonDescarga(urlDescarga ?? `${PORTAL}/consulta/${codigo}`)
      : ''
    }

    ${divider()}
    ${boton('Ver estado de mi tramite en el portal', `${PORTAL}/consulta/${codigo}`)}

    <p style="color:#94a3b8;font-size:11px;text-align:center;margin:8px 0 0;">
      Codigo de expediente: <strong style="font-family:monospace;">${codigo}</strong>
    </p>
  `;

  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: cfg.subject,
    html:    baseHtml(
      cfg.titulo,
      contenido,
      circuloEstado(cfg.letra, cfg.color, cfg.bgClaro),
      cfg.colorBanda,
    ),
  });
};