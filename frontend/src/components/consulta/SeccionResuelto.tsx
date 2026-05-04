// src/components/consulta/SeccionResuelto.tsx
import { CheckCircle, Download } from 'lucide-react';
import { formatFechaHora }       from '../../utils/formato';
import { PRIMARY }               from '../../hooks/useConsulta';
import type { ExpedientePublico } from '../../hooks/useConsulta';

interface Props { expediente: ExpedientePublico; }

export default function SeccionResuelto({ expediente }: Props) {
  if (!expediente.url_pdf_firmado) return null;

  return (
    <div className="p-5 sm:p-6">
      <div className="rounded-2xl border border-emerald-200 p-5 sm:p-6 relative overflow-hidden" style={{
        background: `
          linear-gradient(135deg, rgba(22,163,74,.04), rgba(22,163,74,.02)),
          repeating-linear-gradient(45deg, transparent 0 14px, rgba(22,163,74,.025) 14px 15px)
        `,
      }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-600 flex items-center justify-center shrink-0"
            style={{ boxShadow: 'inset 0 0 0 4px white, 0 0 0 1px rgba(22,163,74,.2)' }}>
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-700">Trámite resuelto</p>
            <p className="text-base font-bold text-slate-900 mt-0.5">Documento firmado digitalmente</p>
            {expediente.fecha_resolucion && (
              <p className="text-xs text-slate-600 mt-1">
                Resuelto el {formatFechaHora(expediente.fecha_resolucion)} · Firma electrónica vigente y verificable
              </p>
            )}
          </div>
          <a href={expediente.url_pdf_firmado} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white shadow-md whitespace-nowrap bg-green-600 hover:bg-green-700 transition-colors">
            <Download size={14} />Descargar resolución
          </a>
        </div>
        {expediente.codigo_verificacion_firma && (
          <div className="mt-4 pt-4 border-t border-emerald-200/60 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Código de verificación</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5" style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                {expediente.codigo_verificacion_firma}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Firma electrónica</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: PRIMARY }}>Vigente y verificable</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}