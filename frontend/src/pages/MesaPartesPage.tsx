// src/pages/MesaPartesPage.tsx

import { useEffect, useState } from 'react';
import { mesaPartesService }   from '../services/mesaPartes.service';
import { Card, CardTitle }     from '../components/ui/Card';
import Button                  from '../components/ui/Button';
import Input                   from '../components/ui/Input';
import Modal                   from '../components/ui/Modal';
import Alert                   from '../components/ui/Alert';
import Spinner                 from '../components/ui/Spinner';
import Table                   from '../components/ui/Table';
import EstadoBadge             from '../components/shared/EstadoBadge';
import {diasRestantes, colorDiasRestantes } from '../utils/formato';
import type { Area, EstadoExpediente } from '../types';
import {
  FileText, Plus, Send, RefreshCw,
  Search, Clock, CheckCircle,
} from 'lucide-react';

interface TipoTramite {
  id: number; nombre: string; costo_soles: number; plazo_dias: number;
}

interface ExpedienteBandeja {
  id:             number;
  codigo:         string;
  estado:         EstadoExpediente;
  fecha_registro: string;
  fecha_limite:   string;
  ciudadano:      { dni: string; nombres: string; apellido_pat: string; email: string };
  tipoTramite:    { nombre: string; costo_soles: number };
  pagos:          { boleta: string; monto_cobrado: number }[];
}

