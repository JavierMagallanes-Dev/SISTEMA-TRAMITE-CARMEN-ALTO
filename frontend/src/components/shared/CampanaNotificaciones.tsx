// src/components/shared/CampanaNotificaciones.tsx
// Campana con badge de no leídas y dropdown de notificaciones mejorado.

import { useEffect, useRef } from 'react';
import { Bell, CheckCheck, FileText, Clock, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useNotificaciones } from '../../hooks/useNotificaciones';

// ── Ícono según el título de la notificación ─────────────────
function IconoNotificacion({ titulo }: { titulo: string }) {
  const t = titulo.toLowerCase();
  if (t.includes('vencido') || t.includes('vencer'))
    return <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
      <AlertTriangle size={14} className="text-amber-500" />
    </div>;
  if (t.includes('resuelto') || t.includes('firmado'))
    return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
      <CheckCircle size={14} className="text-green-500" />
    </div>;
  if (t.includes('pago') || t.includes('recibido'))
    return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
      <Info size={14} className="text-blue-500" />
    </div>;
  return <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
    <Bell size={14} className="text-gray-400" />
  </div>;
}

export default function CampanaNotificaciones() {
  const {
    notificaciones, noLeidas, open,
    toggleOpen, cerrar,
    marcarLeida, marcarTodasLeidas,
    tiempoRelativo,
  } = useNotificaciones();

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cerrar();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [cerrar]);

  return (
    <div ref={ref} className="relative">

      {/* ── Botón campana ────────────────────────────────── */}
      <button
        onClick={toggleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Bell size={18} />
        {noLeidas > 0 && (
          <span
            className="absolute flex items-center justify-center font-bold text-white bg-red-500 rounded-full"
            style={{
              top:        '-6px',
              right:      '-6px',
              minWidth:   '20px',
              height:     '20px',
              fontSize:   '11px',
              padding:    '0 4px',
              lineHeight: '20px',
              boxShadow:  '0 0 0 2px white',
            }}
          >
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {/* ── Dropdown ─────────────────────────────────────── */}
      {open && (
        <div
          className="absolute right-0 top-12 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ width: 360 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Bell size={14} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 leading-none">Notificaciones</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo leído'}
                </p>
              </div>
            </div>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodasLeidas}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <CheckCheck size={12} />
                Leer todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
            {notificaciones.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Bell size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">Sin notificaciones</p>
                <p className="text-xs text-gray-300 mt-1">Aquí aparecerán tus alertas</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notificaciones.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.leida) marcarLeida(n.id); }}
                    className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                      !n.leida ? 'bg-blue-50/50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">

                      {/* Ícono */}
                      <IconoNotificacion titulo={n.titulo} />

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs leading-snug ${
                            n.leida ? 'text-gray-600' : 'text-gray-900 font-bold'
                          }`}>
                            {n.titulo}
                          </p>
                          {!n.leida && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                          )}
                        </div>

                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
                          {n.mensaje}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {n.expediente && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                              <FileText size={9} />
                              {n.expediente.codigo}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock size={9} />
                            {tiempoRelativo(n.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/80">
              <p className="text-[10px] text-gray-400 text-center">
                Últimas {notificaciones.length} notificaciones · Actualización automática cada 30s
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}