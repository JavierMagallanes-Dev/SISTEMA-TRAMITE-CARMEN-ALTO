// src/pages/MesaPartesPage.tsx

import { useEffect, useState, useRef } from 'react';
import api                       from '../services/api';
import { mesaPartesService }     from '../services/mesaPartes.service';
import { areasService }          from '../services/areas.service';
import { documentosService }     from '../services/documentos.service';
import { Card, CardTitle }       from '../components/ui/Card';
import Button                    from '../components/ui/Button';
import Input                     from '../components/ui/Input';
import Modal                     from '../components/ui/Modal';
import Alert                     from '../components/ui/Alert';
import Spinner                   from '../components/ui/Spinner';
import Table                     from '../components/ui/Table';
import EstadoBadge               from '../components/shared/EstadoBadge';
import TimelineMovimientos       from '../components/shared/TimelineMovimientos';
import { toast }                 from '../utils/toast';
import { diasRestantes, colorDiasRestantes, formatFecha } from '../utils/formato';
import type { Area, EstadoExpediente, Movimiento } from '../types';
import {
  FileText, Plus, Send, RefreshCw, Search,
  Clock, Eye, Download, Upload, X,
  CheckCircle, AlertCircle,
} from 'lucide-react';

interface TipoTramite { id: number; nombre: string; costo_soles: number; plazo_dias: number; }
interface Documento   { id: number; nombre: string; url: string; tipo_mime: string; uploaded_at: string; }

interface ExpedienteBandeja {
  id:             number;
  codigo:         string;
  estado:         EstadoExpediente;
  fecha_registro: string;
  fecha_limite:   string;
  ciudadano:   { dni: string; nombres: string; apellido_pat: string; email: string };
  tipoTramite: { nombre: string; costo_soles: number };
  pagos:       { boleta: string; monto_cobrado: number }[];
}

interface DetalleExpediente {
  id:               number;
  codigo:           string;
  estado:           EstadoExpediente;
  fecha_registro:   string;
  fecha_limite:     string;
  fecha_resolucion: string | null;
  ciudadano:   { dni: string; nombres: string; apellido_pat: string; apellido_mat: string; email: string; telefono: string | null };
  tipoTramite: { nombre: string; plazo_dias: number; costo_soles: number };
  areaActual:  { nombre: string; sigla: string } | null;
  pagos:       { boleta: string; monto_cobrado: number; fecha_pago: string }[];
  movimientos: Movimiento[];
  documentos:  Documento[];
}

