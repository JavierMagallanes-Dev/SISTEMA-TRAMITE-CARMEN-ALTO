// src/pages/PortalPage.tsx
// Portal de Trámites — 3 pasos: Selección → Datos+Requisitos → Pago.

import { useEffect, useState } from 'react';
import { portalService }  from '../services/portal.service';
import Spinner            from '../components/ui/Spinner';
import SeleccionTramite   from '../components/shared/SeleccionTramite';
import Paso2Datos         from '../components/shared/Paso2Datos';
import type { EstadoReq } from '../components/shared/Paso2Datos';
import Paso3Pago          from '../components/shared/Paso3Pago';
import { toast }          from '../utils/toast';

interface TipoTramite {
  id: number; nombre: string; descripcion: string | null;
  costo_soles: number; plazo_dias: number;
}

interface Requisito {
  id: number; nombre: string; descripcion: string | null;
  obligatorio: boolean; orden: number;
}

const FORM_INICIAL = {
  tipoDocumento: 'DNI', dni: '', nombres: '',
  apellido_pat: '', apellido_mat: '', email: '',
  telefono: '', pais_emision: '', fecha_vencimiento: '', fecha_nacimiento: '',
};

type PasoInterno = 1 | 2 | 3;

export default function PortalPage() {
  const [paso,             setPaso]             = useState<PasoInterno>(1);
  const [tipos,            setTipos]            = useState<TipoTramite[]>([]);
  const [requisitos,       setRequisitos]       = useState<Requisito[]>([]);
  const [estadosReq,       setEstadosReq]       = useState<Record<number, EstadoReq>>({});
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

  // Cargar requisitos cuando se selecciona un trámite
  const handleSeleccionarTramite = async (tipo: TipoTramite) => {
    setTipoSeleccionado(tipo);
    // Precargar requisitos en paralelo
    try {
      const reqs = await portalService.requisitos(tipo.id);
      setRequisitos(reqs);
      // Inicializar estados vacíos
      const estados: Record<number, EstadoReq> = {};
      reqs.forEach((r: Requisito) => {
        estados[r.id] = { archivo: null, subido: false, subiendo: false, error: '' };
      });
      setEstadosReq(estados);
    } catch {
      setRequisitos([]);
      setEstadosReq({});
    }
  };

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

  // Manejar archivo seleccionado para un requisito
  const handleArchivoReq = (reqId: number, archivo: File | null) => {
    setEstadosReq(prev => ({
      ...prev,
      [reqId]: { ...prev[reqId], archivo, error: '' },
    }));
  };

  // Subir documento de un requisito (antes de registrar el expediente)
  // Si el expediente aún no existe, guardamos el archivo para subirlo después
  const handleSubirReq = async (reqId: number) => {
    const estado = estadosReq[reqId];
    if (!estado?.archivo) return;

    // Si ya tenemos expedienteId (registro ya hecho), subir directo
    if (expedienteId > 0) {
      setEstadosReq(prev => ({ ...prev, [reqId]: { ...prev[reqId], subiendo: true, error: '' } }));
      try {
        await portalService.subirDocumentoRequisito(expedienteId, reqId, estado.archivo!);
        setEstadosReq(prev => ({ ...prev, [reqId]: { ...prev[reqId], subiendo: false, subido: true } }));
      } catch {
        setEstadosReq(prev => ({ ...prev, [reqId]: { ...prev[reqId], subiendo: false, error: 'Error al subir. Intenta de nuevo.' } }));
      }
      return;
    }

    // Si no hay expediente aún, marcar como "listo para subir" (se subirá después del registro)
    setEstadosReq(prev => ({ ...prev, [reqId]: { ...prev[reqId], subido: true, error: '' } }));
  };

  const handleRegistrar = async () => {
    if (!form.dni || !form.nombres || !form.apellido_pat || !form.email || !tipoSeleccionado) {
      toast.warning({ titulo: 'Completa todos los campos obligatorios.' }); return;
    }
    if (!turnstileToken) {
      toast.warning({ titulo: 'Completa la verificación de seguridad.' }); return;
    }

    // Verificar requisitos obligatorios
    const reqOblig = requisitos.filter(r => r.obligatorio);
    const faltantes = reqOblig.filter(r => !estadosReq[r.id]?.subido && !estadosReq[r.id]?.archivo);
    if (faltantes.length > 0) {
      toast.warning({ titulo: 'Faltan documentos obligatorios', descripcion: `Adjunta: ${faltantes.map(r => r.nombre).join(', ')}` });
      return;
    }

    setLoading(true);
    try {
      // 1. Registrar el expediente
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

      const expId = res.expediente.id;
      setCodigoGenerado(res.expediente.codigo);
      setExpedienteId(expId);
      setTipoRegistrado(tipoSeleccionado);

      // 2. Subir todos los archivos adjuntados
      const archivosParaSubir = requisitos.filter(r => estadosReq[r.id]?.archivo);
      for (const req of archivosParaSubir) {
        const archivo = estadosReq[req.id].archivo;
        if (!archivo) continue;
        try {
          await portalService.subirDocumentoRequisito(expId, req.id, archivo);
          setEstadosReq(prev => ({ ...prev, [req.id]: { ...prev[req.id], subido: true, subiendo: false } }));
        } catch {
          console.warn(`No se pudo subir documento del requisito ${req.id}`);
        }
      }

      // 3. Ir al pago
      setPaso(3);
    } catch (err: any) {
      toast.error({ titulo: err?.response?.data?.error ?? 'Error al registrar el trámite.' });
      setTurnstileToken('');
    } finally { setLoading(false); }
  };

  const setF = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const resetForm = () => {
    setPaso(1); setTipoSeleccionado(null);
    setTipoRegistrado(null); setTurnstileToken('');
    setRequisitos([]); setEstadosReq({});
    setExpedienteId(0); setForm(FORM_INICIAL);
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
              onSeleccionar={handleSeleccionarTramite}
              onContinuar={() => {
                if (!tipoSeleccionado) { toast.warning({ titulo: 'Selecciona un tipo de trámite.' }); return; }
                setPaso(2);
              }}
            />
      )}

      {/* PASO 2 — Datos + Requisitos + Turnstile */}
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
          onTurnstileExpire={() => { setTurnstileToken(''); toast.warning({ titulo: 'La verificación expiró.' }); }}
          onTurnstileError={() => { setTurnstileToken(''); toast.error({ titulo: 'Error en la verificación.' }); }}
          requisitos={requisitos}
          estadosReq={estadosReq}
          onArchivoReq={handleArchivoReq}
          onSubirReq={handleSubirReq}
        />
      )}

      {/* PASO 3 — Pago */}
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