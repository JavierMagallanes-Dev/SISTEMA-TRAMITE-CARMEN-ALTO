// src/pages/ConsultaPage.tsx
// Página pública de consulta de expediente por código.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { portalService }          from '../services/portal.service';
import Alert                      from '../components/ui/Alert';
import Spinner                    from '../components/ui/Spinner';
import Button                     from '../components/ui/Button';
import EstadoBadge                from '../components/shared/EstadoBadge';
import TimelineMovimientos        from '../components/shared/TimelineMovimientos';
import { formatFecha, formatFechaHora, diasRestantes, colorDiasRestantes } from '../utils/formato';
import type { EstadoExpediente, Movimiento } from '../types';
import { Building2, Search, Download, ArrowLeft, Calendar, User, FileText } from 'lucide-react';

interface ExpedientePublico {
  id:                       number;
  codigo:                   string;
  estado:                   EstadoExpediente;
  fecha_registro:           string;
  fecha_limite:             string;
  fecha_resolucion:         string | null;
  url_pdf_firmado:          string | null;
  codigo_verificacion_firma: string | null;
  dias_restantes:           number;
  vencido:                  boolean;
  ciudadano:                { nombres: string; apellido_pat: string };
  tipoTramite:              { nombre: string; plazo_dias: number };
  areaActual:               { nombre: string; sigla: string } | null;
  movimientos:              Movimiento[];
}

export default function ConsultaPage() {
  const { codigo: codigoParam } = useParams<{ codigo: string }>();
  const navigate                = useNavigate();

  const [codigo,     setCodigo]     = useState(codigoParam?.toUpperCase() ?? '');
  const [expediente, setExpediente] = useState<ExpedientePublico | null>(null);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState('');

  const consultar = async (cod: string) => {
    if (!cod.trim()) return;
    setCargando(true);
    setError('');
    setExpediente(null);
    try {
      const data = await portalService.consultarEstado(cod.trim().toUpperCase());
      setExpediente(data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'No se encontró ningún expediente con ese código.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (codigoParam) consultar(codigoParam);
  }, [codigoParam]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Municipalidad Distrital de Carmen Alto</p>
              <p className="text-xs text-blue-600">Consulta de Trámite</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate('/portal')}>
            Volver al portal
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Buscador */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Consultar estado del expediente</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="EXP-2026-000001"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && consultar(codigo)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            />
            <Button icon={<Search size={14} />} onClick={() => consultar(codigo)} loading={cargando}>
              Consultar
            </Button>
          </div>
        </div>

        {error && <Alert type="error" message={error} />}

        {cargando && <Spinner text="Buscando expediente..." />}

        {/* Resultado */}
        {expediente && (
          <div className="space-y-4">
            {/* Card resumen */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-lg font-bold text-blue-600">{expediente.codigo}</p>
                    <p className="text-base font-semibold text-gray-800 mt-0.5">{expediente.tipoTramite.nombre}</p>
                  </div>
                  <EstadoBadge estado={expediente.estado} />
                </div>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <User size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Ciudadano</p>
                    <p className="font-medium text-gray-800">
                      {expediente.ciudadano.nombres} {expediente.ciudadano.apellido_pat}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FileText size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Área actual</p>
                    <p className="font-medium text-gray-800">
                      {expediente.areaActual?.nombre ?? 'Sin asignar'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Fecha de registro</p>
                    <p className="font-medium text-gray-800">{formatFecha(expediente.fecha_registro)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Fecha límite</p>
                    <p className={`font-medium ${colorDiasRestantes(expediente.dias_restantes)}`}>
                      {formatFecha(expediente.fecha_limite)}
                      {' '}
                      <span className="text-xs">
                        ({expediente.vencido
                          ? `vencido hace ${Math.abs(expediente.dias_restantes)}d`
                          : `${expediente.dias_restantes}d restantes`})
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* PDF firmado disponible */}
              {expediente.url_pdf_firmado && (
                <div className="mx-6 mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        ✅ Documento resuelto y firmado digitalmente
                      </p>
                      {expediente.fecha_resolucion && (
                        <p className="text-xs text-green-600 mt-0.5">
                          Resuelto el {formatFechaHora(expediente.fecha_resolucion)}
                        </p>
                      )}
                      {expediente.codigo_verificacion_firma && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          Código de verificación: {expediente.codigo_verificacion_firma}
                        </p>
                      )}
                    </div>
                    <a
                      href={expediente.url_pdf_firmado}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      <Download size={14} />
                      Descargar PDF
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Historial del trámite</h3>
              <TimelineMovimientos movimientos={expediente.movimientos} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}