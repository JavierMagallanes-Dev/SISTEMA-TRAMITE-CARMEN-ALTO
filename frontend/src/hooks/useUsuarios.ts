// src/hooks/useUsuarios.ts
// Hook que centraliza toda la lógica de administración de usuarios, áreas y trámites.

import { useEffect, useState } from 'react';
import api                from '../services/api';
import { usuariosService }from '../services/usuarios.service';
import { ROL_LABEL }      from '../utils/constants';
import type { Area }      from '../types';

// ── Tipos ────────────────────────────────────────────────────
export interface UsuarioRow {
  id:              number;
  dni:             string;
  nombre_completo: string;
  email:           string;
  activo:          boolean;
  created_at:      string;
  rol:             { nombre: string };
  area:            { id: number; nombre: string; sigla: string } | null;
}

export interface Requisito {
  id: number; nombre: string; descripcion: string | null;
  obligatorio: boolean; orden: number;
}

export interface TipoTramiteRow {
  id: number; nombre: string; descripcion: string | null;
  plazo_dias: number; costo_soles: number; activo: boolean;
  requisitos: Requisito[];
  _count: { expedientes: number };
}

export interface FormUsuario {
  dni: string; nombre_completo: string; email: string;
  password: string; rolNombre: string; areaId: string; pin_derivacion: string;
}

export interface FormArea {
  nombre: string; sigla: string;
}

export interface FormTramite {
  nombre: string; descripcion: string; plazo_dias: string; costo_soles: string;
}

export interface FormRequisito {
  nombre: string; descripcion: string; obligatorio: boolean;
}

const FORM_USUARIO_INICIAL: FormUsuario = {
  dni: '', nombre_completo: '', email: '',
  password: '', rolNombre: '', areaId: '', pin_derivacion: '',
};

export const ROLES_DISPONIBLES = ['ADMIN', 'MESA_DE_PARTES', 'CAJERO', 'TECNICO', 'JEFE_AREA'];