export default function MesaPartesPage() {
  const [tab,      setTab]      = useState<'bandeja' | 'registrar'>('bandeja');
  const [bandeja,  setBandeja]  = useState<ExpedienteBandeja[]>([]);
  const [tipos,    setTipos]    = useState<TipoTramite[]>([]);
  const [areas,    setAreas]    = useState<Area[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  // Formulario registro
  const [form, setForm] = useState({
    dni: '', nombres: '', apellido_pat: '', apellido_mat: '',
    email: '', telefono: '', tipoTramiteId: '',
  });
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [loadingReg,  setLoadingReg]  = useState(false);

  // Modal derivar
  const [modalDerivar,   setModalDerivar]   = useState(false);
  const [expDerivar,     setExpDerivar]     = useState<ExpedienteBandeja | null>(null);
  const [areaDestino,    setAreaDestino]    = useState('');
  const [instrucciones,  setInstrucciones]  = useState('');
  const [loadingDerivar, setLoadingDerivar] = useState(false);

  // Modal token
  const [modalToken,    setModalToken]    = useState(false);
  const [tokenInput,    setTokenInput]    = useState('');
  const [loadingToken,  setLoadingToken]  = useState(false);
  const [tokenGenerado, setTokenGenerado] = useState('');

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

  const buscarDni = async () => {
    if (form.dni.length !== 8) return;
    setBuscandoDni(true);
    try {
      const res = await mesaPartesService.consultarDni(form.dni);
      if (res.ciudadano) {
        const c = res.ciudadano;
        setForm(prev => ({
          ...prev,
          nombres:      c.nombres      || '',
          apellido_pat: c.apellido_pat || c.apellidoPat || '',
          apellido_mat: c.apellido_mat || c.apellidoMat || '',
          email:        c.email        || '',
        }));
      }
    } catch {
      // RENIEC no disponible — ingreso manual
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
      setSuccess(`Expediente ${res.expediente.codigo} registrado. El ciudadano debe pagar en ventanilla.`);
      setForm({ dni: '', nombres: '', apellido_pat: '', apellido_mat: '', email: '', telefono: '', tipoTramiteId: '' });
      setTab('bandeja');
      cargarDatos();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al registrar el expediente.');
    } finally {
      setLoadingReg(false);
    }
  };

  const abrirDerivar = (exp: ExpedienteBandeja) => {
    setExpDerivar(exp);
    setAreaDestino('');
    setInstrucciones('');
    setModalDerivar(true);
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
      setSuccess('Derivación confirmada. El expediente avanzó a DERIVADO.');
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
          <p className="text-sm text-gray-500 mt-0.5">Registro y derivación de expedientes</p>
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
          { key: 'bandeja',   label: `Bandeja (${bandeja.length})`, icon: <Clock size={13} /> },
          { key: 'registrar', label: 'Nuevo expediente',            icon: <Plus  size={13} /> },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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

      {/* Bandeja */}
      {tab === 'bandeja' && (
        <Card padding={false}>
          <Table
            keyField="id"
            data={bandeja}
            emptyText="No hay expedientes en bandeja. Los expedientes aparecen aquí después de que el cajero verifique el pago."
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
                key: 'tipoTramite', header: 'Trámite',
                render: (r) => <p className="text-sm text-gray-700">{r.tipoTramite.nombre}</p>,
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
                key: 'pago', header: 'Pago',
                render: (r) => r.pagos?.length > 0
                  ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12} />Verificado</span>
                  : <span className="text-xs text-yellow-600">Pendiente</span>,
              },
              {
                key: 'acciones', header: '',
                render: (r) => (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Send size={12} />}
                    onClick={() => abrirDerivar(r)}
                    disabled={!r.pagos || r.pagos.length === 0}
                  >
                    Derivar
                  </Button>
                ),
              },
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
                <Input
                  label="DNI del ciudadano"
                  placeholder="12345678"
                  value={form.dni}
                  onChange={(e) => setF('dni', e.target.value)}
                  maxLength={8}
                  required
                />
              </div>
              <Button
                variant="secondary"
                icon={<Search size={14} />}
                loading={buscandoDni}
                onClick={buscarDni}
                disabled={form.dni.length !== 8}
              >
                Buscar DNI
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Nombres"          value={form.nombres}      onChange={(e) => setF('nombres', e.target.value)}      required />
              <Input label="Apellido paterno" value={form.apellido_pat} onChange={(e) => setF('apellido_pat', e.target.value)} required />
              <Input label="Apellido materno" value={form.apellido_mat} onChange={(e) => setF('apellido_mat', e.target.value)} />
              <Input label="Teléfono"         value={form.telefono}     onChange={(e) => setF('telefono', e.target.value)}     placeholder="987654321" />
            </div>

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setF('email', e.target.value)}
              required
            />

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Tipo de trámite <span className="text-red-500">*</span>
              </label>
              <select
                value={form.tipoTramiteId}
                onChange={(e) => setF('tipoTramiteId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar trámite...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} — S/ {Number(t.costo_soles).toFixed(2)} ({t.plazo_dias} días)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setTab('bandeja')}>Cancelar</Button>
              <Button variant="primary" icon={<FileText size={14} />} loading={loadingReg} onClick={handleRegistrar}>
                Registrar expediente
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Modal derivar */}
      <Modal
        open={modalDerivar}
        onClose={() => setModalDerivar(false)}
        title="Derivar expediente al área técnica"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalDerivar(false)}>Cancelar</Button>
            <Button variant="primary" loading={loadingDerivar} icon={<Send size={14} />} onClick={handleDerivar} disabled={!areaDestino}>
              Derivar
            </Button>
          </>
        }
      >
        {expDerivar && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3 space-y-0.5">
              <p className="text-xs text-gray-500">Expediente a derivar</p>
              <p className="font-mono text-sm font-semibold text-blue-600">{expDerivar.codigo}</p>
              <p className="text-sm text-gray-700">{expDerivar.ciudadano.nombres} {expDerivar.ciudadano.apellido_pat}</p>
              <p className="text-sm text-gray-500">{expDerivar.tipoTramite.nombre}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Área destino <span className="text-red-500">*</span>
              </label>
              <select
                value={areaDestino}
                onChange={(e) => setAreaDestino(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar área...</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre} ({a.sigla})</option>
                ))}
              </select>
            </div>
            <Input
              label="Instrucciones (opcional)"
              placeholder="Instrucciones para el área técnica..."
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
            />
          </div>
        )}
      </Modal>

      {/* Modal token */}
      <Modal
        open={modalToken}
        onClose={() => setModalToken(false)}
        title="Confirmar derivación"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalToken(false)}>Cancelar</Button>
            <Button variant="primary" loading={loadingToken} icon={<CheckCircle size={14} />} onClick={handleConfirmarToken}>
              Confirmar derivación
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert type="info" message="Token generado. En producción se envía por email. Para la demo confirma directamente." />
          {tokenGenerado && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Token generado:</p>
              <p className="font-mono text-xs text-gray-700 break-all">{tokenGenerado}</p>
            </div>
          )}
          <Input
            label="Token (opcional)"
            placeholder="O confirma directamente con el botón"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            helper="Puedes confirmar sin pegar el token si ya aparece arriba."
          />
        </div>
      </Modal>
    </div>
  );
}