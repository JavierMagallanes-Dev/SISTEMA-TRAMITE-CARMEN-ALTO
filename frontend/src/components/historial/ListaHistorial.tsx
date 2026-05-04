// src/components/historial/ListaHistorial.tsx
import { Card }    from '../ui/Card';
import Button      from '../ui/Button';
import EstadoBadge from '../shared/EstadoBadge';
import { formatFecha } from '../../utils/formato';
import { Eye, Download, Archive } from 'lucide-react';
import type { ExpedienteHistorial } from '../../hooks/useHistorial';

interface Props {
  expedientes: ExpedienteHistorial[];
  onVerDetalle:(id: number) => void;
}

export default function ListaHistorial({ expedientes, onVerDetalle }: Props) {
  if (expedientes.length === 0) {
    return (
      <Card>
        <div className="text-center py-10 text-gray-400">
          <Archive size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay expedientes en el historial.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {expedientes.map((exp) => (
        <Card key={exp.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-blue-600">{exp.codigo}</span>
                <EstadoBadge estado={exp.estado} size="sm" />
              </div>
              <p className="text-sm font-medium text-gray-800">{exp.tipoTramite.nombre}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {exp.ciudadano.nombres} {exp.ciudadano.apellido_pat} · DNI {exp.ciudadano.dni}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>Registrado: {formatFecha(exp.fecha_registro)}</span>
                {exp.fecha_resolucion && (
                  <span className="text-green-600 font-medium">
                    Resuelto: {formatFecha(exp.fecha_resolucion)}
                  </span>
                )}
                {exp.areaActual && <span>Área: {exp.areaActual.nombre}</span>}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => onVerDetalle(exp.id)}>
                Ver detalle
              </Button>
              {exp.url_pdf_firmado && (
                <a href={exp.url_pdf_firmado} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                  <Download size={13} />PDF firmado
                </a>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}