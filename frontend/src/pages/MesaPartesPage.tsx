// src/pages/MesaPartesPage.tsx

import { useEffect, useState, useRef } from 'react';
// Importación del servicio de API para la descarga del blob con Auth
import api from '../services/api'; 
import { mesaPartesService } from '../services/mesaPartes.service';
import { areasService } from '../services/areas.service';
import { documentosService } from '../services/documentos.service';

import { Card, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Alert from '../components/ui/Alert';
import Spinner from '../components/ui/Spinner';
import Table from '../components/ui/Table';
import EstadoBadge from '../components/shared/EstadoBadge';
import TimelineMovimientos from '../components/shared/TimelineMovimientos';
import { formatFecha, diasRestantes, colorDiasRestantes } from '../utils/formato';
import type { Area, EstadoExpediente, Movimiento } from '../types';
import {
  FileText, Plus, Send, RefreshCw,
  Search, Clock, CheckCircle, Eye, Download,
  Upload, X
} from 'lucide-react';

// Interfaces
interface TipoTramite { id: number; nombre: string; costo_soles: number; plazo_dias: number; }
interface Documento { id: number; nombre: string; url: string; tipo_mime: string; uploaded_at: string; }
interface ExpedienteBandeja {
  id: number;
  codigo: string;
  estado: EstadoExpediente;
  fecha_registro: string;
  fecha_limite: string;
  ciudadano: { dni: string; nombres: string; apellido_pat: string; email: string };
  tipoTramite: { nombre: string; costo_soles: number };
  pagos: { boleta: string; monto_cobrado: number }[];
}
interface DetalleExpediente {
  id: number;
  codigo: string;
  estado: EstadoExpediente;
  fecha_registro: string;
  fecha_limite: string;
  fecha_resolucion: string | null;
  ciudadano: { dni: string; nombres: string; apellido_pat: string; apellido_mat: string; email: string; telefono: string | null };
  tipoTramite: { nombre: string; plazo_dias: number; costo_soles: number };
  areaActual: { nombre: string; sigla: string } | null;
  pagos: { boleta: string; monto_cobrado: number; fecha_pago: string }[];
  movimientos: Movimiento[];
  documentos: Documento[];
}

export default function MesaPartesPage() {
  const [tab, setTab] = useState<'bandeja' | 'registrar'>('bandeja');
  const [bandeja, setBandeja] = useState<ExpedienteBandeja[]>([]);
  const [tipos, setTipos] = useState<TipoTramite[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [detalle, setDetalle] = useState<DetalleExpediente | null>(null);
  const [cargandoDet, setCargandoDet] = useState(false);

  const [form, setForm] = useState({
    dni: '', nombres: '', apellido_pat: '', apellido_mat: '',
    email: '', telefono: '', tipoTramiteId: '',
  });
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [loadingReg, setLoadingReg] = useState(false);

  const [modalDerivar, setModalDerivar] = useState(false);
  const [expDerivar, setExpDerivar] = useState<ExpedienteBandeja | null>(null);
  const [areaDestino, setAreaDestino] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [loadingDerivar, setLoadingDerivar] = useState(false);

  const [modalToken, setModalToken] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [loadingToken, setLoadingToken] = useState(false);
  const [tokenGenerado, setTokenGenerado] = useState('');

  // ── Función de descarga de Cargo (Protegida con Token) ──────────
  const descargarCargo = (expedienteId: number, codigo: string) => {
    // Usamos la instancia 'api' (axios) que ya inyecta el Bearer token
    api.get(`/recepcion/cargo/${expedienteId}`, { responseType: 'blob' })
      .then((res) => {
        // Creamos el blob con el tipo MIME correcto
        const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href  = url;
        link.setAttribute('download', `cargo-${codigo}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => setError('Error al generar el cargo de recepción.'));
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
      setError('Error al cargar los datos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { 
      setError('Solo se aceptan archivos PDF.'); 
      return; 
    }
    if (file.size > 10 * 1024 * 1024) { 
      setError('El archivo no puede superar 10MB.'); 
      return; 
    }
    setError('');
    setArchivoPdf(file);
  };

  const verDetalle = async (id: number) => {
    setModalDetalle(true);
    setCargandoDet(true);
    try {
      const [det, docs] = await Promise.all([
        areasService.detalle(id),
        documentosService.listar(id),
      ]);
      setDetalle({ ...det, documentos: docs });
    } catch {
      setError('Error al cargar el detalle.');
    } finally {
      setCargandoDet(false);
    }
  };

  const buscarDni = async () => {
    if (form.dni.length !== 8) return;
    setBuscandoDni(true);
    try {
      const res = await mesaPartesService.consultarDni(form.dni);
      const c = res.datos || res.ciudadano;
      if (c) {
        setForm(prev => ({
          ...prev,
          nombres: c.nombres || '',
          apellido_pat: c.apellido_pat || c.apellidoPat || '',
          apellido_mat: c.apellido_mat || c.apellidoMat || '',
          email: c.email || '',
        }));
      }
    } catch {
      setError('No se pudo conectar con el servicio de identidad.');
    } finally {
      setBuscandoDni(false);
    }
  };

  const handleRegistrar = async () => {
    if (!form.dni || !form.nombres || !form.apellido_pat || !form.email || !form.tipoTramiteId) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    setLoadingReg(true);
    try {
      const res = await mesaPartesService.registrar(form);
      if (archivoPdf) {
        try {
          await documentosService.subirDocumento(res.expediente.id, archivoPdf);
        } catch {
          console.warn('No se pudo subir el PDF.');
        }
      }
      setSuccess(`Expediente ${res.expediente.codigo} registrado exitosamente.`);
      setForm({ dni: '', nombres: '', apellido_pat: '', apellido_mat: '', email: '', telefono: '', tipoTramiteId: '' });
      setArchivoPdf(null);
      setTab('bandeja');
      cargarDatos();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al registrar el expediente.');
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
      setError(err?.response?.data?.error ?? 'Error al derivar.');
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
      setSuccess('Derivación confirmada correctamente.');
      setModalToken(false);
      setTokenInput('');
      setTokenGenerado('');
      cargarDatos();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al confirmar la derivación.');
    } finally {
      setLoadingToken(false);
    }
  };

  const setF = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  if (cargando) return <Spinner text="Cargando Mesa de Partes..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mesa de Partes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de la Municipalidad de Carmen Alto</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={cargarDatos}>
          Actualizar
        </Button>
      </div>

      {error   && <Alert type="error"   message={error}   onClose={() => setError('')}   />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'bandeja',  label: `Bandeja (${bandeja.length})`, icon: <Clock size={13} /> },
          { key: 'registrar', label: 'Nuevo expediente',             icon: <Plus  size={13} /> },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setArchivoPdf(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Bandeja de Entrada */}
      {tab === 'bandeja' && (
        <Card padding={false}>
          <Table
            keyField="id"
            data={bandeja}
            emptyText="No hay expedientes en bandeja."
            columns={[
              {
                key: 'codigo', header: 'Código',
                render: (r) => <span className="font-mono text-xs text-blue-600 font-semibold">{r.codigo}</span>,
              },
              {
                key: 'ciudadano', header: 'Ciudadano',
                render: (r) => (
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.ciudadano.nombres} {r.ciudadano.apellido_pat}</p>
                    <p className="text-xs text-gray-400">{r.ciudadano.dni}</p>
                  </div>
                ),
              },
              {
                key: 'estado', header: 'Estado',
                render: (r) => <EstadoBadge estado={r.estado} size="sm" />,
              },
              {
                key: 'fecha_limite', header: 'Plazo',
                render: (r) => {
                  const dias = diasRestantes(r.fecha_limite);
                  return (
                    <span className={`text-xs font-medium ${colorDiasRestantes(dias)}`}>
                      {dias < 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d restantes`}
                    </span>
                  );
                },
              },
              {
                key: 'acciones', header: '',
                render: (r) => (
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Eye size={12} />}
                      onClick={() => verDetalle(r.id)}
                    >
                      Ver
                    </Button>
                    
                    {/* Botón Cargo PDF actualizado */}
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<FileText size={12} />}
                      onClick={() => descargarCargo(r.id, r.codigo)}
                    >
                      Cargo PDF
                    </Button>

                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Send size={12} />}
                      onClick={() => abrirDerivar(r)}
                      disabled={!r.pagos || r.pagos.length === 0}
                    >
                      Derivar
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* Formulario Registro */}
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
                onClick={buscarDni} disabled={form.dni.length !== 8}>
                Buscar
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Nombres" value={form.nombres} onChange={(e) => setF('nombres', e.target.value)} required />
              <Input label="Apellido paterno" value={form.apellido_pat} onChange={(e) => setF('apellido_pat', e.target.value)} required />
              <Input label="Apellido materno" value={form.apellido_mat} onChange={(e) => setF('apellido_mat', e.target.value)} />
              <Input label="Teléfono" value={form.telefono} onChange={(e) => setF('telefono', e.target.value)} />
            </div>

            <Input label="Email" type="email" value={form.email}
              onChange={(e) => setF('email', e.target.value)} required />

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de trámite *</label>
              <select
                value={form.tipoTramiteId}
                onChange={(e) => setF('tipoTramiteId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
              >
                <option value="">Seleccionar trámite...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} — S/ {Number(t.costo_soles).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Documento adjunto (PDF)</label>
              {archivoPdf ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FileText size={16} className="text-green-600" />
                  <p className="text-sm font-medium text-green-700 truncate flex-1">{archivoPdf.name}</p>
                  <button onClick={() => setArchivoPdf(null)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-blue-50">
                  <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-500">Seleccionar PDF (Máx 10MB)</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleArchivoChange} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="primary" icon={<FileText size={14} />} loading={loadingReg} onClick={handleRegistrar}>
                Registrar expediente
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Modales (Detalle, Derivar, Token) - Mantienen su lógica original */}
      {/* ... (resto del código de los modales igual) */}
    </div>
  );
}