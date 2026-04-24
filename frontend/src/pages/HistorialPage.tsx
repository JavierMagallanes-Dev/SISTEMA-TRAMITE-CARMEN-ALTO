// src/pages/HistorialPage.tsx
// Historial de expedientes RESUELTOS y ARCHIVADOS.
// Visible para JEFE_AREA y ADMIN.

import { useEffect, useState } from 'react';
import api                     from '../services/api';
import { Card }                from '../components/ui/Card';
import Button                  from '../components/ui/Button';
import Alert                   from '../components/ui/Alert';
import Spinner                 from '../components/ui/Spinner';
import Modal                   from '../components/ui/Modal';
import EstadoBadge             from '../components/shared/EstadoBadge';
import TimelineMovimientos     from '../components/shared/TimelineMovimientos';
import { areasService }        from '../services/areas.service';
import { formatFecha, diasRestantes, colorDiasRestantes } from '../utils/formato';
import type { EstadoExpediente, Movimiento } from '../types';
import {
  RefreshCw, Eye, Search, Download,
  FileText, Archive, CheckCircle, Filter,
} from 'lucide-react';

const VITE_API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface Documento { id: number; nombre: string; url: string; tipo_mime: string; uploaded_at: string; }

interface Expediente {
  id:                        number;
  codigo:                    string;
  estado:                    EstadoExpediente;
  fecha_registro:            string;
  fecha_limite:              string;
  fecha_resolucion:          string | null;
  url_pdf_firmado:           string | null;
  codigo_verificacion_firma: string | null;
  ciudadano:   { dni: string; nombres: string; apellido_pat: string; apellido_mat: string; email: string };
  tipoTramite: { nombre: string; plazo_dias: number; costo_soles: number };
  areaActual:  { nombre: string; sigla: string } | null;
  pagos:       { boleta: string; monto_cobrado: number; fecha_pago: string }[];
  movimientos: Movimiento[];
  documentos:  Documento[];
}

