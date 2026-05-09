// src/components/shared/CampanaNotificaciones.tsx
// Campana con badge de no leídas y dropdown de notificaciones.

import { useEffect, useRef } from 'react';
import { Bell, CheckCheck, FileText } from 'lucide-react';
import { useNotificaciones } from '../../hooks/useNotificaciones';

export default function CampanaNotificaciones() {
  const {
    notificaciones, noLeidas, open,
    toggleOpen, cerrar,
    marcarLeida, marcarTodasLeidas,
    tiempoRelativo,
  } = useNotificaciones();

  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cerrar();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [cerrar]);

  return (
    <div ref={ref} className="relative">

      {/* Botón campana */}
      <button
        onClick={toggleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
        <Bell size={18} />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-blue-600" />
              <span className="text-sm font-bold text-gray-800">Notificaciones</span>
              {noLeidas > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                  {noLeidas}
                </span>
              )}
            </div>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodasLeidas}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <CheckCheck size={13} />
                Leer todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notificaciones.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Sin notificaciones</p>
              </div>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.leida) marcarLeida(n.id); }}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.leida ? 'bg-blue-50/60' : ''}`}>
                  <div className="flex items-start gap-3">

                    {/* Indicador no leída */}
                    <div className="mt-1.5 shrink-0">
                      {n.leida
                        ? <div className="w-2 h-2 rounded-full bg-gray-200" />
                        : <div className="w-2 h-2 rounded-full bg-blue-500" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${n.leida ? 'text-gray-600' : 'text-gray-800 font-semibold'}`}>
                        {n.titulo}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {n.mensaje}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {n.expediente && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            <FileText size={9} />
                            {n.expediente.codigo}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {tiempoRelativo(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400 text-center">
                Mostrando las últimas {notificaciones.length} notificaciones
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}