// ── Hook ─────────────────────────────────────────────────────
export function useUsuarios() {
  const [tab,      setTab]      = useState<'usuarios' | 'areas' | 'tramites'>('usuarios');
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [areas,    setAreas]    = useState<Area[]>([]);
  const [tramites, setTramites] = useState<TipoTramiteRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [filtro,   setFiltro]   = useState<'todos' | 'activos' | 'inactivos'>('activos');

  // Modal usuario
  const [modalForm, setModalForm] = useState(false);
  const [editando,  setEditando]  = useState<UsuarioRow | null>(null);
  const [form,      setForm]      = useState<FormUsuario>(FORM_USUARIO_INICIAL);

  // Modal reset password
  const [modalReset, setModalReset] = useState(false);
  const [userReset,  setUserReset]  = useState<UsuarioRow | null>(null);
  const [nuevaPass,  setNuevaPass]  = useState('');

  // Modal área
  const [modalArea,    setModalArea]    = useState(false);
  const [editandoArea, setEditandoArea] = useState<Area | null>(null);
  const [formArea,     setFormArea]     = useState<FormArea>({ nombre: '', sigla: '' });

  // Modal trámite
  const [modalTramite,    setModalTramite]    = useState(false);
  const [editandoTramite, setEditandoTramite] = useState<TipoTramiteRow | null>(null);
  const [formTramite,     setFormTramite]     = useState<FormTramite>({ nombre: '', descripcion: '', plazo_dias: '', costo_soles: '' });
  const [expandedTramite, setExpandedTramite] = useState<number | null>(null);

  // Modal requisito
  const [modalReq,    setModalReq]    = useState(false);
  const [tramiteReq,  setTramiteReq]  = useState<TipoTramiteRow | null>(null);
  const [editandoReq, setEditandoReq] = useState<Requisito | null>(null);
  const [formReq,     setFormReq]     = useState<FormRequisito>({ nombre: '', descripcion: '', obligatorio: true });

  // Confirms
  const [confirmDesactivar, setConfirmDesactivar] = useState<UsuarioRow | null>(null);
  const [confirmActivar,    setConfirmActivar]    = useState<UsuarioRow | null>(null);
  const [confirmElimArea,   setConfirmElimArea]   = useState<Area | null>(null);
  const [confirmElimReq,    setConfirmElimReq]    = useState<Requisito | null>(null);

  // ── Carga ──────────────────────────────────────────────────
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const activo = filtro === 'todos' ? undefined : filtro === 'activos';
      const [users, ar, tram] = await Promise.all([
        usuariosService.listar(activo),
        usuariosService.areas(),
        api.get('/tramites').then(r => r.data),
      ]);
      setUsuarios(users); setAreas(ar); setTramites(tram);
    } catch { setError('Error al cargar los datos.'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargarDatos(); }, [filtro]);

  // ── Helpers ────────────────────────────────────────────────
  const setF  = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));
  const setFA = (field: string, value: string) => setFormArea(prev => ({ ...prev, [field]: value }));
  const setFT = (field: string, value: string) => setFormTramite(prev => ({ ...prev, [field]: value }));

  // ── Usuarios ───────────────────────────────────────────────
  const abrirCrear = () => {
    setEditando(null);
    setForm(FORM_USUARIO_INICIAL);
    setModalForm(true);
  };

  const abrirEditar = (u: UsuarioRow) => {
    setEditando(u);
    setForm({ dni: u.dni, nombre_completo: u.nombre_completo, email: u.email, password: '', rolNombre: u.rol.nombre, areaId: u.area?.id ? String(u.area.id) : '', pin_derivacion: '' });
    setModalForm(true);
  };

  const handleGuardar = async () => {
    if (!form.nombre_completo || !form.email || !form.rolNombre) { setError('Completa nombre, email y rol.'); return; }
    if (!editando && (!form.dni || !form.password)) { setError('DNI y contraseña son obligatorios al crear.'); return; }
    if (form.pin_derivacion && !/^\d{4,6}$/.test(form.pin_derivacion)) { setError('El PIN debe tener entre 4 y 6 dígitos.'); return; }
    setLoading(true);
    try {
      if (editando) {
        await usuariosService.editar(editando.id, { nombre_completo: form.nombre_completo, email: form.email, rolNombre: form.rolNombre, areaId: form.areaId || null, pin_derivacion: form.pin_derivacion || undefined });
        setSuccess('Usuario actualizado correctamente.');
      } else {
        await usuariosService.crear({ dni: form.dni, nombre_completo: form.nombre_completo, email: form.email, password: form.password, rolNombre: form.rolNombre, areaId: form.areaId || null, pin_derivacion: form.pin_derivacion || undefined });
        setSuccess('Usuario creado correctamente.');
      }
      setModalForm(false); cargarDatos();
    } catch (err: any) { setError(err?.response?.data?.error ?? 'Error al guardar.'); }
    finally { setLoading(false); }
  };

  const handleDesactivar = async (u: UsuarioRow) => {
    setLoading(true);
    try { await usuariosService.desactivar(u.id); setSuccess(`${u.nombre_completo} desactivado.`); setConfirmDesactivar(null); cargarDatos(); }
    catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); }
    finally { setLoading(false); }
  };

  const handleActivar = async (u: UsuarioRow) => {
    setLoading(true);
    try { await usuariosService.activar(u.id); setSuccess(`${u.nombre_completo} activado.`); setConfirmActivar(null); cargarDatos(); }
    catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!userReset || !nuevaPass) return;
    setLoading(true);
    try { await usuariosService.resetPassword(userReset.id, nuevaPass); setSuccess(`Contraseña de ${userReset.nombre_completo} actualizada.`); setModalReset(false); setNuevaPass(''); }
    catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); }
    finally { setLoading(false); }
  };

  // ── Áreas ──────────────────────────────────────────────────
  const abrirCrearArea  = () => { setEditandoArea(null); setFormArea({ nombre: '', sigla: '' }); setModalArea(true); };
  const abrirEditarArea = (a: Area) => { setEditandoArea(a); setFormArea({ nombre: a.nombre, sigla: a.sigla }); setModalArea(true); };

  const handleGuardarArea = async () => {
    if (!formArea.nombre.trim() || !formArea.sigla.trim()) { setError('Nombre y sigla son obligatorios.'); return; }
    setLoading(true);
    try {
      if (editandoArea) { await api.put(`/usuarios/areas/${editandoArea.id}`, formArea); setSuccess('Área actualizada.'); }
      else              { await api.post('/usuarios/areas', formArea);                   setSuccess('Área creada.'); }
      setModalArea(false); cargarDatos();
    } catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); }
    finally { setLoading(false); }
  };

  const handleEliminarArea = async (a: Area) => {
    setLoading(true);
    try { await api.delete(`/usuarios/areas/${a.id}`); setSuccess(`Área "${a.nombre}" eliminada.`); setConfirmElimArea(null); cargarDatos(); }
    catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); }
    finally { setLoading(false); }
  };

  // ── Trámites ───────────────────────────────────────────────
  const abrirCrearTramite  = () => { setEditandoTramite(null); setFormTramite({ nombre: '', descripcion: '', plazo_dias: '', costo_soles: '' }); setModalTramite(true); };
  const abrirEditarTramite = (t: TipoTramiteRow) => { setEditandoTramite(t); setFormTramite({ nombre: t.nombre, descripcion: t.descripcion ?? '', plazo_dias: String(t.plazo_dias), costo_soles: String(t.costo_soles) }); setModalTramite(true); };

  const handleGuardarTramite = async () => {
    if (!formTramite.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!formTramite.plazo_dias || !formTramite.costo_soles) { setError('Plazo y costo son obligatorios.'); return; }
    setLoading(true);
    try {
      if (editandoTramite) { await api.put(`/tramites/${editandoTramite.id}`, formTramite); setSuccess('Trámite actualizado.'); }
      else                 { await api.post('/tramites', formTramite);                       setSuccess('Trámite creado.'); }
      setModalTramite(false); cargarDatos();
    } catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); }
    finally { setLoading(false); }
  };

  const handleToggleTramite = async (t: TipoTramiteRow) => {
    setLoading(true);
    try { await api.patch(`/tramites/${t.id}/toggle`); setSuccess(`Trámite ${t.activo ? 'desactivado' : 'activado'}.`); cargarDatos(); }
    catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); }
    finally { setLoading(false); }
  };

  // ── Requisitos ─────────────────────────────────────────────
  const abrirCrearReq  = (t: TipoTramiteRow) => { setTramiteReq(t); setEditandoReq(null); setFormReq({ nombre: '', descripcion: '', obligatorio: true }); setModalReq(true); };
  const abrirEditarReq = (t: TipoTramiteRow, r: Requisito) => { setTramiteReq(t); setEditandoReq(r); setFormReq({ nombre: r.nombre, descripcion: r.descripcion ?? '', obligatorio: r.obligatorio }); setModalReq(true); };

  const handleGuardarReq = async () => {
    if (!formReq.nombre.trim()) { setError('El nombre del requisito es obligatorio.'); return; }
    setLoading(true);
    try {
      if (editandoReq) { await api.put(`/tramites/requisitos/${editandoReq.id}`, formReq); setSuccess('Requisito actualizado.'); }
      else             { await api.post(`/tramites/${tramiteReq!.id}/requisitos`, formReq); setSuccess('Requisito creado.'); }
      setModalReq(false); cargarDatos();
    } catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); }
    finally { setLoading(false); }
  };

  const handleEliminarReq = async (r: Requisito) => {
    setLoading(true);
    try { await api.delete(`/tramites/requisitos/${r.id}`); setSuccess('Requisito eliminado.'); setConfirmElimReq(null); cargarDatos(); }
    catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); }
    finally { setLoading(false); }
  };

  return {
    // Estado general
    tab, setTab, cargando, loading, error, setError, success, setSuccess,
    filtro, setFiltro, cargarDatos,
    // Usuarios
    usuarios, areas, tramites,
    modalForm, setModalForm, editando, form, setF,
    abrirCrear, abrirEditar, handleGuardar,
    modalReset, setModalReset, userReset, setUserReset, nuevaPass, setNuevaPass,
    handleResetPassword,
    confirmDesactivar, setConfirmDesactivar,
    confirmActivar,    setConfirmActivar,
    handleDesactivar, handleActivar,
    // Áreas
    modalArea, setModalArea, editandoArea, formArea, setFA,
    abrirCrearArea, abrirEditarArea, handleGuardarArea,
    confirmElimArea, setConfirmElimArea, handleEliminarArea,
    // Trámites
    modalTramite, setModalTramite, editandoTramite, formTramite, setFT,
    expandedTramite, setExpandedTramite,
    abrirCrearTramite, abrirEditarTramite, handleGuardarTramite, handleToggleTramite,
    // Requisitos
    modalReq, setModalReq, tramiteReq, editandoReq, formReq, setFormReq,
    abrirCrearReq, abrirEditarReq, handleGuardarReq,
    confirmElimReq, setConfirmElimReq, handleEliminarReq,
    // Constantes
    ROLES_DISPONIBLES, ROL_LABEL,
  };
}