export default function HistorialPage() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [cargando,    setCargando]    = useState(true);
  const [error,       setError]       = useState('');

  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'RESUELTO' | 'ARCHIVADO'>('TODOS');
  const [busqueda,     setBusqueda]     = useState('');

  const [modalDetalle, setModalDetalle] = useState(false);
  const [detalle,      setDetalle]      = useState<Expediente | null>(null);
  const [cargandoDet,  setCargandoDet]  = useState(false);

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      const res = await api.get('/areas/historial');
      setExpedientes(res.data);
    } catch {
      setError('Error al cargar el historial.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarHistorial(); }, []);

  const verDetalle = async (id: number) => {
    setModalDetalle(true);
    setCargandoDet(true);
    try {
      const det = await areasService.detalle(id);
      setDetalle({ ...det, documentos: det.documentos ?? [] });
    } catch {
      setError('Error al cargar el detalle.');
    } finally {
      setCargandoDet(false);
    }
  };

  const expedientesFiltrados = expedientes.filter((exp) => {
    const coincideEstado  = filtroEstado === 'TODOS' || exp.estado === filtroEstado;
    const coincideBusqueda = busqueda.trim() === '' ||
      exp.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      `${exp.ciudadano.nombres} ${exp.ciudadano.apellido_pat}`.toLowerCase().includes(busqueda.toLowerCase()) ||
      exp.ciudadano.dni.includes(busqueda) ||
      exp.tipoTramite.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return coincideEstado && coincideBusqueda;
  });

  const totalResueltos  = expedientes.filter(e => e.estado === 'RESUELTO').length;
  const totalArchivados = expedientes.filter(e => e.estado === 'ARCHIVADO').length;

  if (cargando) return <Spinner text="Cargando historial..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Historial de Trámites</h1>
          <p className="text-sm text-gray-500 mt-0.5">Expedientes resueltos y archivados</p>
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={cargarHistorial}>
          Actualizar
        </Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalResueltos}</p>
              <p className="text-xs text-gray-500">Resueltos</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Archive size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalArchivados}</p>
              <p className="text-xs text-gray-500">Archivados</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{expedientes.length}</p>
              <p className="text-xs text-gray-500">Total historial</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex items-center gap-4">
          <Filter size={15} className="text-gray-400 shrink-0" />

          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, ciudadano, DNI o trámite..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500"
            />
          </div>

          {/* Filtro estado */}
          <div className="flex gap-1">
            {(['TODOS', 'RESUELTO', 'ARCHIVADO'] as const).map((e) => (
              <button key={e} onClick={() => setFiltroEstado(e)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filtroEstado === e
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {e === 'TODOS' ? `Todos (${expedientes.length})` :
                 e === 'RESUELTO' ? `Resueltos (${totalResueltos})` :
                 `Archivados (${totalArchivados})`}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Lista */}
      {expedientesFiltrados.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-gray-400">
            <Archive size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay expedientes en el historial.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {expedientesFiltrados.map((exp) => (
            <Card key={exp.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-blue-600">{exp.codigo}</span>
                    <EstadoBadge estado={exp.estado} size="sm" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">{exp.tipoTramite.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {exp.ciudadano.nombres} {exp.ciudadano.apellido_pat} · DNI {exp.ciudadano.dni}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Registrado: {formatFecha(exp.fecha_registro)}</span>
                    {exp.fecha_resolucion && (
                      <span className="text-green-600 font-medium">
                        Resuelto: {formatFecha(exp.fecha_resolucion)}
                      </span>
                    )}
                    {exp.areaActual && (
                      <span>Área: {exp.areaActual.nombre}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="ghost" icon={<Eye size={13} />}
                    onClick={() => verDetalle(exp.id)}>
                    Ver detalle
                  </Button>
                  {exp.url_pdf_firmado && (
                    <a href={exp.url_pdf_firmado} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                      <Download size={13} />PDF firmado
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal detalle */}
      <Modal open={modalDetalle} onClose={() => setModalDetalle(false)} title="Detalle del expediente" size="lg">
        {cargandoDet ? <Spinner text="Cargando..." /> : detalle ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-gray-400">Código</p><p className="font-mono font-bold text-blue-600">{detalle.codigo}</p></div>
              <div><p className="text-xs text-gray-400">Estado</p><EstadoBadge estado={detalle.estado} /></div>
              <div>
                <p className="text-xs text-gray-400">Ciudadano</p>
                <p className="font-medium">{detalle.ciudadano.nombres} {detalle.ciudadano.apellido_pat}</p>
                <p className="text-xs text-gray-500">DNI: {detalle.ciudadano.dni} · {detalle.ciudadano.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Trámite</p>
                <p className="font-medium">{detalle.tipoTramite.nombre}</p>
                <p className="text-xs text-gray-500">{detalle.tipoTramite.plazo_dias} días · S/ {Number(detalle.tipoTramite.costo_soles).toFixed(2)}</p>
              </div>
              <div><p className="text-xs text-gray-400">Registrado</p><p>{formatFecha(detalle.fecha_registro)}</p></div>
              <div>
                <p className="text-xs text-gray-400">Resuelto</p>
                <p className="text-green-600 font-medium">{detalle.fecha_resolucion ? formatFecha(detalle.fecha_resolucion) : '—'}</p>
              </div>
            </div>

            {/* PDF firmado */}
            {detalle.url_pdf_firmado && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800">✅ Documento firmado digitalmente</p>
                    {detalle.codigo_verificacion_firma && (
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">Código: {detalle.codigo_verificacion_firma}</p>
                    )}
                  </div>
                  <a href={detalle.url_pdf_firmado} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-green-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-green-700">
                    <Download size={13} />Descargar
                  </a>
                </div>
              </div>
            )}

            {/* Documentos */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-2">Documentos adjuntos ({detalle.documentos?.length ?? 0})</p>
              {detalle.documentos?.length > 0 ? (
                <div className="space-y-2">
                  {detalle.documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <FileText size={15} className="text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{doc.nombre}</p>
                        <p className="text-xs text-gray-400">{formatFecha(doc.uploaded_at)}</p>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <Download size={12} />Descargar
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-lg">Sin documentos adjuntos.</p>
              )}
            </div>

            {/* Timeline */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-3">Historial de movimientos</p>
              <TimelineMovimientos movimientos={detalle.movimientos} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}