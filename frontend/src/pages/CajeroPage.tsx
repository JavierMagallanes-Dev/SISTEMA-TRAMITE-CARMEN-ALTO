// src/pages/CajeroPage.tsx

import { useEffect, useState } from 'react';
import { cajeroService }       from '../services/cajero.service';
import { Card, CardTitle }     from '../components/ui/Card';
import Button      from '../components/ui/Button';
import Input       from '../components/ui/Input';
import Modal       from '../components/ui/Modal';
import Alert       from '../components/ui/Alert';
import Spinner     from '../components/ui/Spinner';
import Table       from '../components/ui/Table';
import { formatFecha, formatFechaHora, formatMoneda } from '../utils/formato';
import { CreditCard, History, RefreshCw, Ban, Eye, FileImage, ExternalLink, CheckCircle } from 'lucide-react';

interface PagoComprobante {
  id:              number;
  url_comprobante: string | null;
  boleta:          string;
  fecha_pago:      string;
}

interface ExpedientePendiente {
  id:             number;
  codigo:         string;
  fecha_registro: string;
  ciudadano: {
    dni:          string;
    nombres:      string;
    apellido_pat: string;
  };
  tipoTramite: {
    nombre:      string;
    costo_soles: number;
  };
  pagos: PagoComprobante[];
}

interface PagoHistorial {
  id:              number;
  boleta:          string;
  monto_cobrado:   number;
  estado:          string;
  fecha_pago:      string;
  url_comprobante: string | null;
  expediente: {
    codigo:    string;
    ciudadano: { nombres: string; apellido_pat: string };
  };
}

