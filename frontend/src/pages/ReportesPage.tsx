// src/pages/ReportesPage.tsx

import { useEffect, useState } from 'react';
import api                     from '../services/api';
import { Card }                from '../components/ui/Card';
import Button                  from '../components/ui/Button';
import Alert                   from '../components/ui/Alert';
import Spinner                 from '../components/ui/Spinner';
import { FileText, Download, RefreshCw, Filter } from 'lucide-react';

interface Area        { id: number; nombre: string; sigla: string }
interface TipoTramite { id: number; nombre: string }

export default function ReportesPage() {
  const [areas,   setAreas]   = useState<Area[]>([]);
  const [tipos,   setTipos]   = useState<TipoTramite[]>([]);
  const [estados, setEstados] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');

  const [filtros, setFiltros] = useState({
    estado:        '',
    areaId:        '',
    tipoTramiteId: '',
    fechaDesde:    '',
    fechaHasta:    '',
  });

  const [descargando, setDescargando] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    api.get('/reportes/datos')
      .then((r) => {
        setAreas(r.data.areas);
        setTipos(r.data.tipos);
        setEstados(r.data.estados);
      })
      .catch(() => setError('Error al cargar los filtros.'))
      .finally(() => setCargando(false));
  }, []);

  const buildParams = () => {
    const params = new URLSearchParams();
    if (filtros.estado)        params.append('estado',        filtros.estado);
    if (filtros.areaId)        params.append('areaId',        filtros.areaId);
    if (filtros.tipoTramiteId) params.append('tipoTramiteId', filtros.tipoTramiteId);
    if (filtros.fechaDesde)    params.append('fechaDesde',    filtros.fechaDesde);
    if (filtros.fechaHasta)    params.append('fechaHasta',    filtros.fechaHasta);
    return params.toString();
  };

  const descargar = async (tipo: 'excel' | 'pdf') => {
    setDescargando(tipo);
    setError('');
    try {
      const params   = buildParams();
      const endpoint = tipo === 'excel' ? '/reportes/excel' : '/reportes/pdf';
      const mimeType = tipo === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const ext = tipo === 'excel' ? 'xlsx' : 'pdf';

      const res = await api.get(`${endpoint}${params ? '?' + params : ''}`, { responseType: 'blob' });

      const url  = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `reporte-expedientes-${Date.now()}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError(`Error al generar el reporte ${tipo.toUpperCase()}.`);
    } finally {
      setDescargando(null);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({ estado: '', areaId: '', tipoTramiteId: '', fechaDesde: '', fechaHasta: '' });
  };

  const setF = (field: string, value: string) =>
    setFiltros(prev => ({ ...prev, [field]: value }));

  const estadoLabel = (e: string) => e.replace(/_/g, ' ');

  const filtrosActivos = Object.values(filtros).filter(Boolean).length;

  if (cargando) return <Spinner text="Cargando reportes..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reportes y Estadísticas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Exporta expedientes filtrados en Excel o PDF</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Filtros */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-blue-600" />
          <h2 className="text-sm font-bold text-gray-800">Filtros</h2>
          {filtrosActivos > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {filtrosActivos} activo(s)
            </span>
          )}
          {filtrosActivos > 0 && (
            <button onClick={limpiarFiltros} className="ml-auto text-xs text-gray-400 hover:text-gray-600">
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Estado */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
            <select value={filtros.estado} onChange={(e) => setF('estado', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
              <option value="">Todos los estados</option>
              {estados.map((e) => (
                <option key={e} value={e}>{estadoLabel(e)}</option>
              ))}
            </select>
          </div>

          {/* Área */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Área responsable</label>
            <select value={filtros.areaId} onChange={(e) => setF('areaId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre} ({a.sigla})</option>
              ))}
            </select>
          </div>

          {/* Tipo trámite */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de trámite</label>
            <select value={filtros.tipoTramiteId} onChange={(e) => setF('tipoTramiteId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
              <option value="">Todos los trámites</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha desde */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Fecha desde</label>
            <input type="date" value={filtros.fechaDesde} onChange={(e) => setF('fechaDesde', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
          </div>

          {/* Fecha hasta */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Fecha hasta</label>
            <input type="date" value={filtros.fechaHasta} onChange={(e) => setF('fechaHasta', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500" />
          </div>
        </div>
      </Card>

      {/* Exportar */}
      <div className="grid grid-cols-2 gap-4">
        {/* Excel */}
        <Card>
          <div className="flex flex-col items-center text-center p-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
              <FileText size={28} className="text-green-600" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">Exportar Excel</p>
              <p className="text-xs text-gray-500 mt-1">
                Archivo .xlsx con todos los expedientes filtrados. Ideal para análisis y reportes administrativos.
              </p>
            </div>
            <Button
              variant="primary"
              icon={<Download size={14} />}
              loading={descargando === 'excel'}
              onClick={() => descargar('excel')}
              className="w-full justify-center"
              style={{ background: '#16a34a' }}
            >
              Descargar Excel (.xlsx)
            </Button>
          </div>
        </Card>

        {/* PDF */}
        <Card>
          <div className="flex flex-col items-center text-center p-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
              <FileText size={28} className="text-red-600" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">Exportar PDF</p>
              <p className="text-xs text-gray-500 mt-1">
                Documento .pdf listo para impresión con encabezado institucional y tabla de expedientes.
              </p>
            </div>
            <Button
              variant="danger"
              icon={<Download size={14} />}
              loading={descargando === 'pdf'}
              onClick={() => descargar('pdf')}
              className="w-full justify-center"
            >
              Descargar PDF (.pdf)
            </Button>
          </div>
        </Card>
      </div>

      {/* Info */}
      <Card>
        <div className="flex items-start gap-3">
          <RefreshCw size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-800">¿Cómo usar los reportes?</p>
            <p>1. Selecciona los filtros que necesitas (estado, área, tipo de trámite, fechas).</p>
            <p>2. Si no seleccionas filtros, el reporte incluirá <strong>todos los expedientes</strong>.</p>
            <p>3. Haz clic en <strong>Descargar Excel</strong> para análisis o <strong>Descargar PDF</strong> para impresión.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}