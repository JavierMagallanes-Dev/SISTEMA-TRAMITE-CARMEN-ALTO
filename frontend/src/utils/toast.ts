// src/utils/toast.ts
// Helper tipado para disparar notificaciones Sonner desde cualquier lugar
// del Sistema de Trámite Documentario · Carmen Alto.
import { toast as sonner } from 'sonner';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { createElement, type ReactElement } from 'react';

const PRIMARY = '#216ece';

// ── Tipos ────────────────────────────────────────────────────────────
export type TipoToast = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label:   string;
  onClick: () => void;
}

export interface ToastOptions {
  titulo:       string;
  descripcion?: string;
  duration?:    number;
  action?:      ToastAction;
}

interface TipoConfig {
  Icon:   typeof CheckCircle2;
  bgIcon: string;
  fgIcon: string;
  border: string;
}

const CONFIG: Record<TipoToast, TipoConfig> = {
  success: { Icon: CheckCircle2,  bgIcon: '#dcfce7', fgIcon: '#16a34a', border: '#16a34a' },
  error:   { Icon: XCircle,       bgIcon: '#fee2e2', fgIcon: '#dc2626', border: '#dc2626' },
  warning: { Icon: AlertTriangle, bgIcon: '#fef3c7', fgIcon: '#d97706', border: '#d97706' },
  info:    { Icon: Info,          bgIcon: '#eaf2fb', fgIcon: PRIMARY,   border: PRIMARY   },
};

// ── Icono custom (chip tinted) ───────────────────────────────────────
function renderIcon(tipo: TipoToast): ReactElement {
  const cfg = CONFIG[tipo];
  return createElement(
    'span',
    {
      style: {
        width:           36,
        height:          36,
        borderRadius:    8,
        backgroundColor: cfg.bgIcon,
        color:           cfg.fgIcon,
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
      },
    },
    createElement(cfg.Icon, { size: 18, strokeWidth: 2 }),
  ) as ReactElement;
}

// ── Despachador genérico ─────────────────────────────────────────────
function fire(tipo: TipoToast, opts: ToastOptions): void {
  const cfg = CONFIG[tipo];
  const fn  = sonner[tipo] as (
    message: string,
    options?: {
      description?: string;
      duration?:    number;
      icon?:        ReactElement;
      action?:      { label: string; onClick: () => void };
      style?:       React.CSSProperties;
    }
  ) => void;

  fn(opts.titulo, {
    description: opts.descripcion,
    duration:    opts.duration ?? 4500,
    icon:        renderIcon(tipo),
    action:      opts.action
      ? { label: opts.action.label, onClick: opts.action.onClick }
      : undefined,
    style: {
      borderLeft: `4px solid ${cfg.border}`,
    },
  });
}

// ── API pública ──────────────────────────────────────────────────────
export const toast = {
  success:    (opts: ToastOptions): void => fire('success', opts),
  error:      (opts: ToastOptions): void => fire('error',   opts),
  warning:    (opts: ToastOptions): void => fire('warning', opts),
  info:       (opts: ToastOptions): void => fire('info',    opts),
  raw:        sonner,
  dismissAll: (): void => { sonner.dismiss(); },
};

export default toast;