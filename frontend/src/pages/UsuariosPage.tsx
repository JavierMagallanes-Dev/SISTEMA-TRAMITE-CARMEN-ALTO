// src/pages/UsuariosPage.tsx

import { useEffect, useState } from 'react';
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
  UserPlus, RefreshCw, UserCheck,
  UserX, KeyRound, Pencil,
} from 'lucide-react';


interface UsuarioRow {
  id:              number;
  dni:             string;
  nombre_completo: string;
  email:           string;
  activo:          boolean;
  created_at:      string;
  rol:             { nombre: string };
  area:            { id: number; nombre: string; sigla: string } | null;
}

const ROLES_DISPONIBLES = ['ADMIN', 'MESA_DE_PARTES', 'CAJERO', 'TECNICO', 'JEFE_AREA'];

export default function UsuariosPage() {
  const [usuarios,  setUsuarios]  = useState<UsuarioRow[]>([]);
  const [areas,     setAreas]     = useState<Area[]>([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [filtro,    setFiltro]    = useState<'todos' | 'activos' | 'inactivos'>('activos');

  // Modal crear/editar
  const [modalForm, setModalForm] = useState(false);
  const [editando,  setEditando]  = useState<UsuarioRow | null>(null);
  const [form, setForm] = useState({
    dni: '', nombre_completo: '', email: '',
    password: '', rolNombre: '', areaId: '',
  });

  // Modal reset password
  const [modalReset,   setModalReset]   = useState(false);
  const [userReset,    setUserReset]    = useState<UsuarioRow | null>(null);
  const [nuevaPass,    setNuevaPass]    = useState('');

  // Confirms
  const [confirmDesactivar, setConfirmDesactivar] = useState<UsuarioRow | null>(null);
  const [confirmActivar,    setConfirmActivar]    = useState<UsuarioRow | null>(null);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const activo = filtro === 'todos' ? undefined : filtro === 'activos';
      const [users, ar] = await Promise.all([
        usuariosService.listar(activo),
        usuariosService.areas(),
      ]);
      setUsuarios(users);
      setAreas(ar);
    } catch {
      setError('Error al cargar los datos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, [filtro]);

  const abrirCrear = () => {
    setEditando(null);
    setForm({ dni: '', nombre_completo: '', email: '', password: '', rolNombre: '', areaId: '' });
    setModalForm(true);
  };

  const abrirEditar = (u: UsuarioRow) => {
    setEditando(u);
    setForm({
      dni:             u.dni,
      nombre_completo: u.nombre_completo,
      email:           u.email,
      password:        '',
      rolNombre:       u.rol.nombre,
      areaId:          u.area?.id ? String(u.area.id) : '',
    });
    setModalForm(true);
  };

  const handleGuardar = async () => {
    if (!form.nombre_completo || !form.email || !form.rolNombre) {
      setError('Completa nombre, email y rol.');
      return;
    }
    if (!editando && (!form.dni || !form.password)) {
      setError('DNI y contraseña son obligatorios al crear.');
      return;
    }
    setLoading(true);
    try {
      if (editando) {
        await usuariosService.editar(editando.id, {
          nombre_completo: form.nombre_completo,
          email:           form.email,
          rolNombre:       form.rolNombre,
          areaId:          form.areaId || null,
        });
        setSuccess('Usuario actualizado correctamente.');
      } else {
        await usuariosService.crear({
          dni:             form.dni,
          nombre_completo: form.nombre_completo,
          email:           form.email,
          password:        form.password,
          rolNombre:       form.rolNombre,
          areaId:          form.areaId || null,
        });
        setSuccess('Usuario creado correctamente.');
      }
      setModalForm(false);
      cargarDatos();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al guardar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDesactivar = async (u: UsuarioRow) => {
    setLoading(true);
    try {
      await usuariosService.desactivar(u.id);
      setSuccess(`${u.nombre_completo} desactivado.`);
      setConfirmDesactivar(null);
      cargarDatos();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al desactivar.');
    } finally { setLoading(false); }
  };

  const handleActivar = async (u: UsuarioRow) => {
    setLoading(true);
    try {
      await usuariosService.activar(u.id);
      setSuccess(`${u.nombre_completo} activado.`);
      setConfirmActivar(null);
      cargarDatos();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al activar.');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!userReset || !nuevaPass) return;
    setLoading(true);
    try {
      await usuariosService.resetPassword(userReset.id, nuevaPass);
      setSuccess(`Contraseña de ${userReset.nombre_completo} actualizada.`);
      setModalReset(false);
      setNuevaPass('');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al resetear contraseña.');
    } finally { setLoading(false); }
  };

  const setF = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  if (cargando) return <Spinner text="Cargando usuarios..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Personal municipal del sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={cargarDatos}>
            Actualizar
          </Button>
          <Button icon={<UserPlus size={14} />} onClick={abrirCrear}>
            Nuevo usuario
          </Button>
        </div>
      </div>

      {error   && <Alert type="error"   message={error}   onClose={() => setError('')}   />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Filtros */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['activos', 'inactivos', 'todos'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              filtro === f
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <Card padding={false}>
        <Table
          keyField="id"
          data={usuarios}
          emptyText="No hay usuarios"
          columns={[
            {
              key: 'nombre_completo', header: 'Nombre',
              render: (r) => (
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.nombre_completo}</p>
                  <p className="text-xs text-gray-400">{r.dni} · {r.email}</p>
                </div>
              ),
            },
            {
              key: 'rol', header: 'Rol',
              render: (r) => (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {ROL_LABEL[r.rol.nombre] ?? r.rol.nombre}
                </span>
              ),
            },
            {
              key: 'area', header: 'Área',
              render: (r) => r.area
                ? <span className="text-xs text-gray-600">{r.area.nombre}</span>
                : <span className="text-xs text-gray-300">—</span>,
            },
            {
              key: 'activo', header: 'Estado',
              render: (r) => (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  r.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                  {r.activo ? 'Activo' : 'Inactivo'}
                </span>
              ),
            },
            {
              key: 'created_at', header: 'Creado',
              render: (r) => <span className="text-xs text-gray-400">{formatFecha(r.created_at)}</span>,
            },
            {
              key: 'acciones', header: '',
              render: (r) => (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" icon={<Pencil size={12} />} onClick={() => abrirEditar(r)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" icon={<KeyRound size={12} />} onClick={() => { setUserReset(r); setNuevaPass(''); setModalReset(true); }}>
                    Password
                  </Button>
                  {r.activo
                    ? <Button size="sm" variant="ghost" icon={<UserX size={12} />} onClick={() => setConfirmDesactivar(r)}>
                        Desactivar
                      </Button>
                    : <Button size="sm" variant="ghost" icon={<UserCheck size={12} />} onClick={() => setConfirmActivar(r)}>
                        Activar
                      </Button>
                  }
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal crear/editar */}
      <Modal
        open={modalForm}
        onClose={() => setModalForm(false)}
        title={editando ? 'Editar usuario' : 'Nuevo usuario'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalForm(false)}>Cancelar</Button>
            <Button variant="primary" loading={loading} onClick={handleGuardar}>
              {editando ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {!editando && (
            <Input label="DNI" placeholder="12345678" value={form.dni} onChange={(e) => setF('dni', e.target.value)} maxLength={8} required />
          )}
          <Input label="Nombre completo" value={form.nombre_completo} onChange={(e) => setF('nombre_completo', e.target.value)} required />
          <Input label="Email institucional" type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} required />
          {!editando && (
            <Input label="Contraseña" type="password" value={form.password} onChange={(e) => setF('password', e.target.value)} required />
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Rol <span className="text-red-500">*</span></label>
            <select
              value={form.rolNombre}
              onChange={(e) => setF('rolNombre', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Seleccionar rol...</option>
              {ROLES_DISPONIBLES.map((r) => (
                <option key={r} value={r}>{ROL_LABEL[r] ?? r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Área</label>
            <select
              value={form.areaId}
              onChange={(e) => setF('areaId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Sin área asignada</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre} ({a.sigla})</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal reset password */}
      <Modal
        open={modalReset}
        onClose={() => setModalReset(false)}
        title="Resetear contraseña"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalReset(false)}>Cancelar</Button>
            <Button variant="primary" loading={loading} icon={<KeyRound size={14} />} onClick={handleResetPassword} disabled={!nuevaPass}>
              Actualizar contraseña
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Reseteando contraseña de: <strong>{userReset?.nombre_completo}</strong>
          </p>
          <Input
            label="Nueva contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={nuevaPass}
            onChange={(e) => setNuevaPass(e.target.value)}
            required
            autoFocus
          />
        </div>
      </Modal>

      {/* Confirms */}
      <ConfirmModal
        open={!!confirmDesactivar}
        onClose={() => setConfirmDesactivar(null)}
        onConfirm={() => confirmDesactivar && handleDesactivar(confirmDesactivar)}
        title="Desactivar usuario"
        message={`¿Desactivar a ${confirmDesactivar?.nombre_completo}? No podrá ingresar al sistema.`}
        confirmText="Desactivar"
        loading={loading}
        danger
      />
      <ConfirmModal
        open={!!confirmActivar}
        onClose={() => setConfirmActivar(null)}
        onConfirm={() => confirmActivar && handleActivar(confirmActivar)}
        title="Activar usuario"
        message={`¿Activar a ${confirmActivar?.nombre_completo}?`}
        confirmText="Activar"
        loading={loading}
      />
    </div>
  );
}