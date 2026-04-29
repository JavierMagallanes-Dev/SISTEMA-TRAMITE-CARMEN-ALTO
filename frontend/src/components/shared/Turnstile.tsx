// src/components/shared/Turnstile.tsx
// Componente Cloudflare Turnstile — verificación de seguridad real.
// Carga el script de Cloudflare y renderiza el widget.
// El token generado se envía al backend para verificación server-side.

import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset:  (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  onToken:  (token: string) => void;  // token válido generado
  onExpire: () => void;               // token expiró
  onError:  () => void;               // error de verificación
}

export default function Turnstile({ onToken, onExpire, onError }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef  = useRef<string | null>(null);

  useEffect(() => {
    // Cargar script de Cloudflare si no está cargado
    const scriptId = 'cf-turnstile-script';
    const render   = () => {
      if (!containerRef.current || !window.turnstile) return;
      // Limpiar widget anterior si existe
      if (widgetIdRef.current) {
try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignorar */ }
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey:           SITE_KEY,
        theme:             'light',
        language:          'es',
        callback:          (token: string) => onToken(token),
        'expired-callback': () => onExpire(),
        'error-callback':   () => onError(),
      });
    };

    if (!document.getElementById(scriptId)) {
      const script    = document.createElement('script');
      script.id       = scriptId;
      script.src      = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async    = true;
      script.defer    = true;
      script.onload   = render;
      document.head.appendChild(script);
    } else if (window.turnstile) {
      render();
    } else {
      // Script ya en DOM pero aún cargando
      const script = document.getElementById(scriptId) as HTMLScriptElement;
      script.addEventListener('load', render);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignorar */ }
      }
    };
  }, []);

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-2">
        Verificación de seguridad <span className="text-red-500">*</span>
      </label>
      <div ref={containerRef} />
      <p className="text-xs text-gray-400 mt-1">
        Protegido por Cloudflare Turnstile
      </p>
    </div>
  );
}