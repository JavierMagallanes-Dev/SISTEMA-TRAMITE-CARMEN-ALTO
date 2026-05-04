// src/pages/UsuariosPage.tsx

import { useEffect, useState } from 'react';
import api                     from '../services/api';
import { usuariosService }     from '../services/usuarios.service';
import { Card }                from '../components/ui/Card';
import Button                  from '../components/ui/Button';
import Input                   from '../components/ui/Input';
import Modal                   from '../components/ui/Modal';
import Alert                   from '../components/ui/Alert';
import Spinner                 from '../components/ui/Spinner';
import Table                   from '../components/ui/Table';
import ConfirmModal            from '../components/shared/ConfirmModal';
import { formatFecha }         from '../utils/formato';
import { ROL_LABEL }           from '../utils/constants';
import type { Area }           from '../types';
import {
  UserPlus, RefreshCw, UserCheck, UserX, KeyRound, Pencil,
  Building2, Plus, Trash2, FileText, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, ClipboardList,
} from 'lucide-react';

interface UsuarioRow {
  id: number; dni: string; nombre_completo: string; email: string;
  activo: boolean; created_at: string;
  rol:  { nombre: string };
  area: { id: number; nombre: string; sigla: string } | null;
}

interface Requisito {
  id: number; nombre: string; descripcion: string | null;
  obligatorio: boolean; orden: number;
}

interface TipoTramiteRow {
  id: number; nombre: string; descripcion: string | null;
  plazo_dias: number; costo_soles: number; activo: boolean;
  requisitos: Requisito[];
  _count: { expedientes: number };
}

const ROLES_DISPONIBLES = ['ADMIN', 'MESA_DE_PARTES', 'CAJERO', 'TECNICO', 'JEFE_AREA'];