export default function CajeroPage() {
  const [tab,        setTab]        = useState<'pendientes' | 'historial'>('pendientes');
  const [pendientes, setPendientes] = useState<ExpedientePendiente[]>([]);
  const [historial,  setHistorial]  = useState<{ pagos: PagoHistorial[]; total_monto: number }>({ pagos: [], total_monto: 0 });
  const [resumenHoy, setResumenHoy] = useState<{ pagos_verificados_hoy: number; total_recaudado_hoy: number } | null>(null);
  const [cargando,   setCargando]   = useState(true);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // Modal verificar pago
  const [modalPago,       setModalPago]       = useState(false);
  const [expSeleccionado, setExpSeleccionado] = useState<ExpedientePendiente | null>(null);
  const [boleta,          setBoleta]          = useState('');
  const [monto,           setMonto]           = useState('');
  const [loadingPago,     setLoadingPago]     = useState(false);

  // Modal anular
  const [modalAnular,      setModalAnular]      = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<PagoHistorial | null>(null);
  const [motivo,           setMotivo]           = useState('');
  const [loadingAnular,    setLoadingAnular]    = useState(false);

  // Modal ver comprobante
  const [modalComprobante, setModalComprobante] = useState(false);
  const [urlComprobante,   setUrlComprobante]   = useState('');
  const [esImagen,         setEsImagen]         = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [pend, hist, resumen] = await Promise.all([
        cajeroService.pendientes(),
        cajeroService.historial(),
        cajeroService.resumenHoy(),
      ]);
      setPendientes(pend);
      setHistorial(hist);
      setResumenHoy(resumen);
    } catch {
      setError('Error al cargar los datos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const abrirModalPago = (exp: ExpedientePendiente) => {
    setExpSeleccionado(exp);
    setMonto(String(exp.tipoTramite.costo_soles));
    setBoleta('');
    setModalPago(true);
  };

  const handleVerificarPago = async () => {
    if (!expSeleccionado || !boleta.trim() || !monto) return;
    setLoadingPago(true);
    try {
      await cajeroService.verificarPago(expSeleccionado.id, boleta.trim(), Number(monto));
      setSuccess(`Pago verificado para ${expSeleccionado.codigo}.`);
      setModalPago(false);
      cargarDatos();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al verificar el pago.');
    } finally {
      setLoadingPago(false);
    }
  };

  const abrirModalAnular = (pago: PagoHistorial) => {
    setPagoSeleccionado(pago);
    setMotivo('');
    setModalAnular(true);
  };

  const handleAnularPago = async () => {
    if (!pagoSeleccionado || !motivo.trim()) return;
    setLoadingAnular(true);
    try {
      await cajeroService.anularPago(pagoSeleccionado.id, motivo.trim());
      setSuccess('Pago anulado correctamente.');
      setModalAnular(false);
      cargarDatos();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al anular el pago.');
    } finally {
      setLoadingAnular(false);
    }
  };

  const verComprobante = (url: string) => {
    setUrlComprobante(url);
    setEsImagen(!url.endsWith('.pdf'));
    setModalComprobante(true);
  };

  if (cargando) return <Spinner text="Cargando módulo cajero..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Módulo Cajero</h1>
          <p className="text-sm text-gray-500 mt-0.5">Verificación y control de pagos</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={cargarDatos}>
          Actualizar
        </Button>
      </div>

      {error   && <Alert type="error"   message={error}   onClose={() => setError('')}   />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* KPIs del día */}
      {resumenHoy && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CreditCard size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{resumenHoy.pagos_verificados_hoy}</p>
                <p className="text-xs text-gray-500">Pagos verificados hoy</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CreditCard size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatMoneda(resumenHoy.total_recaudado_hoy)}</p>
                <p className="text-xs text-gray-500">Total recaudado hoy</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['pendientes', 'historial'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'historial' && <History size={13} />}
            {t === 'pendientes' ? `Pendientes de pago (${pendientes.length})` : 'Historial'}
          </button>
        ))}
      </div>

      {/* Pendientes */}
      {tab === 'pendientes' && (
        <Card padding={false}>
          <Table
            keyField="id"
            data={pendientes}
            emptyText="No hay expedientes pendientes de pago"
            columns={[
              {
                key: 'codigo', header: 'Código',
                render: (r) => (
                  <div>
                    <span className="font-mono text-xs text-blue-600 font-semibold">{r.codigo}</span>
                    {/* Badge si tiene comprobante adjunto */}
                    {r.pagos?.[0]?.url_comprobante && (
                      <div className="flex items-center gap-1 mt-1">
                        <FileImage size={11} className="text-green-500" />
                        <span className="text-xs text-green-600 font-medium">Comprobante adjunto</span>
                      </div>
                    )}
                  </div>
                ),
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
                render: (r) => (
                  <div>
                    <p className="text-sm text-gray-700">{r.tipoTramite.nombre}</p>
                    <p className="text-xs font-semibold text-green-600">{formatMoneda(r.tipoTramite.costo_soles)}</p>
                  </div>
                ),
              },
              {
                key: 'fecha_registro', header: 'Registrado',
                render: (r) => <span className="text-xs text-gray-500">{formatFecha(r.fecha_registro)}</span>,
              },
              {
                key: 'acciones', header: '',
                render: (r) => (
                  <div className="flex items-center gap-2">
                    {/* Botón ver comprobante */}
                    {r.pagos?.[0]?.url_comprobante && (
                      <Button size="sm" variant="secondary"
                        icon={<Eye size={12} />}
                        onClick={() => verComprobante(r.pagos[0].url_comprobante!)}>
                        Ver comprobante
                      </Button>
                    )}
                    <Button size="sm" icon={<CreditCard size={12} />} onClick={() => abrirModalPago(r)}>
                      Verificar pago
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* Historial */}
      {tab === 'historial' && (
        <Card padding={false}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <CardTitle>Historial de pagos</CardTitle>
            <span className="text-sm font-semibold text-green-600">
              Total: {formatMoneda(historial.total_monto)}
            </span>
          </div>
          <Table
            keyField="id"
            data={historial.pagos}
            emptyText="No hay pagos registrados"
            columns={[
              {
                key: 'expediente', header: 'Expediente',
                render: (r) => <span className="font-mono text-xs text-blue-600 font-semibold">{r.expediente.codigo}</span>,
              },
              {
                key: 'ciudadano', header: 'Ciudadano',
                render: (r) => <p className="text-sm text-gray-700">{r.expediente.ciudadano.nombres} {r.expediente.ciudadano.apellido_pat}</p>,
              },
              {
                key: 'boleta', header: 'Boleta',
                render: (r) => <span className="text-xs font-mono text-gray-600">{r.boleta}</span>,
              },
              {
                key: 'monto_cobrado', header: 'Monto',
                render: (r) => <span className="text-sm font-semibold text-green-600">{formatMoneda(r.monto_cobrado)}</span>,
              },
              {
                key: 'estado', header: 'Estado',
                render: (r) => (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.estado === 'VERIFICADO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {r.estado}
                  </span>
                ),
              },
              {
                key: 'comprobante', header: 'Comprobante',
                render: (r) => r.url_comprobante ? (
                  <button onClick={() => verComprobante(r.url_comprobante!)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <FileImage size={12} />Ver
                  </button>
                ) : <span className="text-xs text-gray-400">—</span>,
              },
              {
                key: 'fecha_pago', header: 'Fecha',
                render: (r) => <span className="text-xs text-gray-500">{formatFechaHora(r.fecha_pago)}</span>,
              },
              {
                key: 'acciones', header: '',
                render: (r) => r.estado === 'VERIFICADO' ? (
                  <Button size="sm" variant="danger" icon={<Ban size={12} />} onClick={() => abrirModalAnular(r)}>
                    Anular
                  </Button>
                ) : null,
              },
            ]}
          />
        </Card>
      )}

      {/* ── Modal verificar pago ─────────────────────────────── */}
      <Modal open={modalPago} onClose={() => setModalPago(false)} title="Verificar pago" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalPago(false)}>Cancelar</Button>
            <Button variant="primary" loading={loadingPago} icon={<CreditCard size={14} />}
              onClick={handleVerificarPago} disabled={!boleta.trim() || !monto}>
              Confirmar pago
            </Button>
          </>
        }>
        {expSeleccionado && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-gray-500">Expediente</p>
              <p className="font-mono text-sm font-semibold text-blue-600">{expSeleccionado.codigo}</p>
              <p className="text-sm text-gray-700">{expSeleccionado.ciudadano.nombres} {expSeleccionado.ciudadano.apellido_pat}</p>
              <p className="text-sm text-gray-600">{expSeleccionado.tipoTramite.nombre}</p>
              <p className="text-base font-bold text-green-600">Monto: {formatMoneda(expSeleccionado.tipoTramite.costo_soles)}</p>
            </div>

            {/* Comprobante adjunto por el ciudadano */}
            {expSeleccionado.pagos?.[0]?.url_comprobante && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-green-800">El ciudadano adjuntó comprobante</p>
                      <p className="text-xs text-green-600 mt-0.5">Revísalo antes de verificar el pago</p>
                    </div>
                  </div>
                  <button
                    onClick={() => verComprobante(expSeleccionado.pagos[0].url_comprobante!)}
                    className="flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline bg-white border border-blue-200 px-3 py-1.5 rounded-lg">
                    <Eye size={12} />Ver comprobante
                  </button>
                </div>
              </div>
            )}

            <Input label="Número de boleta" placeholder="B001-000123"
              value={boleta} onChange={(e) => setBoleta(e.target.value)} required autoFocus />
            <Input label="Monto cobrado (S/)" type="number"
              value={monto} onChange={(e) => setMonto(e.target.value)} required />
          </div>
        )}
      </Modal>

      {/* ── Modal anular pago ────────────────────────────────── */}
      <Modal open={modalAnular} onClose={() => setModalAnular(false)} title="Anular pago" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalAnular(false)}>Cancelar</Button>
            <Button variant="danger" loading={loadingAnular} icon={<Ban size={14} />}
              onClick={handleAnularPago} disabled={!motivo.trim()}>
              Anular pago
            </Button>
          </>
        }>
        {pagoSeleccionado && (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-gray-500">Pago a anular</p>
              <p className="font-mono text-sm text-blue-600">{pagoSeleccionado.expediente.codigo}</p>
              <p className="text-sm text-gray-700">Boleta: {pagoSeleccionado.boleta}</p>
              <p className="text-sm font-bold text-red-600">{formatMoneda(pagoSeleccionado.monto_cobrado)}</p>
            </div>
            <Input label="Motivo de anulación" placeholder="Describe el motivo..."
              value={motivo} onChange={(e) => setMotivo(e.target.value)} required autoFocus />
          </div>
        )}
      </Modal>

      {/* ── Modal ver comprobante ────────────────────────────── */}
      <Modal open={modalComprobante} onClose={() => setModalComprobante(false)}
        title="Comprobante de pago" size="lg"
        footer={
          <a href={urlComprobante} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium">
            <ExternalLink size={14} />Abrir en nueva pestaña
          </a>
        }>
        <div className="flex flex-col items-center gap-4">
          {esImagen ? (
            <img src={urlComprobante} alt="Comprobante de pago"
              className="max-w-full max-h-[60vh] object-contain rounded-lg border border-gray-200" />
          ) : (
            <div className="w-full h-[60vh]">
              <iframe src={urlComprobante} className="w-full h-full rounded-lg border border-gray-200" title="Comprobante PDF" />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}