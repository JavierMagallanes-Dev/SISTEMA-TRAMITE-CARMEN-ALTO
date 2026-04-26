// src/pages/ConsultaPage.tsx

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate }      from 'react-router-dom';
import { portalService }               from '../services/portal.service';
import Alert                           from '../components/ui/Alert';
import Spinner                         from '../components/ui/Spinner';
import Button                          from '../components/ui/Button';
import EstadoBadge                     from '../components/shared/EstadoBadge';
import TimelineMovimientos             from '../components/shared/TimelineMovimientos';
import { formatFecha, formatFechaHora, colorDiasRestantes } from '../utils/formato';
import type { EstadoExpediente, Movimiento } from '../types';
import {
  Building2, Search, Download, ArrowLeft,
  Calendar, User, FileText, Printer,
  AlertCircle, Upload, X, CheckCircle,
  CreditCard, ImageIcon,
} from 'lucide-react';

const VITE_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface Pago {
  id:              number;
  boleta:          string;
  monto_cobrado:   number;
  estado:          string;
  fecha_pago:      string;
  url_comprobante: string | null;
}

interface ExpedientePublico {
  id:                        number;
  codigo:                    string;
  estado:                    EstadoExpediente;
  fecha_registro:            string;
  fecha_limite:              string;
  fecha_resolucion:          string | null;
  url_pdf_firmado:           string | null;
  codigo_verificacion_firma: string | null;
  dias_restantes:            number;
  vencido:                   boolean;
  ciudadano:                 { nombres: string; apellido_pat: string };
  tipoTramite:               { nombre: string; plazo_dias: number; costo_soles: number };
  areaActual:                { nombre: string; sigla: string } | null;
  pagos:                     Pago[];
  movimientos:               Movimiento[];
}