export default function MesaPartesPage() {
  const [tab,      setTab]      = useState<'bandeja' | 'registrar'>('bandeja');
  const [bandeja,  setBandeja]  = useState<ExpedienteBandeja[]>([]);
  const [tipos,    setTipos]    = useState<TipoTramite[]>([]);
  const [areas,    setAreas]    = useState<Area[]>([]);
  const [cargando, setCargando] = useState(true);

  const [archivoPdf,  setArchivoPdf]  = useState<File | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [detalle,      setDetalle]      = useState<DetalleExpediente | null>(null);
  const [cargandoDet,  setCargandoDet]  = useState(false);
  const [loadingReactivar, setLoadingReactivar] = useState(false);

  const [modalObservar,   setModalObservar]   = useState(false);
  const [expObservar,     setExpObservar]     = useState<DetalleExpediente | null>(null);
  const [comentarioObs,   setComentarioObs]   = useState('');
  const [loadingObservar, setLoadingObservar] = useState(false);

  const [form, setForm] = useState({
    dni: '', nombres: '', apellido_pat: '', apellido_mat: '',
    email: '', telefono: '', tipoTramiteId: '',
  });
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [loadingReg,  setLoadingReg]  = useState(false);

  const [modalDerivar,   setModalDerivar]   = useState(false);
  const [expDerivar,     setExpDerivar]     = useState<ExpedienteBandeja | null>(null);
  const [areaDestino,    setAreaDestino]    = useState('');
  const [instrucciones,  setInstrucciones]  = useState('');
  const [loadingDerivar, setLoadingDerivar] = useState(false);

  const [modalToken,    setModalToken]    = useState(false);
  const [tokenInput,    setTokenInput]    = useState('');
  const [loadingToken,  setLoadingToken]  = useState(false);
  const [tokenGenerado, setTokenGenerado] = useState('');

  const descargarCargo = (expedienteId: number, codigo: string) => {
    api.get(`/recepcion/cargo/${expedienteId}`, { responseType: 'blob' })
      .then((res) => {
        const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href  = url;
        link.setAttribute('download', `cargo-${codigo}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => toast.error({ titulo: 'Error al generar el cargo de recepción.' }));
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [band, tip, ar] = await Promise.all([
        mesaPartesService.bandeja(),
        mesaPartesService.tiposTramite(),
        mesaPartesService.areas(),
      ]);
      setBandeja(band);
      setTipos(tip);
      setAreas(ar);
    } catch {
      toast.error({ titulo: 'Error al cargar los datos.' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const verDetalle = async (id: number) => {
    setModalDetalle(true);
    setCargandoDet(true);
    try {
      const det = await areasService.detalle(id);
      setDetalle({ ...det, documentos: det.documentos ?? [] });
    } catch {
      toast.error({ titulo: 'Error al cargar el detalle.' });
    } finally {
      setCargandoDet(false);
    }
  };

  const abrirObservar = () => {
    if (!detalle) return;
    setExpObservar(detalle);
    setComentarioObs('');
    setModalObservar(true);
  };

  const handleObservar = async () => {
    if (!expObservar || !comentarioObs.trim()) return;
    setLoadingObservar(true);
    try {
      await mesaPartesService.observar(expObservar.id, comentarioObs.trim());
      toast.success({ titulo: 'Expediente observado', descripcion: `${expObservar.codigo} marcado como OBSERVADO. Ciudadano notificado.` });
      setModalObservar(false);
      setModalDetalle(false);
      setComentarioObs('');
      cargarDatos();
    } catch (err: any) {
      toast.error({ titulo: err?.response?.data?.error ?? 'Error al observar.' });
    } finally {
      setLoadingObservar(false);
    }
  };

  const handleReactivar = async () => {
    if (!detalle) return;
    setLoadingReactivar(true);
    try {
      await mesaPartesService.reactivar(detalle.id);
      toast.success({ titulo: 'Expediente reactivado', descripcion: `${detalle.codigo} reactivado. Ya puedes derivarlo.` });
      setModalDetalle(false);
      cargarDatos();
    } catch (err: any) {
      toast.error({ titulo: err?.response?.data?.error ?? 'Error al reactivar.' });
    } finally {
      setLoadingReactivar(false);
    }
  };

  const buscarDni = async () => {
    if (form.dni.length !== 8) return;
    setBuscandoDni(true);
    try {
      const res = await mesaPartesService.consultarDni(form.dni);
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
    if (!form.dni || !form.nombres || !form.apellido_pat || !form.email || !form.tipoTramiteId) {
      toast.warning({ titulo: 'Completa todos los campos obligatorios.' });
      return;
    }
    setLoadingReg(true);
    try {
      const res = await mesaPartesService.registrar(form);
      if (archivoPdf) {
        try { await documentosService.subirDocumento(res.expediente.id, archivoPdf); }
        catch { console.warn('No se pudo subir el PDF.'); }
      }
      toast.success({ titulo: 'Expediente registrado', descripcion: `${res.expediente.codigo} creado correctamente.` });
      setForm({ dni: '', nombres: '', apellido_pat: '', apellido_mat: '', email: '', telefono: '', tipoTramiteId: '' });
      setArchivoPdf(null);
      setTab('bandeja');
      cargarDatos();
    } catch (err: any) {
      toast.error({ titulo: err?.response?.data?.error ?? 'Error al registrar.' });
    } finally {
      setLoadingReg(false);
    }
  };

  const abrirDerivar = (exp: ExpedienteBandeja) => {
    setExpDerivar(exp); setAreaDestino(''); setInstrucciones(''); setModalDerivar(true);
  };

  const handleDerivar = async () => {
    if (!expDerivar || !areaDestino) return;
    setLoadingDerivar(true);
    try {
      const res = await mesaPartesService.derivar(expDerivar.id, Number(areaDestino), instrucciones);
      setTokenGenerado(res.token);
      setModalDerivar(false);
      setModalToken(true);
    } catch (err: any) {
      toast.error({ titulo: err?.response?.data?.error ?? 'Error al derivar.' });
    } finally {
      setLoadingDerivar(false);
    }
  };

  const handleConfirmarToken = async () => {
    const token = tokenInput.trim() || tokenGenerado;
    if (!token) return;
    setLoadingToken(true);
    try {
      await mesaPartesService.confirmarDerivacion(token);
      toast.success({ titulo: 'Derivación confirmada', descripcion: 'El expediente avanzó a DERIVADO.' });
      setModalToken(false);
      setTokenInput('');
      setTokenGenerado('');
      cargarDatos();
    } catch (err: any) {
      toast.error({ titulo: err?.response?.data?.error ?? 'Error al confirmar.' });
    } finally {
      setLoadingToken(false);
    }
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.warning({ titulo: 'Solo se aceptan PDFs.' }); return; }
    if (file.size > 10 * 1024 * 1024)   { toast.warning({ titulo: 'Máximo 10MB.' }); return; }
    setArchivoPdf(file);
  };

  const setF = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  if (cargando) return <Spinner text="Cargando Mesa de Partes..." />;

  const puedeObservar = (estado: EstadoExpediente) =>
    ['RECIBIDO', 'EN_REVISION_MDP'].includes(estado);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mesa de Partes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de la Municipalidad de Carmen Alto</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={cargarDatos}>Actualizar</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'bandeja',   label: `Bandeja (${bandeja.length})`, icon: <Clock size={13} /> },
          { key: 'registrar', label: 'Nuevo expediente',            icon: <Plus  size={13} /> },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setArchivoPdf(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Bandeja */}
      {tab === 'bandeja' && (
        <Card padding={false}>
          <Table keyField="id" data={bandeja} emptyText="No hay expedientes en bandeja."
            columns={[
              { key: 'codigo', header: 'Código', render: (r) => <span className="font-mono text-xs text-blue-600 font-semibold">{r.codigo}</span> },
              { key: 'ciudadano', header: 'Ciudadano', render: (r) => <div><p className="text-sm font-medium text-gray-800">{r.ciudadano.nombres} {r.ciudadano.apellido_pat}</p><p className="text-xs text-gray-400">{r.ciudadano.dni}</p></div> },
              { key: 'estado', header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} size="sm" /> },
              { key: 'fecha_limite', header: 'Plazo', render: (r) => { const dias = diasRestantes(r.fecha_limite); return <span className={`text-xs font-medium ${colorDiasRestantes(dias)}`}>{dias < 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d restantes`}</span>; } },
              { key: 'pago', header: 'Pago', render: (r) => r.pagos?.length > 0 ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12} />Verificado</span> : <span className="text-xs text-yellow-600">Pendiente</span> },
              { key: 'acciones', header: '', render: (r) => (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" icon={<Eye size={12} />} onClick={() => verDetalle(r.id)}>Ver</Button>
                  <Button size="sm" variant="ghost" icon={<FileText size={12} />} onClick={() => descargarCargo(r.id, r.codigo)}>Cargo PDF</Button>
                  <Button size="sm" variant="secondary" icon={<Send size={12} />} onClick={() => abrirDerivar(r)} disabled={!r.pagos || r.pagos.length === 0}>Derivar</Button>
                </div>
              )},
            ]}
          />
        </Card>
      )}

      {/* Formulario registro */}
      {tab === 'registrar' && (
        <Card>
          <CardTitle>Registrar nuevo expediente</CardTitle>
          <div className="mt-4 space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input label="DNI del ciudadano" placeholder="12345678" value={form.dni}
                  onChange={(e) => setF('dni', e.target.value)} maxLength={8} required />
              </div>
              <Button variant="secondary" icon={<Search size={14} />} loading={buscandoDni}
                onClick={buscarDni} disabled={form.dni.length !== 8}>Buscar DNI</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nombres"          value={form.nombres}      onChange={(e) => setF('nombres', e.target.value)}      required />
              <Input label="Apellido paterno" value={form.apellido_pat} onChange={(e) => setF('apellido_pat', e.target.value)} required />
              <Input label="Apellido materno" value={form.apellido_mat} onChange={(e) => setF('apellido_mat', e.target.value)} />
              <Input label="Teléfono"         value={form.telefono}     onChange={(e) => setF('telefono', e.target.value)}     placeholder="987654321" />
            </div>
            <Input label="Email" type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} required />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de trámite <span className="text-red-500">*</span></label>
              <select value={form.tipoTramiteId} onChange={(e) => setF('tipoTramiteId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <option value="">Seleccionar trámite...</option>
                {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre} — S/ {Number(t.costo_soles).toFixed(2)} ({t.plazo_dias} días)</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Documento adjunto (PDF) <span className="text-gray-400 font-normal">— opcional</span></label>
              {archivoPdf ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FileText size={16} className="text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-700 truncate">{archivoPdf.name}</p>
                    <p className="text-xs text-green-500">{(archivoPdf.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={() => { setArchivoPdf(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-500">Haz clic para seleccionar un PDF (Máx 10MB)</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleArchivoChange} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setTab('bandeja')}>Cancelar</Button>
              <Button variant="primary" icon={<FileText size={14} />} loading={loadingReg} onClick={handleRegistrar}>Registrar expediente</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Modal detalle */}
      <Modal open={modalDetalle} onClose={() => setModalDetalle(false)} title="Detalle del expediente" size="lg">
        {cargandoDet ? <Spinner text="Cargando detalle..." /> : detalle ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-gray-400">Código</p><p className="font-mono font-bold text-blue-600">{detalle.codigo}</p></div>
              <div><p className="text-xs text-gray-400">Estado</p><EstadoBadge estado={detalle.estado} /></div>
              <div><p className="text-xs text-gray-400">Ciudadano</p><p className="font-medium">{detalle.ciudadano.nombres} {detalle.ciudadano.apellido_pat}</p><p className="text-xs text-gray-500">DNI: {detalle.ciudadano.dni} · {detalle.ciudadano.email}</p></div>
              <div><p className="text-xs text-gray-400">Trámite</p><p className="font-medium">{detalle.tipoTramite.nombre}</p><p className="text-xs text-gray-500">{detalle.tipoTramite.plazo_dias} días · S/ {Number(detalle.tipoTramite.costo_soles).toFixed(2)}</p></div>
              <div><p className="text-xs text-gray-400">Registrado</p><p>{formatFecha(detalle.fecha_registro)}</p></div>
              <div><p className="text-xs text-gray-400">Fecha límite</p><p className={colorDiasRestantes(diasRestantes(detalle.fecha_limite))}>{formatFecha(detalle.fecha_limite)}</p></div>
            </div>
            <div>
              <CardTitle>Documentos adjuntos ({detalle.documentos?.length ?? 0})</CardTitle>
              {detalle.documentos && detalle.documentos.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {detalle.documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <FileText size={16} className="text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-700 truncate">{doc.nombre}</p><p className="text-xs text-gray-400">{formatFecha(doc.uploaded_at)}</p></div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 bg-blue-50 rounded-lg"><Download size={13} />Descargar</a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2 bg-gray-50 rounded-lg p-3 text-center">El ciudadano no adjuntó documentos.</p>
              )}
            </div>
            <div className="space-y-2">
              {puedeObservar(detalle.estado) && (
                <div className="pt-2 border-t border-gray-100">
                  <Button variant="secondary" icon={<AlertCircle size={14} />} onClick={abrirObservar} className="w-full justify-center">Observar expediente — Faltan documentos</Button>
                  <p className="text-xs text-gray-400 text-center mt-1">Marca el expediente como observado y notifica al ciudadano</p>
                </div>
              )}
              {detalle.estado === 'OBSERVADO' && (
                <div className="pt-2 border-t border-gray-100">
                  <Button variant="primary" icon={<CheckCircle size={14} />} onClick={handleReactivar} loading={loadingReactivar} className="w-full justify-center">Reactivar expediente — Documentos subsanados</Button>
                  <p className="text-xs text-gray-400 text-center mt-1">El expediente volverá a RECIBIDO y podrás derivarlo</p>
                </div>
              )}
            </div>
            <div>
              <CardTitle>Historial de movimientos</CardTitle>
              <div className="mt-3"><TimelineMovimientos movimientos={detalle.movimientos} /></div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal observar */}
      <Modal open={modalObservar} onClose={() => setModalObservar(false)} title="Observar expediente" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalObservar(false)}>Cancelar</Button><Button variant="secondary" icon={<AlertCircle size={14} />} loading={loadingObservar} onClick={handleObservar} disabled={!comentarioObs.trim()} className="border-orange-300 text-orange-600 hover:bg-orange-50">Marcar como Observado</Button></>}>
        <div className="space-y-4">
          <Alert type="warning" message="El ciudadano recibirá un email con el detalle de la observación y podrá adjuntar los documentos faltantes desde el portal." />
          <Input label="Detalle de la observación" placeholder="Ej: Falta fotocopia del DNI, plano de ubicación..." value={comentarioObs} onChange={(e) => setComentarioObs(e.target.value)} required autoFocus />
        </div>
      </Modal>

      {/* Modal derivar */}
      <Modal open={modalDerivar} onClose={() => setModalDerivar(false)} title="Derivar expediente al área técnica" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalDerivar(false)}>Cancelar</Button><Button variant="primary" loading={loadingDerivar} icon={<Send size={14} />} onClick={handleDerivar} disabled={!areaDestino}>Derivar</Button></>}>
        {expDerivar && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3 space-y-0.5">
              <p className="text-xs text-gray-500">Expediente a derivar</p>
              <p className="font-mono text-sm font-semibold text-blue-600">{expDerivar.codigo}</p>
              <p className="text-sm text-gray-700">{expDerivar.ciudadano.nombres} {expDerivar.ciudadano.apellido_pat}</p>
              <p className="text-sm text-gray-500">{expDerivar.tipoTramite.nombre}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Área destino <span className="text-red-500">*</span></label>
              <select value={areaDestino} onChange={(e) => setAreaDestino(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <option value="">Seleccionar área...</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.sigla})</option>)}
              </select>
            </div>
            <Input label="Instrucciones (opcional)" placeholder="Instrucciones para el área técnica..." value={instrucciones} onChange={(e) => setInstrucciones(e.target.value)} />
          </div>
        )}
      </Modal>

      {/* Modal token */}
      <Modal open={modalToken} onClose={() => setModalToken(false)} title="Confirmar derivación" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalToken(false)}>Cancelar</Button><Button variant="primary" loading={loadingToken} icon={<CheckCircle size={14} />} onClick={handleConfirmarToken}>Confirmar derivación</Button></>}>
        <div className="space-y-4">
          <Alert type="info" message="Token generado. En producción se envía por email. Para la demo confirma directamente." />
          {tokenGenerado && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Token generado:</p>
              <p className="font-mono text-xs text-gray-700 break-all">{tokenGenerado}</p>
            </div>
          )}
          <Input label="Token (opcional)" placeholder="O confirma directamente con el botón" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} helper="Puedes confirmar sin pegar el token si ya aparece arriba." />
        </div>
      </Modal>
    </div>
  );
}