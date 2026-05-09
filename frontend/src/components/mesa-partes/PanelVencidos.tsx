// src/components/mesa-partes/PanelVencidos.tsx
// Panel de expedientes vencidos y por vencer para Mesa de Partes.

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, RefreshCw, CalendarX } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { formatFecha, diasRestantes } from '../../utils/formato';
import EstadoBadge from '../shared/EstadoBadge';
import type { EstadoExpediente } from '../../types';

interface ExpVencido {
  id:             number;
  codigo:         string;
  estado:         EstadoExpediente;
  fecha_registro: string;
  fecha_limite:   string;
  ciudadano:      { nombres: string; apellido_pat: string; dni: string | null; email: string | null };
  tipoTramite:    { nombre: string; plazo_dias: number };
  areaActual:     { nombre: string } | null;
}

interface Props {
  onReactivado?: () => void;
}

export default function PanelVencidos({ onReactivado }: Props) {
  const [vencidos,    setVencidos]    = useState<ExpVencido[]>([]);
  const [porVencer,   setPorVencer]   = useState<ExpVencido[]>([]);
  const [cargando,    setCargando]    = useState(true);
  const [reactivando, setReactivando] = useState<number | null>(null);
  const [tab,         setTab]         = useState<'vencidos' | 'porVencer'>('vencidos');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get('/mesa-partes/vencidos');
      setVencidos(res.data.vencidos);
      setPorVencer(res.data.porVencer);
    } catch { toast.error({ titulo: 'Error al cargar alertas de vencimiento.' }); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleReactivar = async (exp: ExpVencido) => {
    setReactivando(exp.id);
    try {
      const res = await api.post(`/mesa-partes/reactivar-vencido/${exp.id}`);
      toast.success({ titulo: 'Plazo extendido', descripcion: res.data.message });
      cargar();
      onReactivado?.();
    } catch (e: any) {
      toast.error({ titulo: e?.response?.data?.error ?? 'Error al reactivar.' });
    } finally { setReactivando(null); }
  };

  const diasVencido = (fechaLimite: string) => {
    const diff = Math.ceil((new Date().getTime() - new Date(fechaLimite).getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const totalAlertas = vencidos.length + porVencer.length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          <h2 className="text-base font-bold text-gray-800">Alertas de vencimiento</h2>
          {totalAlertas > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">
              {totalAlertas}
            </span>
          )}
        </div>
        <button onClick={cargar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('vencidos')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'vencidos' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <CalendarX size={12} />
          Vencidos ({vencidos.length})
        </button>
        <button
          onClick={() => setTab('porVencer')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'porVencer' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <Clock size={12} />
          Por vencer ({porVencer.length})
        </button>
      </div>

      {cargando ? (
        <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {/* Lista vencidos */}
          {tab === 'vencidos' && (
            vencidos.length === 0 ? (
              <div className="text-center py-8">
                <CalendarX size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No hay expedientes vencidos</p>
              </div>
            ) : (
              vencidos.map((exp) => (
                <div key={exp.id} className="border border-red-200 rounded-xl overflow-hidden bg-red-50/40">
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-red-600">{exp.codigo}</span>
                      <EstadoBadge estado={exp.estado} size="sm" />
                    </div>
                    <p className="text-xs font-medium text-gray-700">{exp.tipoTramite.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {exp.ciudadano.nombres} {exp.ciudadano.apellido_pat}
                      {exp.ciudadano.dni && ` · DNI ${exp.ciudadano.dni}`}
                    </p>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-red-600 font-semibold">
                        Venció hace {diasVencido(exp.fecha_limite)} día(s) · {formatFecha(exp.fecha_limite)}
                      </span>
                      {exp.areaActual && (
                        <span className="text-xs text-gray-400">{exp.areaActual.nombre}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleReactivar(exp)}
                      disabled={reactivando === exp.id}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1">
                      {reactivando === exp.id ? (
                        <><RefreshCw size={12} className="animate-spin" />Extendiendo plazo...</>
                      ) : (
                        <><RefreshCw size={12} />Extender plazo</>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {/* Lista por vencer */}
          {tab === 'porVencer' && (
            porVencer.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No hay expedientes próximos a vencer</p>
              </div>
            ) : (
              porVencer.map((exp) => {
                const dias = diasRestantes(exp.fecha_limite);
                return (
                  <div key={exp.id} className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/40">
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-amber-600">{exp.codigo}</span>
                        <EstadoBadge estado={exp.estado} size="sm" />
                      </div>
                      <p className="text-xs font-medium text-gray-700">{exp.tipoTramite.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {exp.ciudadano.nombres} {exp.ciudadano.apellido_pat}
                        {exp.ciudadano.dni && ` · DNI ${exp.ciudadano.dni}`}
                      </p>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs text-amber-600 font-semibold">
                          ⚠ Vence en {dias} día(s) · {formatFecha(exp.fecha_limite)}
                        </span>
                        {exp.areaActual && (
                          <span className="text-xs text-gray-400">{exp.areaActual.nombre}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      )}
    </div>
  );
}