// src/components/areas/BandejaAreas.tsx
// Lista de tarjetas de expedientes en la bandeja del área.

import { Card } from '../ui/Card';
import Button       from '../ui/Button';
import EstadoBadge  from '../shared/EstadoBadge';
import { FileText, Clock, Eye, Play, CheckCircle, AlertCircle, XCircle, Paperclip, Archive, PenLine } from 'lucide-react';
import { formatFecha, diasRestantes, colorDiasRestantes } from '../../utils/formato';
import type { ExpedienteBandeja } from '../../hooks/useAreas';

interface Props {
  bandeja:              ExpedienteBandeja[];
  esJefe:                boolean;
  onVerDetalle:         (id: number) => void;
  onTomar:              (exp: ExpedienteBandeja) => void;
  onReactivar:          (exp: ExpedienteBandeja) => void;
  onAdjuntar:           (exp: ExpedienteBandeja) => void;
  onObservar:           (exp: ExpedienteBandeja) => void;
  onRechazar:           (exp: ExpedienteBandeja) => void;
  onVistoBueno:         (exp: ExpedienteBandeja) => void;
  onFirmar:             (exp: ExpedienteBandeja) => void;
  onFirmarTecnico:      (exp: ExpedienteBandeja) => void; // Nueva prop
  onArchivar:           (exp: ExpedienteBandeja) => void;
}

export default function BandejaAreas({
  bandeja, esJefe,
  onVerDetalle, onTomar, onReactivar, onAdjuntar,
  onObservar, onRechazar, onVistoBueno, onFirmar,
  onFirmarTecnico, onArchivar,
}: Props) {
  if (bandeja.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-400">
          <FileText size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay expedientes en tu bandeja.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {bandeja.map((exp) => {
        const dias = diasRestantes(exp.fecha_limite);
        return (
          <Card key={exp.id}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-blue-600">{exp.codigo}</span>
                  <EstadoBadge estado={exp.estado} size="sm" />
                </div>
                <p className="text-sm font-medium text-gray-800">{exp.tipoTramite.nombre}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {exp.ciudadano.nombres} {exp.ciudadano.apellido_pat} · DNI {exp.ciudadano.dni}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock size={11} />{formatFecha(exp.fecha_registro)}</span>
                  <span className={`font-medium ${colorDiasRestantes(dias)}`}>
                    {dias < 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d restantes`}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 max-w-full">
                <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => onVerDetalle(exp.id)}>Ver</Button>

                {/* ── Acciones para el Técnico ── */}
                {!esJefe && exp.estado === 'DERIVADO'   && (
                  <Button size="sm" icon={<Play size={13} />} onClick={() => onTomar(exp)}>Tomar</Button>
                )}
                {!esJefe && exp.estado === 'OBSERVADO'  && (
                  <Button size="sm" icon={<CheckCircle size={13} />} onClick={() => onReactivar(exp)}>Reactivar</Button>
                )}
                {!esJefe && exp.estado === 'EN_PROCESO' && (
                  <>
                    <Button size="sm" variant="secondary" icon={<Paperclip   size={13} />} onClick={() => onAdjuntar(exp)}>Adjuntar</Button>
                    <Button size="sm" variant="secondary" icon={<AlertCircle size={13} />} onClick={() => onObservar(exp)}>Observar</Button>
                    <Button size="sm" variant="danger"    icon={<XCircle     size={13} />} onClick={() => onRechazar(exp)}>Rechazar</Button>
                    {/* Cambio principal aquí: Enviar al Jefe -> Firmar y enviar al Jefe */}
                    <Button size="sm" icon={<PenLine size={13} />} onClick={() => onFirmarTecnico(exp)}>
                      Firmar y enviar al Jefe
                    </Button>
                  </>
                )}

                {/* ── Acciones para el Jefe de Área ── */}
                {esJefe && exp.estado === 'EN_PROCESO'    && (
                  <>
                    <Button size="sm" variant="secondary" icon={<Paperclip   size={13} />} onClick={() => onAdjuntar(exp)}>Adjuntar</Button>
                    <Button size="sm" icon={<CheckCircle size={13} />} onClick={() => onVistoBueno(exp)}>Visto bueno</Button>
                  </>
                )}
                {esJefe && exp.estado === 'LISTO_DESCARGA' && (
                  <Button size="sm" icon={<PenLine size={13} />} onClick={() => onFirmar(exp)}>Firmar expediente</Button>
                )}
                {esJefe && exp.estado === 'RESUELTO' && (
                  <Button size="sm" variant="secondary" icon={<Archive size={13} />} onClick={() => onArchivar(exp)}>Archivar</Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}