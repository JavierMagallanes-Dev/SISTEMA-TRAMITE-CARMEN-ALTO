// src/pages/PortalPage.tsx
// Portal de Trámites — 4 pasos internos: Selección → Datos → Requisitos → Pago.
import { useEffect, useState } from 'react';
import { portalService }        from '../services/portal.service';
import Spinner                  from '../components/ui/Spinner';
import SeleccionTramite         from '../components/shared/SeleccionTramite';
import Paso2Datos               from '../components/shared/Paso2Datos';
import Paso2Requisitos          from '../components/shared/Paso2Requisitos';
import Paso3Pago                from '../components/shared/Paso3Pago';
import { toast }                from '../utils/toast';

interface TipoTramite {
  id: number; nombre: string; descripcion: string | null;
  costo_soles: number; plazo_dias: number;
}

interface Requisito {
  id: number; nombre: string; descripcion: string | null;
  obligatorio: boolean; orden: number;
}

const FORM_INICIAL = {
  tipoDocumento:     'DNI',
  dni:               '',
  nombres:           '',
  apellido_pat:      '',
  apellido_mat:      '',
  email:             '',
  telefono:          '',
  pais_emision:      '',
  fecha_vencimiento: '',
  fecha_nacimiento:  '',
};

type PasoInterno = 1 | 2 | 3 | 4;

export default function PortalPage() {
  const [paso,             setPaso]             = useState<PasoInterno>(1);
  const [tipos,            setTipos]            = useState<TipoTramite[]>([]);
  const [requisitos,       setRequisitos]       = useState<Requisito[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [codigoGenerado,   setCodigoGenerado]   = useState('');
  const [expedienteId,     setExpedienteId]     = useState<number>(0);
  const [tipoRegistrado,   setTipoRegistrado]   = useState<TipoTramite | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoTramite | null>(null);
  const [turnstileToken,   setTurnstileToken]   = useState('');
  const [buscandoDni,      setBuscandoDni]      = useState(false);
  const [form,             setForm]             = useState(FORM_INICIAL);

  useEffect(() => {
    portalService.tiposTramite().then(setTipos).catch(() => {});
  }, []);

  const buscarDni = async () => {
    if (form.tipoDocumento !== 'DNI' || form.dni.length !== 8) return;
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
        tipoDocumento:           form.tipoDocumento,
        dni:                     form.dni,
        nombres:                 form.nombres,
        apellido_pat:            form.apellido_pat,
        apellido_mat:            form.apellido_mat,
        email:                   form.email,
        telefono:                form.telefono,
        pais_emision:            form.pais_emision,
        fecha_vencimiento:       form.fecha_vencimiento,
        fecha_nacimiento:        form.fecha_nacimiento,
        tipoTramiteId:           String(tipoSeleccionado.id),
        'cf-turnstile-response': turnstileToken,
      });

      setCodigoGenerado(res.expediente.codigo);
      setExpedienteId(res.expediente.id);
      setTipoRegistrado(tipoSeleccionado);

      // Cargar requisitos del trámite
      const reqs = await portalService.requisitos(tipoSeleccionado.id);
      setRequisitos(reqs);

      // Si hay requisitos vamos al paso de documentos, si no directo al pago
      setPaso(reqs.length > 0 ? 3 : 4);
    } catch (err: any) {
      toast.error({ titulo: err?.response?.data?.error ?? 'Error al registrar el trámite.' });
      setTurnstileToken('');
    } finally { setLoading(false); }
  };

  const handleSubirDocumento = async (requisitoId: number, archivo: File) => {
    await portalService.subirDocumentoRequisito(expedienteId, requisitoId, archivo);
  };

  const setF = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const resetForm = () => {
    setPaso(1); setTipoSeleccionado(null);
    setTipoRegistrado(null); setTurnstileToken('');
    setRequisitos([]); setExpedienteId(0);
    setForm(FORM_INICIAL);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* PASO 1 — Selección de trámite */}
      {paso === 1 && (
        tipos.length === 0
          ? <div className="flex items-center justify-center min-h-96"><Spinner text="Cargando trámites..." /></div>
          : <SeleccionTramite
              tipos={tipos}
              seleccionado={tipoSeleccionado}
              paso={1}
              onSeleccionar={setTipoSeleccionado}
              onContinuar={() => {
                if (!tipoSeleccionado) { toast.warning({ titulo: 'Selecciona un tipo de trámite.' }); return; }
                setPaso(2);
              }}
            />
      )}

      {/* PASO 2 — Datos personales */}
      {paso === 2 && tipoSeleccionado && (
        <Paso2Datos
          tipoSeleccionado={tipoSeleccionado}
          form={form}
          setF={setF}
          buscandoDni={buscandoDni}
          buscarDni={buscarDni}
          turnstileToken={turnstileToken}
          setTurnstileToken={setTurnstileToken}
          loading={loading}
          onAtras={() => { setPaso(1); setTurnstileToken(''); }}
          onRegistrar={handleRegistrar}
          onTurnstileExpire={() => { setTurnstileToken(''); toast.warning({ titulo: 'La verificación expiró. Complétala nuevamente.' }); }}
          onTurnstileError={() => { setTurnstileToken(''); toast.error({ titulo: 'Error en la verificación de seguridad.' }); }}
        />
      )}

      {/* PASO 3 — Adjuntar documentos por requisito */}
      {paso === 3 && expedienteId > 0 && (
        <Paso2Requisitos
          requisitos={requisitos}
          expedienteId={expedienteId}
          codigoExp={codigoGenerado}
          onSubirDoc={handleSubirDocumento}
          onContinuar={() => setPaso(4)}
        />
      )}

      {/* PASO 4 — Pago */}
      {paso === 4 && tipoRegistrado && (
        <Paso3Pago
          codigoGenerado={codigoGenerado}
          tipoRegistrado={tipoRegistrado}
          onResetForm={resetForm}
        />
      )}
    </div>
  );
}