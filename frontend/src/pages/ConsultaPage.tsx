// src/pages/ConsultaPage.tsx
// Consulta pública de expedientes · Carmen Alto
// Rediseño visual sobrio gobierno. Lógica del backend INTACTA.

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate }      from 'react-router-dom';
import { portalService }               from '../services/portal.service';
import Spinner                         from '../components/ui/Spinner';
import Button                          from '../components/ui/Button';
import EstadoBadge                     from '../components/shared/EstadoBadge';
import TimelineMovimientos             from '../components/shared/TimelineMovimientos';
import StripePago                      from '../components/shared/StripePago';
import { toast }                       from '../utils/toast';
import { formatFecha, formatFechaHora, colorDiasRestantes } from '../utils/formato';
import type { EstadoExpediente, Movimiento } from '../types';
import {
  Search, Download, ArrowLeft,
  User, FileText, Printer,
  AlertCircle, Upload, X, CheckCircle,
  CreditCard, ImageIcon, ShieldCheck, Phone, Clock,
} from 'lucide-react';
import logoCA from '../assets/logoCA.webp';

const VITE_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const PRIMARY        = '#216ece';
const PRIMARY_DARKER = '#143f7a';
const ACCENT         = '#4abdef';
const TINT           = '#eaf2fb';

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

type OpcionPago = 'seleccion' | 'comprobante' | 'stripe';

/* ───────── Helpers de UI ───────── */

const stepFromEstado = (estado: EstadoExpediente): number => {
  switch (estado) {
    case 'PENDIENTE_PAGO':  return 1;
    case 'EN_PROCESO':     return 2;
    case 'OBSERVADO':       return 2;
    case 'RESUELTO':        return 3;
    case 'ARCHIVADO':       return 3;
    default:                return 0;
  }
};