export default function ConsultaPage() {
  const { codigo: codigoParam } = useParams<{ codigo: string }>();
  const navigate                = useNavigate();

  const [codigo,     setCodigo]     = useState(codigoParam?.toUpperCase() ?? '');
  const [expediente, setExpediente] = useState<ExpedientePublico | null>(null);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // Subida de documentos faltantes (OBSERVADO)
  const [archivos,     setArchivos]     = useState<File[]>([]);
  const [subiendoDocs, setSubiendoDocs] = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  // Subida de comprobante de pago (PENDIENTE_PAGO)
  const [comprobante,       setComprobante]       = useState<File | null>(null);
  const [subiendoComp,      setSubiendoComp]      = useState(false);
  const comprobanteInputRef                        = useRef<HTMLInputElement>(null);

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

  const descargarCargo = (codigo: string) => {
    window.open(`${VITE_API_URL}/recepcion/cargo/publico/${codigo}`, '_blank');
  };

  // ── Documentos faltantes (OBSERVADO) ────────────────────────
  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const validos = files.filter((f) => {
      if (f.type !== 'application/pdf') { setError(`"${f.name}" no es un PDF.`); return false; }
      if (f.size > 10 * 1024 * 1024)   { setError(`"${f.name}" supera los 10MB.`); return false; }
      return true;
    });
    setArchivos(prev => [...prev, ...validos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const quitarArchivo = (index: number) => setArchivos(prev => prev.filter((_, i) => i !== index));

  const handleSubirDocumentos = async () => {
    if (!expediente || archivos.length === 0) return;
    setSubiendoDocs(true);
    try {
      for (const archivo of archivos) {
        const formData = new FormData();
        formData.append('archivo', archivo);
        await fetch(`${VITE_API_URL}/documentos/subir/${expediente.id}`, { method: 'POST', body: formData });
      }
      setSuccess(`${archivos.length} documento(s) enviado(s) correctamente. La municipalidad los revisará pronto.`);
      setArchivos([]);
      consultar(expediente.codigo);
    } catch {
      setError('Error al subir los documentos. Intenta nuevamente.');
    } finally {
      setSubiendoDocs(false);
    }
  };

  // ── Comprobante de pago (PENDIENTE_PAGO) ────────────────────
  const handleComprobanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!tiposPermitidos.includes(file.type)) {
      setError('Solo se aceptan imágenes (JPG, PNG) o PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar los 10MB.');
      return;
    }
    setComprobante(file);
    if (comprobanteInputRef.current) comprobanteInputRef.current.value = '';
  };

  const handleSubirComprobante = async () => {
    if (!expediente || !comprobante) return;
    setSubiendoComp(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('comprobante', comprobante);
      const res = await fetch(`${VITE_API_URL}/portal/comprobante/${expediente.codigo}`, {
        method: 'POST',
        body:   formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al subir el comprobante.');
      }
      setSuccess('¡Comprobante enviado! El cajero revisará y verificará tu pago pronto.');
      setComprobante(null);
      consultar(expediente.codigo);
    } catch (err: any) {
      setError(err.message ?? 'Error al subir el comprobante. Intenta nuevamente.');
    } finally {
      setSubiendoComp(false);
    }
  };

  const obtenerObservacion = () => {
    if (!expediente) return null;
    const movObs = [...expediente.movimientos].reverse().find((m) => m.tipo_accion === 'OBSERVACION');
    return movObs?.comentario ?? null;
  };

  // Verificar si ya subió comprobante
  const yaSubioComprobante = expediente?.pagos?.some((p) => p.url_comprobante) ?? false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Municipalidad Distrital de Carmen Alto</p>
              <p className="text-xs text-blue-600">Consulta de Trámite</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate('/portal')}>
            Volver
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 sm:px-6 sm:py-8">

        {/* Buscador */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Consultar estado del expediente</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <input
              type="text"
              placeholder="EXP-2026-000001"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && consultar(codigo)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            />
            <Button icon={<Search size={14} />} onClick={() => consultar(codigo)} loading={cargando}
              className="w-full sm:w-auto justify-center">
              Consultar
            </Button>
          </div>
        </div>

        {error   && <Alert type="error"   message={error}   onClose={() => setError('')}   />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
        {cargando && <Spinner text="Buscando expediente..." />}

        {/* Resultado */}
        {expediente && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              {/* Cabecera */}
              <div className="p-5 sm:p-6 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-lg font-bold text-blue-600">{expediente.codigo}</p>
                    <p className="text-base font-semibold text-gray-800 mt-0.5">{expediente.tipoTramite.nombre}</p>
                  </div>
                  <EstadoBadge estado={expediente.estado} />
                </div>
              </div>

              {/* Info */}
              <div className="p-5 sm:p-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 border-b border-gray-100">
                <div className="flex items-start gap-2">
                  <User size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Ciudadano</p>
                    <p className="font-medium text-gray-800">{expediente.ciudadano.nombres} {expediente.ciudadano.apellido_pat}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Área actual</p>
                    <p className="font-medium text-gray-800">{expediente.areaActual?.nombre ?? 'Mesa de Partes'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Fecha de registro</p>
                    <p className="font-medium text-gray-800">{formatFecha(expediente.fecha_registro)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Fecha límite</p>
                    <p className={`font-medium ${colorDiasRestantes(expediente.dias_restantes)}`}>
                      {formatFecha(expediente.fecha_limite)}
                      <span className="text-xs ml-1 font-normal text-gray-400">
                        ({expediente.vencido ? `vencido hace ${Math.abs(expediente.dias_restantes)}d` : `${expediente.dias_restantes}d restantes`})
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* ── SECCIÓN PENDIENTE_PAGO — Subir comprobante ── */}
              {expediente.estado === 'PENDIENTE_PAGO' && (
                <div className="mx-4 my-4 sm:mx-6 sm:my-5 rounded-xl overflow-hidden border border-blue-200">
                  {/* Header sección */}
                  <div className="bg-blue-600 px-4 py-3 flex items-center gap-2">
                    <CreditCard size={16} className="text-white shrink-0" />
                    <p className="text-sm font-bold text-white">Pago del Trámite</p>
                  </div>

                  <div className="bg-blue-50 p-4 space-y-4">
                    {/* Monto */}
                    <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-blue-100">
                      <div>
                        <p className="text-xs text-gray-500">Monto a pagar</p>
                        <p className="text-xl font-bold text-blue-700">
                          S/ {Number(expediente.tipoTramite.costo_soles).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Trámite</p>
                        <p className="text-xs font-medium text-gray-700 max-w-150px text-right">{expediente.tipoTramite.nombre}</p>
                      </div>
                    </div>

                    {/* Opciones de pago */}
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Opciones de pago:</p>
                      <div className="space-y-1 text-xs text-gray-600">
                        <p>🏦 Depósito o transferencia bancaria</p>
                        <p>📱 Yape o Plin al número de la municipalidad</p>
                        <p>🏢 Presencialmente en ventanilla de Caja</p>
                      </div>
                    </div>

                    {/* Ya subió comprobante */}
                    {yaSubioComprobante ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                        <CheckCircle size={18} className="text-green-600 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-green-800">Comprobante recibido</p>
                          <p className="text-xs text-green-600 mt-0.5">El cajero revisará y verificará tu pago pronto.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-blue-800">
                          Adjunta tu comprobante de pago para agilizar la verificación:
                        </p>

                        {comprobante ? (
                          <div className="flex items-center gap-3 p-3 bg-white border border-blue-200 rounded-lg">
                            <ImageIcon size={16} className="text-blue-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-blue-700 truncate">{comprobante.name}</p>
                              <p className="text-xs text-gray-400">{(comprobante.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button onClick={() => setComprobante(null)} className="text-gray-400 hover:text-red-500">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => comprobanteInputRef.current?.click()}
                            className="border-2 border-dashed border-blue-300 rounded-lg p-5 text-center cursor-pointer hover:bg-blue-100 transition-colors"
                          >
                            <Upload size={22} className="mx-auto text-blue-400 mb-2" />
                            <p className="text-sm text-blue-600 font-medium">Toca para adjuntar comprobante</p>
                            <p className="text-xs text-blue-400 mt-1">JPG, PNG o PDF — Máx. 10MB</p>
                          </div>
                        )}

                        <input
                          ref={comprobanteInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={handleComprobanteChange}
                        />

                        {comprobante && (
                          <Button
                            variant="primary"
                            icon={<CheckCircle size={14} />}
                            loading={subiendoComp}
                            onClick={handleSubirComprobante}
                            className="w-full justify-center"
                          >
                            Enviar comprobante al cajero
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── SECCIÓN OBSERVADO ─────────────────────── */}
              {expediente.estado === 'OBSERVADO' && (
                <div className="mx-4 my-4 sm:mx-6 sm:my-5 bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-orange-800">Tu trámite fue observado</p>
                      <p className="text-xs text-orange-600 mt-0.5">
                        La municipalidad requiere documentos adicionales para continuar.
                      </p>
                    </div>
                  </div>

                  {obtenerObservacion() && (
                    <div className="bg-white border border-orange-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 font-medium mb-1">Documentos requeridos:</p>
                      <p className="text-sm text-gray-800">{obtenerObservacion()}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-orange-700">Adjunta los documentos solicitados (PDF):</p>

                    {archivos.length > 0 && (
                      <div className="space-y-2">
                        {archivos.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-orange-200">
                            <FileText size={14} className="text-blue-500 shrink-0" />
                            <p className="text-xs text-gray-700 truncate flex-1">{f.name}</p>
                            <button onClick={() => quitarArchivo(i)} className="text-gray-400 hover:text-red-500">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-orange-300 rounded-lg p-4 text-center cursor-pointer hover:bg-orange-100 transition-colors"
                    >
                      <Upload size={20} className="mx-auto text-orange-400 mb-1" />
                      <p className="text-xs text-orange-600">Haz clic para agregar PDFs (Máx 10MB c/u)</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={handleArchivoChange} />

                    {archivos.length > 0 && (
                      <Button variant="primary" icon={<CheckCircle size={14} />}
                        loading={subiendoDocs} onClick={handleSubirDocumentos}
                        className="w-full justify-center">
                        Enviar {archivos.length} documento(s) a la municipalidad
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Cargo de recepción */}
              <div className="mx-4 mb-4 sm:mx-6 sm:mb-5 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Printer size={15} className="text-gray-500" />
                      Cargo de recepción
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Constancia oficial de presentación de tu trámite</p>
                  </div>
                  <Button size="sm" variant="secondary" icon={<Download size={13} />}
                    onClick={() => descargarCargo(expediente.codigo)}>
                    Descargar
                  </Button>
                </div>
              </div>

              {/* PDF firmado */}
              {expediente.url_pdf_firmado && (
                <div className="mx-4 mb-4 sm:mx-6 sm:mb-5 bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-800">✅ Documento resuelto y firmado digitalmente</p>
                      {expediente.fecha_resolucion && (
                        <p className="text-xs text-green-600 mt-0.5">Resuelto el {formatFechaHora(expediente.fecha_resolucion)}</p>
                      )}
                      {expediente.codigo_verificacion_firma && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">Código: {expediente.codigo_verificacion_firma}</p>
                      )}
                    </div>
                    <a href={expediente.url_pdf_firmado} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700">
                      <Download size={14} />Descargar resolución
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Historial del trámite</h3>
              <TimelineMovimientos movimientos={expediente.movimientos} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}