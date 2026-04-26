// src/pages/PortalPage.tsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate }                  from 'react-router-dom';
import { portalService }                from '../services/portal.service';
import { documentosService }            from '../services/documentos.service';
import Button                           from '../components/ui/Button';
import Input                            from '../components/ui/Input';
import Alert                            from '../components/ui/Alert';
import Spinner                          from '../components/ui/Spinner';
import StripePago                       from '../components/shared/StripePago';
import {
  Building2, Search, FileText,
  ArrowRight, CheckCircle, Upload, X,
  CreditCard, ImageIcon, ExternalLink,
} from 'lucide-react';

const VITE_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface TipoTramite {
  id: number; nombre: string; descripcion: string | null;
  costo_soles: number; plazo_dias: number;
}

type OpcionPago = 'seleccion' | 'comprobante' | 'stripe' | 'exitoso';

export default function PortalPage() {
  const navigate = useNavigate();

  const [paso,    setPaso]    = useState<1 | 2 | 3>(1);
  const [tipos,   setTipos]   = useState<TipoTramite[]>([]);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [codigoGenerado,  setCodigoGenerado]  = useState('');
  const [tipoRegistrado,  setTipoRegistrado]  = useState<TipoTramite | null>(null);
  const [opcionPago,      setOpcionPago]      = useState<OpcionPago>('seleccion');

  const [codigoConsulta, setCodigoConsulta] = useState('');

  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoTramite | null>(null);
  const [form, setForm] = useState({
    dni: '', nombres: '', apellido_pat: '', apellido_mat: '',
    email: '', telefono: '',
  });
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [archivoPdf,  setArchivoPdf]  = useState<File | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // Comprobante de pago
  const [comprobante,       setComprobante]       = useState<File | null>(null);
  const [subiendoComp,      setSubiendoComp]      = useState(false);
  const [comprobanteSubido, setComprobanteSubido] = useState(false);
  const comprobanteInputRef                        = useRef<HTMLInputElement>(null);

  useEffect(() => {
    portalService.tiposTramite().then(setTipos).catch(() => {});
  }, []);

  const buscarDni = async () => {
    if (form.dni.length !== 8) return;
    setBuscandoDni(true);
    try {
      const res = await portalService.consultarDni(form.dni);
      const c   = res.datos || res.ciudadano;
      if (c) {
        setForm(prev => ({
          ...prev,
          nombres:      c.nombres      || '',
          apellido_pat: c.apellido_pat || c.apellidoPat || '',
          apellido_mat: c.apellido_mat || c.apellidoMat || '',
          email:        c.email        || '',
        }));
      }
    } catch { /* RENIEC no disponible */ }
    finally { setBuscandoDni(false); }
  };

  const handleRegistrar = async () => {
    if (!form.dni || !form.nombres || !form.apellido_pat || !form.email || !tipoSeleccionado) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    setLoading(true);
    try {
      const res = await portalService.registrar({ ...form, tipoTramiteId: String(tipoSeleccionado.id) });
      if (archivoPdf) {
        try { await documentosService.subirDocumento(res.expediente.id, archivoPdf); }
        catch { console.warn('No se pudo subir el PDF.'); }
      }
      setCodigoGenerado(res.expediente.codigo);
      setTipoRegistrado(tipoSeleccionado);
      setPaso(3);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al registrar el trámite.');
    } finally { setLoading(false); }
  };

  const setF = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Solo se aceptan archivos PDF.'); return; }
    if (file.size > 10 * 1024 * 1024)   { setError('El archivo no puede superar los 10MB.'); return; }
    setArchivoPdf(file);
  };

  const handleComprobanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!tiposPermitidos.includes(file.type)) { setError('Solo se aceptan imágenes (JPG, PNG) o PDF.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('El archivo no puede superar los 10MB.'); return; }
    setComprobante(file);
    if (comprobanteInputRef.current) comprobanteInputRef.current.value = '';
  };

  const handleSubirComprobante = async () => {
    if (!comprobante || !codigoGenerado) return;
    setSubiendoComp(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('comprobante', comprobante);
      const res = await fetch(`${VITE_API_URL}/portal/comprobante/${codigoGenerado}`, {
        method: 'POST', body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al subir el comprobante.');
      }
      setComprobanteSubido(true);
      setComprobante(null);
      setSuccess('¡Comprobante enviado! El cajero lo revisará y verificará tu pago pronto.');
    } catch (err: any) {
      setError(err.message ?? 'Error al subir el comprobante.');
    } finally { setSubiendoComp(false); }
  };

  const resetForm = () => {
    setPaso(1); setTipoSeleccionado(null); setArchivoPdf(null);
    setTipoRegistrado(null); setComprobante(null); setOpcionPago('seleccion');
    setComprobanteSubido(false); setError(''); setSuccess('');
    setForm({ dni: '', nombres: '', apellido_pat: '', apellido_mat: '', email: '', telefono: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Municipalidad Distrital de Carmen Alto</p>
              <p className="text-xs text-blue-600">Portal de Trámites Ciudadanos</p>
            </div>
          </div>
          <button onClick={() => navigate('/login')}
            className="text-xs text-gray-500 hover:text-gray-700 self-end sm:self-auto">
            Acceso personal →
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8 sm:space-y-8">

        {/* ── Consulta rápida ─────────────────────────────── */}
        <div className="bg-blue-600 rounded-2xl p-5 text-white sm:p-6">
          <h2 className="text-base font-bold mb-1 sm:text-lg">Consulta el estado de tu trámite</h2>
          <p className="text-blue-100 text-xs mb-4 sm:text-sm">Ingresa tu código de expediente</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <input type="text" placeholder="EXP-2026-000001" value={codigoConsulta}
              onChange={(e) => setCodigoConsulta(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && codigoConsulta && navigate(`/consulta/${codigoConsulta}`)}
              className="flex-1 px-4 py-2.5 rounded-lg text-gray-900 text-sm outline-none font-mono" />
            <button onClick={() => codigoConsulta && navigate(`/consulta/${codigoConsulta}`)}
              className="bg-white text-blue-600 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-blue-50 flex items-center justify-center gap-2">
              <Search size={15} />Consultar
            </button>
          </div>
        </div>

        {/* ── Formulario registro ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 sm:p-6">
            <h2 className="text-base font-bold text-gray-900 sm:text-lg">Registrar nuevo trámite</h2>
            <p className="text-xs text-gray-500 mt-0.5 sm:text-sm">Completa el formulario para iniciar tu trámite</p>
          </div>

          {/* Indicador de pasos */}
          <div className="flex border-b border-gray-100">
            {[{ num: 1, label: 'Trámite' }, { num: 2, label: 'Tus datos' }, { num: 3, label: 'Pago' }].map((p) => (
              <div key={p.num}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-xs font-medium sm:gap-2 sm:px-4 ${
                  paso === p.num ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : paso > p.num ? 'text-green-600' : 'text-gray-400'
                }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  paso > p.num ? 'bg-green-100 text-green-600' : paso === p.num ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
                }`}>
                  {paso > p.num ? '✓' : p.num}
                </span>
                <span className="hidden sm:inline">{p.label}</span>
              </div>
            ))}
          </div>

          <div className="p-5 sm:p-6">
            {error   && <Alert type="error"   message={error}   onClose={() => setError('')}   className="mb-4" />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess('')} className="mb-4" />}

            {/* ── Paso 1 ─────────────────────────────────── */}
            {paso === 1 && (
              <div className="space-y-3">
                {tipos.length === 0 ? <Spinner text="Cargando trámites..." /> : (
                  tipos.map((tipo) => (
                    <div key={tipo.id} onClick={() => setTipoSeleccionado(tipo)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        tipoSeleccionado?.id === tipo.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{tipo.nombre}</p>
                          {tipo.descripcion && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tipo.descripcion}</p>}
                          <p className="text-xs text-gray-400 mt-1">⏱ {tipo.plazo_dias} días hábiles</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-green-600 sm:text-lg">S/ {Number(tipo.costo_soles).toFixed(2)}</p>
                          {tipoSeleccionado?.id === tipo.id && <CheckCircle size={16} className="text-blue-500 ml-auto mt-1" />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex justify-end pt-2">
                  <Button icon={<ArrowRight size={14} />} onClick={() => {
                    if (!tipoSeleccionado) { setError('Selecciona un tipo de trámite.'); return; }
                    setError(''); setPaso(2);
                  }} className="w-full sm:w-auto justify-center">Continuar</Button>
                </div>
              </div>
            )}

            {/* ── Paso 2 ─────────────────────────────────── */}
            {paso === 2 && (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-gray-500">Trámite seleccionado</p>
                  <p className="font-semibold text-blue-700">{tipoSeleccionado?.nombre}</p>
                  <p className="text-green-600 font-bold">S/ {Number(tipoSeleccionado?.costo_soles).toFixed(2)}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 sm:items-end">
                  <div className="flex-1">
                    <Input label="DNI" placeholder="12345678" value={form.dni}
                      onChange={(e) => setF('dni', e.target.value)} maxLength={8} required />
                  </div>
                  <Button variant="secondary" icon={<Search size={14} />} loading={buscandoDni}
                    onClick={buscarDni} disabled={form.dni.length !== 8}
                    className="w-full sm:w-auto justify-center">Buscar DNI</Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input label="Nombres"          value={form.nombres}      onChange={(e) => setF('nombres', e.target.value)}      required />
                  <Input label="Apellido paterno" value={form.apellido_pat} onChange={(e) => setF('apellido_pat', e.target.value)} required />
                  <Input label="Apellido materno" value={form.apellido_mat} onChange={(e) => setF('apellido_mat', e.target.value)} />
                  <Input label="Teléfono"         value={form.telefono}     onChange={(e) => setF('telefono', e.target.value)}     placeholder="987654321" />
                </div>
                <Input label="Email" type="email" value={form.email}
                  onChange={(e) => setF('email', e.target.value)} required
                  helper="Recibirás notificaciones en este correo" />
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Documento adjunto (PDF)<span className="text-gray-400 font-normal ml-1">— opcional</span>
                  </label>
                  {archivoPdf ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <FileText size={16} className="text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-700 truncate">{archivoPdf.name}</p>
                        <p className="text-xs text-green-500">{(archivoPdf.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => { setArchivoPdf(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                    </div>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <Upload size={22} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Toca para seleccionar un PDF</p>
                      <p className="text-xs text-gray-400 mt-1">Máximo 10MB</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleArchivoChange} />
                </div>
                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
                  <Button variant="secondary" onClick={() => setPaso(1)} className="w-full sm:w-auto justify-center">← Atrás</Button>
                  <Button loading={loading} icon={<FileText size={14} />} onClick={handleRegistrar}
                    className="w-full sm:w-auto justify-center">Registrar trámite</Button>
                </div>
              </div>
            )}

            {/* ── Paso 3: Pago ────────────────────────────── */}
            {paso === 3 && (
              <div className="space-y-5">

                {/* ── Vista Stripe ── */}
                {opcionPago === 'stripe' && (
                  <StripePago
                    codigo={codigoGenerado}
                    onExito={() => { setOpcionPago('exitoso'); }}
                    onCancel={() => setOpcionPago('seleccion')}
                  />
                )}

                {/* ── Pago exitoso Stripe ── */}
                {opcionPago === 'exitoso' && (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                      <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">¡Pago procesado!</h3>
                    <p className="text-sm text-gray-500">Tu trámite ha sido activado automáticamente.</p>
                    <p className="text-2xl font-mono font-bold text-blue-600">{codigoGenerado}</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                      <Button variant="secondary" onClick={resetForm} className="w-full sm:w-auto justify-center">
                        Registrar otro trámite
                      </Button>
                      <Button icon={<ExternalLink size={14} />}
                        onClick={() => navigate(`/consulta/${codigoGenerado}`)}
                        className="w-full sm:w-auto justify-center">
                        Ver estado de mi trámite
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Selección de opción de pago ── */}
                {(opcionPago === 'seleccion' || opcionPago === 'comprobante') && (
                  <>
                    {/* Confirmación registro */}
                    <div className="text-center space-y-2">
                      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <CheckCircle size={28} className="text-green-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">¡Trámite registrado!</h3>
                      <p className="text-sm text-gray-500">Tu código de expediente es:</p>
                      <p className="text-2xl font-mono font-bold text-blue-600 break-all">{codigoGenerado}</p>
                      <p className="text-xs text-gray-400">Guarda este código para consultar tu trámite</p>
                    </div>

                    {/* Info trámite */}
                    <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500">Trámite</p>
                        <p className="text-sm font-semibold text-gray-800">{tipoRegistrado?.nombre}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Monto a pagar</p>
                        <p className="text-xl font-bold text-green-600">S/ {Number(tipoRegistrado?.costo_soles).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-xs text-blue-700 font-medium text-center">
                        📧 Te enviamos un email con los detalles del registro. Revisa tu correo.
                      </p>
                    </div>

                    <h4 className="text-sm font-bold text-gray-800 text-center">¿Cómo deseas realizar el pago?</h4>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                      {/* Opción A: Comprobante */}
                      <div className={`border-2 rounded-xl p-4 space-y-3 transition-all ${
                        opcionPago === 'comprobante' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                            <ImageIcon size={16} className="text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">Adjuntar comprobante</p>
                            <p className="text-xs text-gray-500">Yape, Plin, transferencia</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Realiza el pago por Yape, Plin o transferencia y adjunta la foto de tu comprobante.
                        </p>

                        {opcionPago === 'comprobante' ? (
                          comprobanteSubido ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                              <CheckCircle size={16} className="text-green-600 shrink-0" />
                              <p className="text-xs text-green-700 font-medium">¡Comprobante enviado! El cajero lo verificará pronto.</p>
                            </div>
                          ) : (
                            <>
                              {comprobante ? (
                                <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                                  <ImageIcon size={14} className="text-orange-500 shrink-0" />
                                  <p className="text-xs text-gray-700 truncate flex-1">{comprobante.name}</p>
                                  <button onClick={() => setComprobante(null)} className="text-gray-400 hover:text-red-500">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div onClick={() => comprobanteInputRef.current?.click()}
                                  className="border-2 border-dashed border-orange-300 rounded-lg p-3 text-center cursor-pointer hover:bg-orange-100 transition-colors">
                                  <Upload size={18} className="mx-auto text-orange-400 mb-1" />
                                  <p className="text-xs text-orange-600">Toca para adjuntar comprobante</p>
                                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG o PDF — Máx. 10MB</p>
                                </div>
                              )}
                              <input ref={comprobanteInputRef} type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                className="hidden" onChange={handleComprobanteChange} />
                              {comprobante && (
                                <Button variant="primary" icon={<CheckCircle size={13} />}
                                  loading={subiendoComp} onClick={handleSubirComprobante}
                                  className="w-full justify-center" style={{ background: '#ea580c' }}>
                                  Enviar comprobante
                                </Button>
                              )}
                              <button onClick={() => setOpcionPago('seleccion')}
                                className="w-full text-xs text-gray-400 hover:text-gray-600">
                                ← Volver
                              </button>
                            </>
                          )
                        ) : (
                          <button onClick={() => setOpcionPago('comprobante')}
                            className="w-full py-2 text-sm font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors">
                            Seleccionar esta opción
                          </button>
                        )}
                      </div>

                      {/* Opción B: Stripe */}
                      <div className="border-2 border-blue-300 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <CreditCard size={16} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">Pago en línea</p>
                            <p className="text-xs text-gray-500">Tarjeta de crédito/débito</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Paga con tu tarjeta directamente. El pago se verifica automáticamente — sin pasar por caja.
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span>🔒</span>
                          <span>Procesado por Stripe · SSL 256-bit</span>
                        </div>
                        <button onClick={() => setOpcionPago('stripe')}
                          className="w-full py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2">
                          <CreditCard size={14} />
                          Pagar con tarjeta
                        </button>
                      </div>
                    </div>

                    {/* Pago presencial */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-yellow-800 mb-1">🏢 O paga presencialmente</p>
                      <p className="text-sm text-yellow-700">
                        Acércate a Caja con tu código
                        <span className="font-mono font-bold"> {codigoGenerado}</span> y realiza el pago.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between pt-2">
                      <Button variant="secondary" onClick={resetForm} className="w-full sm:w-auto justify-center">
                        Registrar otro trámite
                      </Button>
                      <Button icon={<ExternalLink size={14} />}
                        onClick={() => navigate(`/consulta/${codigoGenerado}`)}
                        className="w-full sm:w-auto justify-center">
                        Ver estado de mi trámite
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          © 2026 Municipalidad Distrital de Carmen Alto · Sistema de Trámite Documentario
        </p>
      </div>
    </div>
  );
}