// src/components/usuarios/TabTramites.tsx

import { Card }  from '../ui/Card';
import Button    from '../ui/Button';
import { FileText, Pencil, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { TipoTramiteRow, Requisito } from '../../hooks/useUsuarios';

interface Props {
  tramites:         TipoTramiteRow[];
  expandedTramite:  number | null;
  setExpanded:      (id: number | null) => void;
  onEditar:         (t: TipoTramiteRow) => void;
  onToggle:         (t: TipoTramiteRow) => void;
  onAgregarReq:     (t: TipoTramiteRow) => void;
  onEditarReq:      (t: TipoTramiteRow, r: Requisito) => void;
  onEliminarReq:    (r: Requisito) => void;
}

export default function TabTramites({
  tramites, expandedTramite, setExpanded,
  onEditar, onToggle, onAgregarReq, onEditarReq, onEliminarReq,
}: Props) {
  if (tramites.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-400">
          <FileText size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay trámites registrados.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tramites.map((t) => (
        <Card key={t.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-sm font-semibold text-gray-800">{t.nombre}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {t.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              {t.descripcion && <p className="text-xs text-gray-400 mb-1">{t.descripcion}</p>}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>⏱ {t.plazo_dias} días</span>
                <span>💰 S/ {Number(t.costo_soles).toFixed(2)}</span>
                <span>📄 {t._count.expedientes} expedientes</span>
                <span>📋 {t.requisitos.length} requisitos</span>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0 flex-wrap">
              <Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => onEditar(t)}>Editar</Button>
              <Button size="sm" variant="ghost"
                icon={t.activo
                  ? <ToggleRight size={12} className="text-green-600" />
                  : <ToggleLeft  size={12} className="text-gray-400"  />}
                onClick={() => onToggle(t)}>
                {t.activo ? 'Desactivar' : 'Activar'}
              </Button>
              <Button size="sm" variant="ghost"
                icon={expandedTramite === t.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                onClick={() => setExpanded(expandedTramite === t.id ? null : t.id)}>
                Requisitos
              </Button>
            </div>
          </div>

          {/* Requisitos expandibles */}
          {expandedTramite === t.id && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Requisitos del trámite</p>
                <Button size="sm" icon={<Plus size={12} />} onClick={() => onAgregarReq(t)}>Agregar requisito</Button>
              </div>
              {t.requisitos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg">
                  No hay requisitos. El ciudadano no tendrá que adjuntar documentos.
                </p>
              ) : (
                <div className="space-y-2">
                  {t.requisitos.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-700">{r.nombre}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.obligatorio ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                            {r.obligatorio ? 'Obligatorio' : 'Opcional'}
                          </span>
                        </div>
                        {r.descripcion && <p className="text-xs text-gray-400 mt-0.5">{r.descripcion}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" icon={<Pencil size={11} />} onClick={() => onEditarReq(t, r)}>Editar</Button>
                        <Button size="sm" variant="ghost" icon={<Trash2 size={11} />} onClick={() => onEliminarReq(r)} className="text-red-500">Eliminar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}