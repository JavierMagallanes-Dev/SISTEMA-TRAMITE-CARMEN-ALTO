// src/pages/PortalPage.tsx
// Portal de Trámites — 3 pasos: Selección, Datos, Pago.
// Cada paso es un componente independiente con su propio CSS.

import { useEffect, useState } from 'react';
import { portalService }        from '../services/portal.service';
import { documentosService }    from '../services/documentos.service';
import Spinner                  from '../components/ui/Spinner';
import SeleccionTramite         from '../components/shared/SeleccionTramite';
import Paso2Datos               from '../components/shared/Paso2Datos';
import Paso3Pago                from '../components/shared/Paso3Pago';
import { toast }                from '../utils/toast';

interface TipoTramite {
  id: number; nombre: string; descripcion: string | null;
  costo_soles: number; plazo_dias: number;
}

export default function PortalPage() {
  const [paso,             setPaso]             = useState<1 | 2 | 3>(1);
  const [tipos,            setTipos]            = useState<TipoTramite[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [codigoGenerado,   setCodigoGenerado]   = useState('');
  const [tipoRegistrado,   setTipoRegistrado]   = useState<TipoTramite | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoTramite | null>(null);
  const [turnstileToken,   setTurnstileToken]   = useState('');
  const [archivoPdf,       setArchivoPdf]       = useState<File | null>(null);

  const [form, setForm] = useState({
    dni: '', nombres: '', apellido_pat: '', apellido_mat: '',
    email: '', telefono: '',
  });

  const [buscandoDni, setBuscandoDni] = useState(false);

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
        tipoTramiteId:           String(tipoSeleccionado.id),
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
      setTurnstileToken('');
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

  const resetForm = () => {
    setPaso(1); setTipoSeleccionado(null); setArchivoPdf(null);
    setTipoRegistrado(null); setTurnstileToken('');
    setForm({ dni: '', nombres: '', apellido_pat: '', apellido_mat: '', email: '', telefono: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── PASO 1 ──────────────────────────────────────────── */}
      {paso === 1 && (
        tipos.length === 0
          ? <div className="flex items-center justify-center min-h-96">
              <Spinner text="Cargando trámites..." />
            </div>
          : <SeleccionTramite
              tipos={tipos}
              seleccionado={tipoSeleccionado}
              paso={paso}
              onSeleccionar={setTipoSeleccionado}
              onContinuar={() => {
                if (!tipoSeleccionado) { toast.warning({ titulo: 'Selecciona un tipo de trámite.' }); return; }
                setPaso(2);
              }}
            />
      )}

      {/* ── PASO 2 ──────────────────────────────────────────── */}
      {paso === 2 && tipoSeleccionado && (
        <Paso2Datos
          tipoSeleccionado={tipoSeleccionado}
          form={form}
          setF={setF}
          buscandoDni={buscandoDni}
          buscarDni={buscarDni}
          archivoPdf={archivoPdf}
          setArchivoPdf={setArchivoPdf}
          turnstileToken={turnstileToken}
          setTurnstileToken={setTurnstileToken}
          loading={loading}
          onAtras={() => { setPaso(1); setTurnstileToken(''); }}
          onRegistrar={handleRegistrar}
          onArchivoChange={handleArchivoChange}
          onTurnstileExpire={() => {
            setTurnstileToken('');
            toast.warning({ titulo: 'La verificación expiró. Complétala nuevamente.' });
          }}
          onTurnstileError={() => {
            setTurnstileToken('');
            toast.error({ titulo: 'Error en la verificación de seguridad.' });
          }}
        />
      )}

      {/* ── PASO 3 ──────────────────────────────────────────── */}
      {paso === 3 && tipoRegistrado && (
        <Paso3Pago
          codigoGenerado={codigoGenerado}
          tipoRegistrado={tipoRegistrado}
          onResetForm={resetForm}
        />
      )}

    </div>
  );
}