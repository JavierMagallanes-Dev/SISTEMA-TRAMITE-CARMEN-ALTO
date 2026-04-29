// src/pages/PortalPage.tsx
import '../styles/portal.css';

import { useEffect, useState, useRef } from 'react';
import { useNavigate }                  from 'react-router-dom';
import { portalService }                from '../services/portal.service';
import { documentosService }            from '../services/documentos.service';
import Button                           from '../components/ui/Button';
import Input                            from '../components/ui/Input';
import Spinner                          from '../components/ui/Spinner';
import StripePago                       from '../components/shared/StripePago';
import Turnstile                        from '../components/shared/Turnstile';
import { toast }                        from '../utils/toast';
import {
  Search, FileText, ArrowRight, CheckCircle,
  Upload, X, CreditCard, ImageIcon, ExternalLink,
} from 'lucide-react';

const VITE_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface TipoTramite {
  id: number; nombre: string; descripcion: string | null;
  costo_soles: number; plazo_dias: number;
}

type OpcionPago = 'seleccion' | 'comprobante' | 'stripe' | 'exitoso';

export default function PortalPage() {
  const navigate = useNavigate();

  const [paso,             setPaso]             = useState<1 | 2 | 3>(1);
  const [tipos,            setTipos]            = useState<TipoTramite[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [codigoGenerado,   setCodigoGenerado]   = useState('');
  const [tipoRegistrado,   setTipoRegistrado]   = useState<TipoTramite | null>(null);
  const [opcionPago,       setOpcionPago]       = useState<OpcionPago>('seleccion');
  const [codigoConsulta,   setCodigoConsulta]   = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoTramite | null>(null);
  const [turnstileToken,   setTurnstileToken]   = useState<string>('');

  const [form, setForm] = useState({
    dni: '', nombres: '', apellido_pat: '', apellido_mat: '',
    email: '', telefono: '',
  });

  const [buscandoDni,       setBuscandoDni]       = useState(false);
  const [archivoPdf,        setArchivoPdf]        = useState<File | null>(null);
  const [comprobante,       setComprobante]       = useState<File | null>(null);
  const [subiendoComp,      setSubiendoComp]      = useState(false);
  const [comprobanteSubido, setComprobanteSubido] = useState(false);

  const fileInputRef        = useRef<HTMLInputElement>(null);
  const comprobanteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    portalService.tiposTramite().then(setTipos).catch(() => {});
  }, []);

  const buscarDni = async () => {
    if (form.dni.length !== 8) return;
    setBuscandoDni(true);
    try {
      const res = await portalService.consultarDni(form.dni);
      const c   = res.datos || res.ciudadano;
      if (c) setForm(prev => ({
        ...prev,
        nombres:      c.nombres      || '',
        apellido_pat: c.apellido_pat || c.apellidoPat || '',
        apellido_mat: c.apellido_mat || c.apellidoMat || '',
        email:        c.email        || '',
      }));
    } catch { /* RENIEC no disponible */ }
    finally { setBuscandoDni(false); }
  };

  const handleRegistrar = async () => {
    if (!form.dni || !form.nombres || !form.apellido_pat || !form.email || !tipoSeleccionado) {
      toast.warning({ titulo: 'Completa todos los campos obligatorios.' }); return;
    }
    if (!turnstileToken) {
      toast.warning({ titulo: 'Completa la verificación de seguridad.' }); return;
    }
    setLoading(true);
    try {
      const res = await portalService.registrar({
        ...form,
        tipoTramiteId:          String(tipoSeleccionado.id),
        'cf-turnstile-response': turnstileToken,
      });
      if (archivoPdf) {
        try { await documentosService.subirDocumento(res.expediente.id, archivoPdf); }
        catch { console.warn('No se pudo subir el PDF.'); }
      }
      setCodigoGenerado(res.expediente.codigo);
      setTipoRegistrado(tipoSeleccionado);
      setPaso(3);
    } catch (err: any) {
      toast.error({ titulo: err?.response?.data?.error ?? 'Error al registrar el trámite.' });
      setTurnstileToken(''); // Resetear token tras error
    } finally { setLoading(false); }
  };

  const setF = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.warning({ titulo: 'Solo se aceptan archivos PDF.' }); return; }
    if (file.size > 10 * 1024 * 1024)   { toast.warning({ titulo: 'El archivo no puede superar los 10MB.' }); return; }
    setArchivoPdf(file);
  };

  const handleComprobanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tipos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!tipos.includes(file.type)) { toast.warning({ titulo: 'Solo se aceptan imágenes o PDF.' }); return; }
    if (file.size > 10 * 1024 * 1024) { toast.warning({ titulo: 'El archivo no puede superar los 10MB.' }); return; }
    setComprobante(file);
    if (comprobanteInputRef.current) comprobanteInputRef.current.value = '';
  };

  const handleSubirComprobante = async () => {
    if (!comprobante || !codigoGenerado) return;
    setSubiendoComp(true);
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
      toast.success({ titulo: '¡Comprobante enviado!', descripcion: 'El cajero lo revisará pronto.' });
    } catch (err: any) {
      toast.error({ titulo: err.message ?? 'Error al subir el comprobante.' });
    } finally { setSubiendoComp(false); }
  };

  const resetForm = () => {
    setPaso(1); setTipoSeleccionado(null); setArchivoPdf(null);
    setTipoRegistrado(null); setComprobante(null); setOpcionPago('seleccion');
    setComprobanteSubido(false); setTurnstileToken('');
    setForm({ dni: '', nombres: '', apellido_pat: '', apellido_mat: '', email: '', telefono: '' });
  };

  const stepClass = (n: number) => {
    if (paso === n) return 'portal-step active';
    if (paso > n)  return 'portal-step done';
    return 'portal-step';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6">

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-base font-semibold text-gray-900">Registrar nuevo trámite</p>
            <p className="text-xs text-gray-500 mt-0.5">Completa el formulario en 3 pasos</p>
          </div>

          {/* Pasos */}
          <div className="portal-steps">
            {[{ n: 1, label: 'Trámite' }, { n: 2, label: 'Tus datos' }, { n: 3, label: 'Pago' }].map((s) => (
              <div key={s.n} className={stepClass(s.n)}>
                <div className="portal-step-num">{paso > s.n ? '✓' : s.n}</div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="p-6">

            {/* ── PASO 1 ──────────────────────────────────── */}
            {paso === 1 && (
              <div className="portal-panel space-y-2">
                <p className="text-xs text-gray-500 mb-3">Selecciona el trámite que necesitas realizar:</p>
                {tipos.length === 0 ? <Spinner text="Cargando trámites..." /> : (
                  tipos.map((tipo) => (
                    <div key={tipo.id}
                      className={`tipo-card ${tipoSeleccionado?.id === tipo.id ? 'selected' : ''}`}
                      onClick={() => setTipoSeleccionado(tipo)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{tipo.nombre}</p>
                        {tipo.descripcion && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{tipo.descripcion}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5"> {tipo.plazo_dias} días hábiles</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-sm font-semibold text-green-600">
                          S/ {Number(tipo.costo_soles).toFixed(2)}
                        </p>
                        <div className="tipo-card-check">
                          <CheckCircle size={13} color="white" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex justify-end pt-3">
                  <Button icon={<ArrowRight size={14} />} onClick={() => {
                    if (!tipoSeleccionado) { toast.warning({ titulo: 'Selecciona un tipo de trámite.' }); return; }
                    setPaso(2);
                  }} className="w-full sm:w-auto justify-center">
                    Continuar
                  </Button>
                </div>
              </div>
            )}

            {/* ── PASO 2 ──────────────────────────────────── */}
            {paso === 2 && (
              <div className="portal-panel space-y-4">

                <div className="sel-tramite-badge">
                  <div>
                    <p className="text-xs text-gray-500">Trámite seleccionado</p>
                    <p className="text-sm font-semibold text-blue-700">{tipoSeleccionado?.nombre}</p>
                  </div>
                  <p className="text-base font-bold text-green-600">
                    S/ {Number(tipoSeleccionado?.costo_soles).toFixed(2)}
                  </p>
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input label="DNI" placeholder="12345678" value={form.dni}
                      onChange={(e) => setF('dni', e.target.value)} maxLength={8} required />
                  </div>
                  <Button variant="secondary" icon={<Search size={14} />} loading={buscandoDni}
                    onClick={buscarDni} disabled={form.dni.length !== 8}
                    className="w-auto justify-center shrink-0">
                    Buscar
                  </Button>
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

                {/* PDF adjunto */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Documento adjunto (PDF)
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
                    <div className="drop-zone" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={20} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Haz clic para seleccionar un PDF</p>
                      <p className="text-xs text-gray-400 mt-1">Máximo 10MB</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleArchivoChange} />
                </div>

                {/* ── CLOUDFLARE TURNSTILE ─────────────────── */}
                <Turnstile
                  onToken={(token) => setTurnstileToken(token)}
                  onExpire={() => { setTurnstileToken(''); toast.warning({ titulo: 'La verificación expiró. Complétala nuevamente.' }); }}
                  onError={() => { setTurnstileToken(''); toast.error({ titulo: 'Error en la verificación de seguridad.' }); }}
                />

                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between">
                  <Button variant="secondary" onClick={() => { setPaso(1); setTurnstileToken(''); }}
                    className="w-full sm:w-auto justify-center">
                    ← Atrás
                  </Button>
                  <Button
                    loading={loading}
                    icon={<FileText size={14} />}
                    onClick={handleRegistrar}
                    disabled={!turnstileToken}
                    className="w-full sm:w-auto justify-center">
                    Registrar trámite
                  </Button>
                </div>
              </div>
            )}

            {/* ── PASO 3 ──────────────────────────────────── */}
            {paso === 3 && (
              <div className="portal-panel space-y-5">

                {opcionPago === 'stripe' && (
                  <StripePago
                    codigo={codigoGenerado}
                    onExito={() => setOpcionPago('exitoso')}
                    onCancel={() => setOpcionPago('seleccion')}
                  />
                )}

                {opcionPago === 'exitoso' && (
                  <div className="exito-wrap portal-panel">
                    <div className="exito-icon-circle">
                      <CheckCircle size={28} color="#16a34a" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">¡Pago procesado!</p>
                    <p className="text-sm text-gray-500 mt-1">Tu trámite ha sido activado automáticamente.</p>
                    <p className="exito-codigo">{codigoGenerado}</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center mt-4">
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

                {(opcionPago === 'seleccion' || opcionPago === 'comprobante') && (
                  <>
                    <div className="text-center space-y-1">
                      <div className="exito-icon-circle" style={{ width: 52, height: 52 }}>
                        <CheckCircle size={24} color="#16a34a" />
                      </div>
                      <p className="text-base font-semibold text-gray-900">¡Trámite registrado!</p>
                      <p className="text-xs text-gray-500">Tu código de expediente es:</p>
                      <p className="exito-codigo">{codigoGenerado}</p>
                      <p className="text-xs text-gray-400">Guarda este código para consultar tu trámite</p>
                    </div>

                    <div className="sel-tramite-badge">
                      <div>
                        <p className="text-xs text-gray-500">Trámite</p>
                        <p className="text-sm font-semibold text-gray-800">{tipoRegistrado?.nombre}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Monto</p>
                        <p className="text-base font-bold text-green-600">
                          S/ {Number(tipoRegistrado?.costo_soles).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                      <p className="text-xs text-blue-700 font-medium">
                        Te enviamos un email con los detalles. Revisa tu correo.
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-gray-800 text-center">¿Cómo deseas realizar el pago?</p>

                    <div className="pago-grid">
                      <div className={`pago-option ${opcionPago === 'comprobante' ? 'active-comprobante' : 'comprobante'}`}>
                        <div className="pago-icon-wrap" style={{ background: '#fff7ed' }}>
                          <ImageIcon size={18} color="#ea580c" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800">Adjuntar comprobante</p>
                        <p className="text-xs text-gray-500 mt-1">Yape, Plin, transferencia</p>
                        {opcionPago === 'comprobante' ? (
                          comprobanteSubido ? (
                            <div className="comp-subido mt-3">
                              <CheckCircle size={16} color="#16a34a" />
                              <p className="text-xs text-green-700 font-medium">¡Enviado! El cajero lo verificará pronto.</p>
                            </div>
                          ) : (
                            <div className="mt-3 space-y-2">
                              {comprobante ? (
                                <div className="flex items-center gap-2 p-2 bg-white border border-orange-200 rounded-lg">
                                  <ImageIcon size={12} color="#ea580c" />
                                  <p className="text-xs text-gray-700 truncate flex-1">{comprobante.name}</p>
                                  <button onClick={() => setComprobante(null)} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
                                </div>
                              ) : (
                                <div className="drop-zone" onClick={() => comprobanteInputRef.current?.click()}>
                                  <Upload size={14} className="mx-auto text-orange-400 mb-1" />
                                  <p className="text-xs text-orange-600">Toca para adjuntar</p>
                                </div>
                              )}
                              <input ref={comprobanteInputRef} type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                className="hidden" onChange={handleComprobanteChange} />
                              {comprobante && (
                                <button disabled={subiendoComp} onClick={handleSubirComprobante}
                                  className="w-full py-2 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
                                  style={{ background: '#ea580c' }}>
                                  {subiendoComp ? 'Enviando...' : 'Enviar comprobante'}
                                </button>
                              )}
                              <button onClick={() => setOpcionPago('seleccion')}
                                className="w-full text-xs text-gray-400 hover:text-gray-600">← Volver</button>
                            </div>
                          )
                        ) : (
                          <button onClick={() => setOpcionPago('comprobante')}
                            className="mt-3 w-full py-2 text-xs font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors">
                            Seleccionar
                          </button>
                        )}
                      </div>

                      <div className="pago-option stripe">
                        <div className="pago-icon-wrap" style={{ background: '#eff6ff' }}>
                          <CreditCard size={18} color="#2563eb" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800">Pago en línea</p>
                        <p className="text-xs text-gray-500 mt-1">Tarjeta de crédito/débito</p>
                        <button onClick={() => setOpcionPago('stripe')}
                          className="mt-3 w-full py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                          <CreditCard size={12} />Pagar con tarjeta
                        </button>
                      </div>
                    </div>

                    <div className="pago-presencial">
                      O paga presencialmente en Caja con tu código{' '}
                      <strong className="font-mono">{codigoGenerado}</strong>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
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
      </div>
    </div>
  );
}