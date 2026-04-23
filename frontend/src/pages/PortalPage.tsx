// src/pages/PortalPage.tsx

import { useEffect, useState, useRef } from 'react';
import { useNavigate }                  from 'react-router-dom';
import { portalService }                from '../services/portal.service';
import { documentosService }            from '../services/documentos.service';
import Button                           from '../components/ui/Button';
import Input                            from '../components/ui/Input';
import Alert                            from '../components/ui/Alert';
import Spinner                          from '../components/ui/Spinner';
import {
  Building2, Search, FileText,
  ArrowRight, CheckCircle, Upload, X,
} from 'lucide-react';

interface TipoTramite {
  id: number; nombre: string; descripcion: string | null;
  costo_soles: number; plazo_dias: number;
}

export default function PortalPage() {
  const navigate = useNavigate();

  const [paso,    setPaso]    = useState<1 | 2 | 3>(1);
  const [tipos,   setTipos]   = useState<TipoTramite[]>([]);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [codigoGenerado, setCodigoGenerado] = useState('');

  // Consulta rápida
  const [codigoConsulta, setCodigoConsulta] = useState('');

  // Formulario
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoTramite | null>(null);
  const [form, setForm] = useState({
    dni: '', nombres: '', apellido_pat: '', apellido_mat: '',
    email: '', telefono: '',
  });
  const [buscandoDni, setBuscandoDni] = useState(false);

  // Documento PDF
  const [archivoPdf,   setArchivoPdf]   = useState<File | null>(null);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

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
    } catch {
      // RENIEC no disponible — ingreso manual
    } finally {
      setBuscandoDni(false);
    }
  };

  const handleRegistrar = async () => {
    if (!form.dni || !form.nombres || !form.apellido_pat || !form.email || !tipoSeleccionado) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    setLoading(true);
    try {
      // 1. Registrar expediente
      const res = await portalService.registrar({
        ...form,
        tipoTramiteId: String(tipoSeleccionado.id),
      });

      const expedienteId = res.expediente.id;

      // 2. Subir PDF adjunto si existe
      if (archivoPdf) {
        try {
          await documentosService.subirDocumento(expedienteId, archivoPdf);
        } catch {
          // El expediente se registró OK — el PDF falló pero no bloqueamos
          console.warn('No se pudo subir el PDF adjunto.');
        }
      }

      setCodigoGenerado(res.expediente.codigo);
      setPaso(3);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al registrar el trámite.');
    } finally {
      setLoading(false);
    }
  };

  const setF = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar los 10MB.');
      return;
    }
    setArchivoPdf(file);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Municipalidad Distrital de Carmen Alto</p>
              <p className="text-xs text-blue-600">Portal de Trámites Ciudadanos</p>
            </div>
          </div>
          <button onClick={() => navigate('/login')} className="text-sm text-gray-500 hover:text-gray-700">
            Acceso personal →
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Consulta rápida */}
        <div className="bg-blue-600 rounded-2xl p-6 text-white">
          <h2 className="text-lg font-bold mb-1">Consulta el estado de tu trámite</h2>
          <p className="text-blue-100 text-sm mb-4">Ingresa tu código de expediente</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="EXP-2026-000001"
              value={codigoConsulta}
              onChange={(e) => setCodigoConsulta(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-2.5 rounded-lg text-gray-900 text-sm outline-none"
            />
            <button
              onClick={() => codigoConsulta && navigate(`/consulta/${codigoConsulta}`)}
              className="bg-white text-blue-600 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-blue-50 flex items-center gap-2"
            >
              <Search size={15} />
              Consultar
            </button>
          </div>
        </div>

        {/* Formulario registro */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Registrar nuevo trámite</h2>
            <p className="text-sm text-gray-500 mt-0.5">Completa el formulario para iniciar tu trámite</p>
          </div>

          {/* Indicador de pasos */}
          <div className="flex border-b border-gray-100">
            {[
              { num: 1, label: 'Seleccionar trámite' },
              { num: 2, label: 'Datos y documento'   },
              { num: 3, label: 'Confirmación'         },
            ].map((p) => (
              <div
                key={p.num}
                className={`flex-1 flex items-center gap-2 px-4 py-3 text-xs font-medium ${
                  paso === p.num
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : paso > p.num ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  paso > p.num ? 'bg-green-100' : paso === p.num ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {paso > p.num ? '✓' : p.num}
                </span>
                {p.label}
              </div>
            ))}
          </div>

          <div className="p-6">
            {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-4" />}

            {/* Paso 1: Seleccionar trámite */}
            {paso === 1 && (
              <div className="space-y-3">
                {tipos.length === 0 ? (
                  <Spinner text="Cargando trámites..." />
                ) : (
                  tipos.map((tipo) => (
                    <div
                      key={tipo.id}
                      onClick={() => setTipoSeleccionado(tipo)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        tipoSeleccionado?.id === tipo.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{tipo.nombre}</p>
                          {tipo.descripcion && <p className="text-xs text-gray-500 mt-0.5">{tipo.descripcion}</p>}
                          <p className="text-xs text-gray-400 mt-1">Plazo: {tipo.plazo_dias} días hábiles</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">S/ {Number(tipo.costo_soles).toFixed(2)}</p>
                          {tipoSeleccionado?.id === tipo.id && <CheckCircle size={18} className="text-blue-500 ml-auto mt-1" />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex justify-end pt-2">
                  <Button icon={<ArrowRight size={14} />} onClick={() => {
                    if (!tipoSeleccionado) { setError('Selecciona un tipo de trámite.'); return; }
                    setError(''); setPaso(2);
                  }}>
                    Continuar
                  </Button>
                </div>
              </div>
            )}

            {/* Paso 2: Datos personales + documento */}
            {paso === 2 && (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-gray-500">Trámite seleccionado</p>
                  <p className="font-semibold text-blue-700">{tipoSeleccionado?.nombre}</p>
                  <p className="text-green-600 font-bold">S/ {Number(tipoSeleccionado?.costo_soles).toFixed(2)}</p>
                </div>

                {/* DNI con búsqueda */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input label="DNI" placeholder="12345678" value={form.dni}
                      onChange={(e) => setF('dni', e.target.value)} maxLength={8} required />
                  </div>
                  <Button variant="secondary" icon={<Search size={14} />} loading={buscandoDni}
                    onClick={buscarDni} disabled={form.dni.length !== 8}>
                    Buscar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nombres"          value={form.nombres}      onChange={(e) => setF('nombres', e.target.value)}      required />
                  <Input label="Apellido paterno" value={form.apellido_pat} onChange={(e) => setF('apellido_pat', e.target.value)} required />
                  <Input label="Apellido materno" value={form.apellido_mat} onChange={(e) => setF('apellido_mat', e.target.value)} />
                  <Input label="Teléfono"         value={form.telefono}     onChange={(e) => setF('telefono', e.target.value)}     placeholder="987654321" />
                </div>

                <Input label="Email" type="email" value={form.email}
                  onChange={(e) => setF('email', e.target.value)} required
                  helper="Recibirás notificaciones en este correo" />

                {/* Subida de documento PDF */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Documento adjunto (PDF)
                    <span className="text-gray-400 font-normal ml-1">— opcional</span>
                  </label>

                  {archivoPdf ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <FileText size={16} className="text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-700 truncate">{archivoPdf.name}</p>
                        <p className="text-xs text-green-500">{(archivoPdf.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => { setArchivoPdf(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Haz clic para seleccionar un PDF</p>
                      <p className="text-xs text-gray-400 mt-1">Máximo 10MB</p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleArchivoChange}
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="secondary" onClick={() => setPaso(1)}>← Atrás</Button>
                  <Button loading={loading} icon={<FileText size={14} />} onClick={handleRegistrar}>
                    Registrar trámite
                  </Button>
                </div>
              </div>
            )}

            {/* Paso 3: Confirmación */}
            {paso === 3 && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">¡Trámite registrado!</h3>
                  <p className="text-sm text-gray-500 mt-1">Tu código de expediente es:</p>
                  <p className="text-2xl font-mono font-bold text-blue-600 mt-2">{codigoGenerado}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">Próximo paso:</p>
                  <p className="text-sm text-yellow-700">
                    Acércate a la ventanilla de caja de la Municipalidad de Carmen Alto con este código
                    para realizar el pago y activar tu trámite.
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="secondary" onClick={() => {
                    setPaso(1); setTipoSeleccionado(null); setArchivoPdf(null);
                    setForm({ dni: '', nombres: '', apellido_pat: '', apellido_mat: '', email: '', telefono: '' });
                  }}>
                    Registrar otro trámite
                  </Button>
                  <Button icon={<Search size={14} />} onClick={() => navigate(`/consulta/${codigoGenerado}`)}>
                    Consultar estado
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}