const Stepper = ({ currentStep }: { currentStep: number }) => {
  const steps = ['Recibido', 'Pago', 'En área', 'Resuelto'];
  return (
    <div className="flex items-center mt-5 relative z-10">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className="w-3.5 h-3.5 rounded-full border-2 transition-all"
              style={{
                background:    i < currentStep ? PRIMARY : i === currentStep ? 'white' : 'white',
                borderColor:   i <= currentStep ? PRIMARY : '#cbd5e1',
                boxShadow:     i === currentStep ? `0 0 0 4px rgba(33,110,206,.18)` : i < currentStep ? `0 0 0 3px rgba(33,110,206,.15)` : 'none',
              }}
            />
            <span
              className={`mt-1.5 text-[10px] whitespace-nowrap ${i === currentStep ? 'font-bold text-white' : i < currentStep ? 'font-medium text-white/85' : 'font-medium text-white/55'}`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="h-0.5 flex-1 mx-1.5 -mt-4"
              style={{ background: i < currentStep ? PRIMARY : '#e2e8f0' }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

/* ───────── Page ───────── */

export default function ConsultaPage() {
  const { codigo: codigoParam } = useParams<{ codigo: string }>();
  const navigate                = useNavigate();

  const [codigo,     setCodigo]     = useState(codigoParam?.toUpperCase() ?? '');
  const [expediente, setExpediente] = useState<ExpedientePublico | null>(null);
  const [cargando,   setCargando]   = useState(false);

  const [archivos,     setArchivos]     = useState<File[]>([]);
  const [subiendoDocs, setSubiendoDocs] = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  const [opcionPago,        setOpcionPago]        = useState<OpcionPago>('seleccion');
  const [comprobante,       setComprobante]        = useState<File | null>(null);
  const [subiendoComp,      setSubiendoComp]       = useState(false);
  const [comprobanteSubido, setComprobanteSubido]  = useState(false);
  const comprobanteInputRef                         = useRef<HTMLInputElement>(null);

  const consultar = async (cod: string) => {
    if (!cod.trim()) return;
    setCargando(true);
    setExpediente(null);
    setOpcionPago('seleccion');
    setComprobanteSubido(false);
    try {
      const data = await portalService.consultarEstado(cod.trim().toUpperCase());
      setExpediente(data);
    } catch (err: any) {
      toast.error({ titulo: err?.response?.data?.error ?? 'No se encontró ningún expediente con ese código.' });
    } finally { setCargando(false); }
  };

  useEffect(() => {
    if (codigoParam) consultar(codigoParam);
  }, [codigoParam]);

  const descargarCargo = (codigo: string) => {
    window.open(`${VITE_API_URL}/recepcion/cargo/publico/${codigo}`, '_blank');
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files   = Array.from(e.target.files ?? []);
    const validos = files.filter((f) => {
      if (f.type !== 'application/pdf') { toast.warning({ titulo: `"${f.name}" no es un PDF.` }); return false; }
      if (f.size > 10 * 1024 * 1024)   { toast.warning({ titulo: `"${f.name}" supera los 10MB.` }); return false; }
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
      toast.success({ titulo: 'Documentos enviados', descripcion: `${archivos.length} documento(s) enviado(s) correctamente.` });
      setArchivos([]);
      consultar(expediente.codigo);
    } catch {
      toast.error({ titulo: 'Error al subir los documentos.' });
    } finally { setSubiendoDocs(false); }
  };

  const handleComprobanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!tiposPermitidos.includes(file.type)) { toast.warning({ titulo: 'Solo se aceptan imágenes o PDF.' }); return; }
    if (file.size > 10 * 1024 * 1024) { toast.warning({ titulo: 'El archivo no puede superar los 10MB.' }); return; }
    setComprobante(file);
    if (comprobanteInputRef.current) comprobanteInputRef.current.value = '';
  };

  const handleSubirComprobante = async () => {
    if (!expediente || !comprobante) return;
    setSubiendoComp(true);
    try {
      const formData = new FormData();
      formData.append('comprobante', comprobante);
      const res = await fetch(`${VITE_API_URL}/portal/comprobante/${expediente.codigo}`, {
        method: 'POST', body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al subir el comprobante.');
      }
      setComprobanteSubido(true);
      setComprobante(null);
      toast.success({ titulo: '¡Comprobante enviado!', descripcion: 'El cajero lo revisará y verificará tu pago pronto.' });
      consultar(expediente.codigo);
    } catch (err: any) {
      toast.error({ titulo: err.message ?? 'Error al subir el comprobante.' });
    } finally { setSubiendoComp(false); }
  };

  const obtenerObservacion = () => {
    if (!expediente) return null;
    const movObs = [...expediente.movimientos].reverse().find((m) => m.tipo_accion === 'OBSERVACION');
    return movObs?.comentario ?? null;
  };

  const yaSubioComprobante = expediente?.pagos?.some((p) => p.url_comprobante) ?? false;

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 sm:px-6 sm:py-8">

        {/* ═══════ Buscador ═══════ */}
        {!expediente && !cargando ? (
          /* Hero buscador (estado inicial sin expediente) */
          <div className="space-y-5">
            <div className="relative rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(33,110,206,0.20)]">
              <div
                className="absolute inset-0"
                style={{
                  background: `
                    radial-gradient(circle at 92% 0%, rgba(74,189,239,.18) 0%, transparent 55%),
                    radial-gradient(circle at 0% 95%, rgba(74,189,239,.10) 0%, transparent 60%),
                    linear-gradient(135deg, ${PRIMARY_DARKER} 0%, ${PRIMARY} 65%, #2a82e8 100%)
                  `,
                }}
              />
              <div className="relative p-7 sm:p-9 text-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 mb-2">
                  Plataforma oficial
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-1">
                  Consulta el estado de tu trámite
                </h1>
                <p className="text-sm text-white/85 mb-6 max-w-lg">
                  Ingresa tu código de expediente para ver en qué área se encuentra, sus movimientos y descargar tu resolución.
                </p>

                <div className="bg-white rounded-xl p-2 flex items-center gap-2 max-w-xl shadow-md">
                  <div className="pl-3 text-slate-400">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="EXP-2026-000001"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && consultar(codigo)}
                    className="flex-1 px-2 py-2.5 outline-none text-sm font-semibold tracking-wider text-slate-800 placeholder:text-slate-400"
                    style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
                  />
                  <Button
                    onClick={() => consultar(codigo)}
                    loading={cargando}
                    className="shrink-0"
                  >
                    Consultar
                  </Button>
                </div>
                <p className="text-[11px] text-white/65 mt-3">
                  Tu código aparece en el cargo de recepción que recibiste al presentar tu expediente.
                </p>
              </div>
            </div>

            {/* helpers */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { Icon: FileText, t: 'Cargo de recepción', d: 'El código está en la esquina superior del PDF que recibiste.' },
                { Icon: Phone,    t: 'Mesa de Partes',     d: '(066) 123-456 — L a V de 8:00 a 16:30' },
                { Icon: Clock,    t: '¿Aún no presentaste?', d: 'Inicia un nuevo trámite desde el portal en pocos pasos.' },
              ].map(({ Icon, t, d }) => (
                <div key={t} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: TINT, color: PRIMARY }}
                  >
                    <Icon size={16} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mt-3">{t}</p>
                  <p className="text-xs text-slate-500 mt-1">{d}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Buscador compacto (cuando hay expediente o cargando) */
          <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 flex items-center gap-2 shadow-sm">
            <div className="pl-1 text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="EXP-2026-000001"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && consultar(codigo)}
              className="flex-1 px-1 py-1.5 outline-none text-sm font-semibold text-slate-800"
              style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
            />
            <Button size="sm" onClick={() => consultar(codigo)} loading={cargando}>
              Consultar
            </Button>
          </div>
        )}

        {cargando && <Spinner text="Buscando expediente..." />}

        {/* ═══════ Expediente ═══════ */}
        {expediente && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              {/* ─── Banner header con código + estado + stepper ─── */}
              <div
                className="relative px-5 sm:px-6 pt-5 pb-5 text-white overflow-hidden"
                style={{
                  background: `
                    radial-gradient(circle at 92% 0%, rgba(74,189,239,.18) 0%, transparent 55%),
                    radial-gradient(circle at 0% 95%, rgba(74,189,239,.10) 0%, transparent 60%),
                    linear-gradient(135deg, ${PRIMARY_DARKER} 0%, ${PRIMARY} 65%, #2a82e8 100%)
                  `,
                }}
              >
                <div className="relative z-10 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">
                      Expediente
                    </p>
                    <p
                      className="text-2xl font-bold mt-0.5 tracking-wide"
                      style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
                    >
                      {expediente.codigo}
                    </p>
                    <p className="text-sm text-white/85 mt-1.5 max-w-md">
                      {expediente.tipoTramite.nombre}
                    </p>
                  </div>
                  <EstadoBadge estado={expediente.estado} />
                </div>

                <Stepper currentStep={stepFromEstado(expediente.estado)} />
              </div>

              {/* ─── Meta grid ─── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
                <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <User size={10} /> Ciudadano
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-1 leading-tight">
                    {expediente.ciudadano.nombres} {expediente.ciudadano.apellido_pat}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Área actual
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    {expediente.areaActual?.nombre ?? 'Mesa de Partes'}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Registro
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    {formatFecha(expediente.fecha_registro)}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Plazo
                  </p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    {formatFecha(expediente.fecha_limite)}
                  </p>
                  <p className={`text-[11px] font-medium ${colorDiasRestantes(expediente.dias_restantes)}`}>
                    {expediente.vencido
                      ? `vencido hace ${Math.abs(expediente.dias_restantes)}d`
                      : `${expediente.dias_restantes}d restantes`}
                  </p>
                </div>
              </div>

              {/* ═══════ PENDIENTE_PAGO ═══════ */}
              {expediente.estado === 'PENDIENTE_PAGO' && (
                <div className="p-5 sm:p-6">
                  <div className="relative">
                    <div
                      className="absolute -inset-px rounded-2xl opacity-60 blur-xl pointer-events-none"
                      style={{ background: `linear-gradient(135deg, ${PRIMARY}40, ${ACCENT}40)` }}
                    />
                    <div className="relative bg-white rounded-2xl border border-[#c7d8f0] overflow-hidden">
                      {/* amount band */}
                      <div
                        className="px-5 py-4 border-b border-[#c7d8f0] flex items-center justify-between gap-4"
                        style={{ background: `linear-gradient(to right, ${TINT}, white)` }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                            style={{ background: PRIMARY }}
                          >
                            <CreditCard size={16} />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: PRIMARY_DARKER }}>
                              Monto a pagar
                            </p>
                            <p className="text-2xl font-bold" style={{ color: PRIMARY_DARKER }}>
                              S/ {Number(expediente.tipoTramite.costo_soles).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">Trámite</p>
                          <p className="text-xs font-medium text-slate-700 max-w-160px truncate">
                            {expediente.tipoTramite.nombre}
                          </p>
                        </div>
                      </div>

                      <div className="p-5">
                        {opcionPago === 'stripe' ? (
                          <div>
                            <StripePago
                              codigo={expediente.codigo}
                              onExito={() => {
                                toast.success({ titulo: '¡Pago procesado!', descripcion: 'Tu trámite ha sido activado automáticamente.' });
                                setOpcionPago('seleccion');
                                consultar(expediente.codigo);
                              }}
                              onCancel={() => setOpcionPago('seleccion')}
                            />
                          </div>
                        ) : (
                          <>
                            {yaSubioComprobante || comprobanteSubido ? (
                              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                  <CheckCircle size={20} className="text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-green-800">Comprobante recibido</p>
                                  <p className="text-xs text-green-700 mt-0.5">El cajero revisará y verificará tu pago pronto.</p>
                                </div>
                              </div>
                            ) : opcionPago === 'comprobante' ? (
                              <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-700">Adjunta tu comprobante de pago</p>

                                {comprobante ? (
                                  <div className="flex items-center gap-3 p-3 bg-white border border-orange-200 rounded-xl">
                                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                                      <ImageIcon size={16} className="text-orange-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-800 truncate">{comprobante.name}</p>
                                      <p className="text-[11px] text-slate-500">{(comprobante.size / 1024).toFixed(0)} KB · listo para enviar</p>
                                    </div>
                                    <button
                                      onClick={() => setComprobante(null)}
                                      className="text-slate-400 hover:text-rose-500 p-1"
                                      aria-label="Quitar archivo"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => comprobanteInputRef.current?.click()}
                                    className="rounded-xl p-5 text-center cursor-pointer transition-colors"
                                    style={{
                                      border: '1.5px dashed #fdba74',
                                      background: 'linear-gradient(180deg, #fffbf5, #fff7ed)',
                                    }}
                                  >
                                    <div className="w-9 h-9 rounded-lg bg-orange-100 mx-auto flex items-center justify-center">
                                      <Upload size={16} className="text-orange-500" />
                                    </div>
                                    <p className="text-sm font-semibold text-orange-700 mt-2">Toca para adjuntar</p>
                                    <p className="text-[11px] text-orange-600/80 mt-0.5">JPG, PNG, WEBP o PDF · máx 10MB</p>
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
                                  <button
                                    onClick={handleSubirComprobante}
                                    disabled={subiendoComp}
                                    className="w-full py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-60"
                                  >
                                    {subiendoComp ? 'Enviando…' : 'Enviar comprobante'}
                                  </button>
                                )}

                                <button
                                  onClick={() => { setOpcionPago('seleccion'); setComprobante(null); }}
                                  className="w-full text-xs text-slate-400 hover:text-slate-600"
                                >
                                  ← Volver a opciones de pago
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="text-xs font-bold text-slate-700 mb-3 text-center">¿Cómo deseas pagar?</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Comprobante */}
                                  <button
                                    onClick={() => setOpcionPago('comprobante')}
                                    className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all bg-white group"
                                  >
                                    <div className="flex items-center gap-2.5 mb-2">
                                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                                        <ImageIcon size={15} className="text-orange-500" />
                                      </div>
                                      <p className="text-sm font-bold text-slate-800">Adjuntar comprobante</p>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                      Yape, Plin, transferencia bancaria o depósito
                                    </p>
                                    <div className="text-[11px] font-semibold text-orange-600 flex items-center gap-1">
                                      <span>Subir imagen o PDF</span>
                                      <span aria-hidden>→</span>
                                    </div>
                                  </button>

                                  {/* Stripe (destacado) */}
                                  <button
                                    onClick={() => setOpcionPago('stripe')}
                                    className="text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden"
                                    style={{
                                      borderColor: PRIMARY,
                                      background: `linear-gradient(135deg, ${TINT}, white)`,
                                    }}
                                  >
                                    <span
                                      className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-white px-1.5 py-0.5 rounded-md"
                                      style={{ background: PRIMARY }}
                                    >
                                      Inmediato
                                    </span>
                                    <div className="flex items-center gap-2.5 mb-2">
                                      <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                                        style={{ background: PRIMARY }}
                                      >
                                        <CreditCard size={15} />
                                      </div>
                                      <p className="text-sm font-bold text-slate-800">Pago en línea</p>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                      Tarjeta de crédito o débito · Visa, Mastercard, Amex
                                    </p>
                                    <div
                                      className="text-[11px] font-semibold flex items-center gap-1.5"
                                      style={{ color: PRIMARY }}
                                    >
                                      <ShieldCheck size={11} />
                                      <span>Procesado por Stripe</span>
                                    </div>
                                  </button>
                                </div>

                                {/* presencial */}
                                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                                    <FileText size={15} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-amber-900">¿Prefieres pagar en persona?</p>
                                    <p className="text-[11px] text-amber-700">
                                      Acércate a Caja municipal con tu boleta. L–V de 8:00 a 16:30.
                                    </p>
                                  </div>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════ OBSERVADO ═══════ */}
              {expediente.estado === 'OBSERVADO' && (
                <div className="p-5 sm:p-6">
                  <div className="rounded-2xl bg-linear-to-b from-amber-50 to-white border border-amber-200 overflow-hidden">
                    <div className="px-5 py-3.5 bg-amber-100/70 border-b border-amber-200 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                        <AlertCircle size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-900">Tu trámite fue observado</p>
                        <p className="text-[11px] text-amber-700">Se requieren documentos adicionales para continuar.</p>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Requerimiento */}
                      {obtenerObservacion() && (
                        <div className="rounded-xl bg-white border border-amber-200 p-4 relative">
                          <div className="absolute -top-2 left-4 px-2 bg-white text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            Requerimiento del área
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {obtenerObservacion()}
                          </p>
                        </div>
                      )}

                      {/* Lista de archivos */}
                      {archivos.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-amber-900 mb-2">
                            Documentos seleccionados ({archivos.length})
                          </p>
                          <div className="space-y-2">
                            {archivos.map((f, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-xl">
                                <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                                  <FileText size={15} className="text-rose-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{f.name}</p>
                                  <p className="text-[11px] text-slate-500">
                                    {(f.size / 1024).toFixed(0)} KB · listo para enviar
                                  </p>
                                </div>
                                <button
                                  onClick={() => quitarArchivo(i)}
                                  className="text-slate-400 hover:text-rose-500 p-1"
                                  aria-label="Quitar archivo"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dropzone */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl p-5 text-center cursor-pointer transition-colors"
                        style={{
                          border: '1.5px dashed #fcd34d',
                          background: 'linear-gradient(180deg, #fffdf5, #fffbeb)',
                        }}
                      >
                        <div className="w-9 h-9 rounded-lg bg-amber-100 mx-auto flex items-center justify-center">
                          <Upload size={16} className="text-amber-600" />
                        </div>
                        <p className="text-sm font-semibold text-amber-900 mt-2">
                          {archivos.length > 0 ? 'Agregar más PDFs' : 'Adjunta los documentos solicitados'}
                        </p>
                        <p className="text-[11px] text-amber-700/80 mt-0.5">
                          Arrastra archivos o haz clic — máximo 10 MB cada uno
                        </p>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        multiple
                        className="hidden"
                        onChange={handleArchivoChange}
                      />

                      {archivos.length > 0 && (
                        <Button
                          variant="primary"
                          icon={<CheckCircle size={14} />}
                          loading={subiendoDocs}
                          onClick={handleSubirDocumentos}
                          className="w-full justify-center"
                        >
                          Enviar {archivos.length} documento(s) al área
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════ RESUELTO con PDF firmado ═══════ */}
              {expediente.url_pdf_firmado && (
                <div className="p-5 sm:p-6">
                  <div
                    className="rounded-2xl border border-emerald-200 p-5 sm:p-6 relative overflow-hidden"
                    style={{
                      background: `
                        linear-gradient(135deg, rgba(22,163,74,.04), rgba(22,163,74,.02)),
                        repeating-linear-gradient(45deg, transparent 0 14px, rgba(22,163,74,.025) 14px 15px)
                      `,
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Sello */}
                      <div
                        className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-600 flex items-center justify-center shrink-0"
                        style={{ boxShadow: 'inset 0 0 0 4px white, 0 0 0 1px rgba(22,163,74,.2)' }}
                      >
                        <CheckCircle size={28} className="text-green-600" />
                      </div>

                      <div className="flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-700">
                          Trámite resuelto
                        </p>
                        <p className="text-base font-bold text-slate-900 mt-0.5">
                          Documento firmado digitalmente
                        </p>
                        {expediente.fecha_resolucion && (
                          <p className="text-xs text-slate-600 mt-1">
                            Resuelto el {formatFechaHora(expediente.fecha_resolucion)} · Firma electrónica vigente y verificable
                          </p>
                        )}
                      </div>

                      <a
                        href={expediente.url_pdf_firmado}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white shadow-md whitespace-nowrap bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        <Download size={14} />
                        Descargar resolución
                      </a>
                    </div>

                    {expediente.codigo_verificacion_firma && (
                      <div className="mt-4 pt-4 border-t border-emerald-200/60 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Código de verificación
                          </p>
                          <p
                            className="text-xs font-bold text-slate-800 mt-0.5"
                            style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
                          >
                            {expediente.codigo_verificacion_firma}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Firma electrónica
                          </p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: PRIMARY }}>
                            Vigente y verificable
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Cargo de recepción footer ─── */}
              <div className="border-t border-gray-100 px-5 sm:px-6 py-4 flex items-center justify-between gap-3 bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0"
                    style={{ color: PRIMARY }}
                  >
                    <Printer size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">Cargo de recepción</p>
                    <p className="text-[11px] text-slate-500 truncate">Constancia oficial de presentación</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Download size={13} />}
                  onClick={() => descargarCargo(expediente.codigo)}
                >
                  Descargar
                </Button>
              </div>
            </div>

            {/* ─── Timeline ─── */}
<div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-bold text-slate-800">Historial del trámite</h3>
    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
     {expediente.movimientos.filter((m) =>
  !['REGISTRO','VERIFICACION_PAGO','REVISION_MDP','DERIVACION','TOMA_EXPEDIENTE','VISTO_BUENO','SUBIDA_PDF_FIRMADO','ARCHIVADO'].includes(m.tipo_accion)
).length} movimiento(s)
    </span>
  </div>
  <TimelineMovimientos movimientos={expediente.movimientos} soloPublicos={true} />
</div>
          </div>
        )}
      </div>
    </div>
  );
}