export default function UsuariosPage() {
  const [tab,      setTab]      = useState<'usuarios' | 'areas' | 'tramites'>('usuarios');
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [areas,    setAreas]    = useState<Area[]>([]);
  const [tramites, setTramites] = useState<TipoTramiteRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [filtro,   setFiltro]   = useState<'todos' | 'activos' | 'inactivos'>('activos');

  // Modal usuario
  const [modalForm, setModalForm] = useState(false);
  const [editando,  setEditando]  = useState<UsuarioRow | null>(null);
  const [form, setForm] = useState({ dni: '', nombre_completo: '', email: '', password: '', rolNombre: '', areaId: '', pin_derivacion: '' });

  // Modal reset password
  const [modalReset, setModalReset] = useState(false);
  const [userReset,  setUserReset]  = useState<UsuarioRow | null>(null);
  const [nuevaPass,  setNuevaPass]  = useState('');

  // Modal área
  const [modalArea,    setModalArea]    = useState(false);
  const [editandoArea, setEditandoArea] = useState<Area | null>(null);
  const [formArea, setFormArea] = useState({ nombre: '', sigla: '' });

  // Modal trámite
  const [modalTramite,    setModalTramite]    = useState(false);
  const [editandoTramite, setEditandoTramite] = useState<TipoTramiteRow | null>(null);
  const [formTramite, setFormTramite] = useState({ nombre: '', descripcion: '', plazo_dias: '', costo_soles: '' });
  const [expandedTramite, setExpandedTramite] = useState<number | null>(null);

  // Modal requisito
  const [modalReq,    setModalReq]    = useState(false);
  const [tramiteReq,  setTramiteReq]  = useState<TipoTramiteRow | null>(null);
  const [editandoReq, setEditandoReq] = useState<Requisito | null>(null);
  const [formReq, setFormReq] = useState({ nombre: '', descripcion: '', obligatorio: true });

  // Confirms
  const [confirmDesactivar, setConfirmDesactivar] = useState<UsuarioRow | null>(null);
  const [confirmActivar,    setConfirmActivar]    = useState<UsuarioRow | null>(null);
  const [confirmElimArea,   setConfirmElimArea]   = useState<Area | null>(null);
  const [confirmElimReq,    setConfirmElimReq]    = useState<Requisito | null>(null);

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

  // ── Usuarios ─────────────────────────────────────────────
  const abrirCrear = () => { setEditando(null); setForm({ dni: '', nombre_completo: '', email: '', password: '', rolNombre: '', areaId: '', pin_derivacion: '' }); setModalForm(true); };
  const abrirEditar = (u: UsuarioRow) => { setEditando(u); setForm({ dni: u.dni, nombre_completo: u.nombre_completo, email: u.email, password: '', rolNombre: u.rol.nombre, areaId: u.area?.id ? String(u.area.id) : '', pin_derivacion: '' }); setModalForm(true); };

  const handleGuardar = async () => {
    if (!form.nombre_completo || !form.email || !form.rolNombre) { setError('Completa nombre, email y rol.'); return; }
    if (!editando && (!form.dni || !form.password)) { setError('DNI y contraseña son obligatorios.'); return; }
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

  const handleDesactivar = async (u: UsuarioRow) => { setLoading(true); try { await usuariosService.desactivar(u.id); setSuccess(`${u.nombre_completo} desactivado.`); setConfirmDesactivar(null); cargarDatos(); } catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); } finally { setLoading(false); } };
  const handleActivar    = async (u: UsuarioRow) => { setLoading(true); try { await usuariosService.activar(u.id);    setSuccess(`${u.nombre_completo} activado.`);    setConfirmActivar(null);    cargarDatos(); } catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); } finally { setLoading(false); } };

  const handleResetPassword = async () => {
    if (!userReset || !nuevaPass) return;
    setLoading(true);
    try { await usuariosService.resetPassword(userReset.id, nuevaPass); setSuccess(`Contraseña de ${userReset.nombre_completo} actualizada.`); setModalReset(false); setNuevaPass(''); }
    catch (err: any) { setError(err?.response?.data?.error ?? 'Error.'); }
    finally { setLoading(false); }
  };

  // ── Áreas ─────────────────────────────────────────────────
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

  // ── Trámites ──────────────────────────────────────────────
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

  // ── Requisitos ────────────────────────────────────────────
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

  const setF  = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));
  const setFA = (f: string, v: string) => setFormArea(prev => ({ ...prev, [f]: v }));
  const setFT = (f: string, v: string) => setFormTramite(prev => ({ ...prev, [f]: v }));

  if (cargando) return <Spinner text="Cargando..." />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Administración</h1>
          <p className="text-sm text-gray-500 mt-0.5">Usuarios, áreas y trámites del sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={cargarDatos}>Actualizar</Button>
          {tab === 'usuarios' && <Button icon={<UserPlus  size={14} />} onClick={abrirCrear}>Nuevo usuario</Button>}
          {tab === 'areas'    && <Button icon={<Plus      size={14} />} onClick={abrirCrearArea}>Nueva área</Button>}
          {tab === 'tramites' && <Button icon={<Plus      size={14} />} onClick={abrirCrearTramite}>Nuevo trámite</Button>}
        </div>
      </div>

      {error   && <Alert type="error"   message={error}   onClose={() => setError('')}   />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'usuarios', label: 'Usuarios',  icon: <UserPlus      size={13} /> },
          { key: 'areas',    label: 'Áreas',      icon: <Building2     size={13} /> },
          { key: 'tramites', label: 'Trámites',   icon: <ClipboardList size={13} /> },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Usuarios ── */}
      {tab === 'usuarios' && (
        <>
          <div className="flex gap-1 border-b border-gray-100">
            {(['activos', 'inactivos', 'todos'] as const).map((f) => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                  filtro === f ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>{f}</button>
            ))}
          </div>
          <Card padding={false}>
            <Table keyField="id" data={usuarios} emptyText="No hay usuarios"
              columns={[
                { key: 'nombre_completo', header: 'Nombre', render: (r) => <div><p className="text-sm font-medium text-gray-800">{r.nombre_completo}</p><p className="text-xs text-gray-400">{r.dni} · {r.email}</p></div> },
                { key: 'rol',    header: 'Rol',    render: (r) => <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{ROL_LABEL[r.rol.nombre] ?? r.rol.nombre}</span> },
                { key: 'area',   header: 'Área',   render: (r) => r.area ? <span className="text-xs text-gray-600">{r.area.nombre}</span> : <span className="text-xs text-gray-300">—</span> },
                { key: 'activo', header: 'Estado', render: (r) => <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{r.activo ? 'Activo' : 'Inactivo'}</span> },
                { key: 'created_at', header: 'Creado', render: (r) => <span className="text-xs text-gray-400">{formatFecha(r.created_at)}</span> },
                { key: 'acciones', header: '', render: (r) => (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" icon={<Pencil   size={12} />} onClick={() => abrirEditar(r)}>Editar</Button>
                    <Button size="sm" variant="ghost" icon={<KeyRound size={12} />} onClick={() => { setUserReset(r); setNuevaPass(''); setModalReset(true); }}>Password</Button>
                    {r.activo
                      ? <Button size="sm" variant="ghost" icon={<UserX     size={12} />} onClick={() => setConfirmDesactivar(r)}>Desactivar</Button>
                      : <Button size="sm" variant="ghost" icon={<UserCheck size={12} />} onClick={() => setConfirmActivar(r)}>Activar</Button>
                    }
                  </div>
                )},
              ]}
            />
          </Card>
        </>
      )}

      {/* ── Tab Áreas ── */}
      {tab === 'areas' && (
        <Card padding={false}>
          <Table keyField="id" data={areas} emptyText="No hay áreas registradas"
            columns={[
              { key: 'nombre', header: 'Nombre', render: (a) => <p className="text-sm font-medium text-gray-800">{a.nombre}</p> },
              { key: 'sigla',  header: 'Sigla',  render: (a) => <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">{a.sigla}</span> },
              { key: 'usuarios', header: 'Usuarios', render: (a) => <span className="text-xs text-gray-500">{usuarios.filter(u => u.area?.id === a.id).length} usuario(s)</span> },
              { key: 'acciones', header: '', render: (a) => (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => abrirEditarArea(a)}>Editar</Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={() => setConfirmElimArea(a)} className="text-red-500 hover:text-red-700">Eliminar</Button>
                </div>
              )},
            ]}
          />
        </Card>
      )}

      {/* ── Tab Trámites ── */}
      {tab === 'tramites' && (
        <div className="space-y-3">
          {tramites.length === 0 ? (
            <Card><div className="text-center py-8 text-gray-400"><FileText size={32} className="mx-auto mb-2 opacity-40" /><p className="text-sm">No hay trámites registrados.</p></div></Card>
          ) : tramites.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{t.nombre}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {t.descripcion && <p className="text-xs text-gray-400 mb-1">{t.descripcion}</p>}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>⏱ {t.plazo_dias} días</span>
                    <span>💰 S/ {Number(t.costo_soles).toFixed(2)}</span>
                    <span>📄 {t._count.expedientes} expedientes</span>
                    <span>📋 {t.requisitos.length} requisitos</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap">
                  <Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => abrirEditarTramite(t)}>Editar</Button>
                  <Button size="sm" variant="ghost"
                    icon={t.activo ? <ToggleRight size={12} className="text-green-600" /> : <ToggleLeft size={12} className="text-gray-400" />}
                    onClick={() => handleToggleTramite(t)}>
                    {t.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button size="sm" variant="ghost"
                    icon={expandedTramite === t.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    onClick={() => setExpandedTramite(expandedTramite === t.id ? null : t.id)}>
                    Requisitos
                  </Button>
                </div>
              </div>

              {/* Requisitos expandibles */}
              {expandedTramite === t.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Requisitos del trámite</p>
                    <Button size="sm" icon={<Plus size={12} />} onClick={() => abrirCrearReq(t)}>Agregar requisito</Button>
                  </div>
                  {t.requisitos.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg">No hay requisitos. El ciudadano no tendrá que adjuntar documentos.</p>
                  ) : (
                    <div className="space-y-2">
                      {t.requisitos.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-700">{r.nombre}</p>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.obligatorio ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                {r.obligatorio ? 'Obligatorio' : 'Opcional'}
                              </span>
                            </div>
                            {r.descripcion && <p className="text-xs text-gray-400 mt-0.5">{r.descripcion}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="ghost" icon={<Pencil size={11} />} onClick={() => abrirEditarReq(t, r)}>Editar</Button>
                            <Button size="sm" variant="ghost" icon={<Trash2 size={11} />} onClick={() => setConfirmElimReq(r)} className="text-red-500">Eliminar</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal usuario */}
      <Modal open={modalForm} onClose={() => setModalForm(false)} title={editando ? 'Editar usuario' : 'Nuevo usuario'} size="md"
        footer={<><Button variant="secondary" onClick={() => setModalForm(false)}>Cancelar</Button><Button variant="primary" loading={loading} onClick={handleGuardar}>{editando ? 'Guardar cambios' : 'Crear usuario'}</Button></>}>
        <div className="space-y-3">
          {!editando && <Input label="DNI" placeholder="12345678" value={form.dni} onChange={(e) => setF('dni', e.target.value)} maxLength={8} required />}
          <Input label="Nombre completo" value={form.nombre_completo} onChange={(e) => setF('nombre_completo', e.target.value)} required />
          <Input label="Email institucional" type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} required />
          {!editando && <Input label="Contraseña" type="password" value={form.password} onChange={(e) => setF('password', e.target.value)} required />}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Rol <span className="text-red-500">*</span></label>
            <select value={form.rolNombre} onChange={(e) => setF('rolNombre', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
              <option value="">Seleccionar rol...</option>
              {ROLES_DISPONIBLES.map((r) => <option key={r} value={r}>{ROL_LABEL[r] ?? r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Área</label>
            <select value={form.areaId} onChange={(e) => setF('areaId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
              <option value="">Sin área asignada</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.sigla})</option>)}
            </select>
          </div>
          {(form.rolNombre === 'MESA_DE_PARTES' || editando?.rol?.nombre === 'MESA_DE_PARTES') && (
            <Input
              label={editando ? 'Nuevo PIN de derivación (vacío = no cambiar)' : 'PIN de derivación'}
              placeholder="4 a 6 dígitos" type="password"
              value={form.pin_derivacion}
              onChange={(e) => setF('pin_derivacion', e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              helper="PIN numérico que el funcionario usará para confirmar derivaciones."
            />
          )}
        </div>
      </Modal>

      {/* Modal reset password */}
      <Modal open={modalReset} onClose={() => setModalReset(false)} title="Resetear contraseña" size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalReset(false)}>Cancelar</Button><Button variant="primary" loading={loading} icon={<KeyRound size={14} />} onClick={handleResetPassword} disabled={!nuevaPass}>Actualizar</Button></>}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Reseteando contraseña de: <strong>{userReset?.nombre_completo}</strong></p>
          <Input label="Nueva contraseña" type="password" placeholder="Mínimo 6 caracteres" value={nuevaPass} onChange={(e) => setNuevaPass(e.target.value)} required autoFocus />
        </div>
      </Modal>

      {/* Modal área */}
      <Modal open={modalArea} onClose={() => setModalArea(false)} title={editandoArea ? 'Editar área' : 'Nueva área'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalArea(false)}>Cancelar</Button><Button variant="primary" loading={loading} onClick={handleGuardarArea}>{editandoArea ? 'Guardar' : 'Crear área'}</Button></>}>
        <div className="space-y-3">
          <Input label="Nombre del área" placeholder="Ej: Área de Urbanismo" value={formArea.nombre} onChange={(e) => setFA('nombre', e.target.value)} required autoFocus />
          <Input label="Sigla" placeholder="Ej: URB" value={formArea.sigla} onChange={(e) => setFA('sigla', e.target.value.toUpperCase())} maxLength={10} required helper="Identificador corto (máx 10 caracteres)" />
        </div>
      </Modal>

      {/* Modal trámite */}
      <Modal open={modalTramite} onClose={() => setModalTramite(false)} title={editandoTramite ? 'Editar trámite' : 'Nuevo trámite'} size="md"
        footer={<><Button variant="secondary" onClick={() => setModalTramite(false)}>Cancelar</Button><Button variant="primary" loading={loading} onClick={handleGuardarTramite}>{editandoTramite ? 'Guardar cambios' : 'Crear trámite'}</Button></>}>
        <div className="space-y-3">
          <Input label="Nombre del trámite" placeholder="Ej: Licencia de Construcción" value={formTramite.nombre} onChange={(e) => setFT('nombre', e.target.value)} required autoFocus />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descripción <span className="text-gray-400 font-normal">— opcional</span></label>
            <textarea value={formTramite.descripcion} onChange={(e) => setFT('descripcion', e.target.value)}
              placeholder="Descripción breve del trámite para el ciudadano..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
              rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Plazo (días hábiles)" type="number" placeholder="15" value={formTramite.plazo_dias} onChange={(e) => setFT('plazo_dias', e.target.value)} required helper="Días hábiles para resolver" />
            <Input label="Costo (S/)" type="number" placeholder="0.00" value={formTramite.costo_soles} onChange={(e) => setFT('costo_soles', e.target.value)} required helper="Monto en soles" />
          </div>
        </div>
      </Modal>

      {/* Modal requisito */}
      <Modal open={modalReq} onClose={() => setModalReq(false)} title={editandoReq ? 'Editar requisito' : `Nuevo requisito — ${tramiteReq?.nombre}`} size="sm"
        footer={<><Button variant="secondary" onClick={() => setModalReq(false)}>Cancelar</Button><Button variant="primary" loading={loading} onClick={handleGuardarReq}>{editandoReq ? 'Guardar' : 'Agregar requisito'}</Button></>}>
        <div className="space-y-3">
          <Input label="Nombre del requisito" placeholder="Ej: Copia del DNI" value={formReq.nombre} onChange={(e) => setFormReq(prev => ({ ...prev, nombre: e.target.value }))} required autoFocus />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descripción <span className="text-gray-400 font-normal">— opcional</span></label>
            <textarea value={formReq.descripcion} onChange={(e) => setFormReq(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Instrucciones adicionales para el ciudadano..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
              rows={2} />
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input type="checkbox" id="obligatorio" checked={formReq.obligatorio}
              onChange={(e) => setFormReq(prev => ({ ...prev, obligatorio: e.target.checked }))}
              className="w-4 h-4 accent-blue-600" />
            <label htmlFor="obligatorio" className="text-sm text-gray-700 cursor-pointer">
              <strong>Obligatorio</strong> — el ciudadano debe adjuntarlo para continuar
            </label>
          </div>
        </div>
      </Modal>

      {/* Confirms */}
      <ConfirmModal open={!!confirmDesactivar} onClose={() => setConfirmDesactivar(null)} onConfirm={() => confirmDesactivar && handleDesactivar(confirmDesactivar)} title="Desactivar usuario"  message={`¿Desactivar a ${confirmDesactivar?.nombre_completo}?`}         confirmText="Desactivar" loading={loading} danger />
      <ConfirmModal open={!!confirmActivar}    onClose={() => setConfirmActivar(null)}    onConfirm={() => confirmActivar    && handleActivar(confirmActivar)}       title="Activar usuario"    message={`¿Activar a ${confirmActivar?.nombre_completo}?`}                confirmText="Activar"    loading={loading} />
      <ConfirmModal open={!!confirmElimArea}   onClose={() => setConfirmElimArea(null)}   onConfirm={() => confirmElimArea   && handleEliminarArea(confirmElimArea)}  title="Eliminar área"      message={`¿Eliminar el área "${confirmElimArea?.nombre}"?`}               confirmText="Eliminar"   loading={loading} danger />
      <ConfirmModal open={!!confirmElimReq}    onClose={() => setConfirmElimReq(null)}    onConfirm={() => confirmElimReq    && handleEliminarReq(confirmElimReq)}    title="Eliminar requisito" message={`¿Eliminar el requisito "${confirmElimReq?.nombre}"?`}           confirmText="Eliminar"   loading={loading} danger />
    </div>
  );
}