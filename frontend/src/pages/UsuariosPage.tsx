// src/pages/UsuariosPage.tsx
// Solo orquesta — toda la lógica está en useUsuarios.

import { useUsuarios }   from '../hooks/useUsuarios';
import Alert             from '../components/ui/Alert';
import Button            from '../components/ui/Button';
import Input             from '../components/ui/Input';
import Modal             from '../components/ui/Modal';
import Spinner           from '../components/ui/Spinner';
import ConfirmModal      from '../components/shared/ConfirmModal';
import TabUsuarios       from '../components/usuarios/TabUsuarios';
import TabAreas          from '../components/usuarios/TabAreas';
import TabTramites       from '../components/usuarios/TabTramites';
import ModalUsuario      from '../components/usuarios/ModalUsuario';
import ModalArea         from '../components/usuarios/ModalArea';
import ModalTramite      from '../components/usuarios/ModalTramite';
import ModalRequisito    from '../components/usuarios/ModalRequisito';
import { RefreshCw, UserPlus, Plus, Building2, ClipboardList, KeyRound } from 'lucide-react';

export default function UsuariosPage() {
  const u = useUsuarios();

  if (u.cargando) return <Spinner text="Cargando..." />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Administración</h1>
          <p className="text-sm text-gray-500 mt-0.5">Usuarios, áreas y trámites del sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={u.cargarDatos}>Actualizar</Button>
          {u.tab === 'usuarios' && <Button icon={<UserPlus      size={14} />} onClick={u.abrirCrear}>Nuevo usuario</Button>}
          {u.tab === 'areas'    && <Button icon={<Plus          size={14} />} onClick={u.abrirCrearArea}>Nueva área</Button>}
          {u.tab === 'tramites' && <Button icon={<Plus          size={14} />} onClick={u.abrirCrearTramite}>Nuevo trámite</Button>}
        </div>
      </div>

      {u.error   && <Alert type="error"   message={u.error}   onClose={() => u.setError('')}   />}
      {u.success && <Alert type="success" message={u.success} onClose={() => u.setSuccess('')} />}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'usuarios', label: 'Usuarios',  icon: <UserPlus      size={13} /> },
          { key: 'areas',    label: 'Áreas',      icon: <Building2     size={13} /> },
          { key: 'tramites', label: 'Trámites',   icon: <ClipboardList size={13} /> },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => u.setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              u.tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Contenido por tab */}
      {u.tab === 'usuarios' && (
        <TabUsuarios
          usuarios={u.usuarios}
          filtro={u.filtro}
          setFiltro={u.setFiltro}
          ROL_LABEL={u.ROL_LABEL}
          onEditar={u.abrirEditar}
          onResetPassword={(usr) => { u.setUserReset(usr); u.setNuevaPass(''); u.setModalReset(true); }}
          onDesactivar={(usr) => u.setConfirmDesactivar(usr)}
          onActivar={(usr)    => u.setConfirmActivar(usr)}
        />
      )}

      {u.tab === 'areas' && (
        <TabAreas
          areas={u.areas}
          usuarios={u.usuarios}
          onEditar={u.abrirEditarArea}
          onEliminar={(a) => u.setConfirmElimArea(a)}
        />
      )}

      {u.tab === 'tramites' && (
        <TabTramites
          tramites={u.tramites}
          expandedTramite={u.expandedTramite}
          setExpanded={u.setExpandedTramite}
          onEditar={u.abrirEditarTramite}
          onToggle={u.handleToggleTramite}
          onAgregarReq={u.abrirCrearReq}
          onEditarReq={u.abrirEditarReq}
          onEliminarReq={(r) => u.setConfirmElimReq(r)}
        />
      )}

      {/* Modales */}
      <ModalUsuario
        open={u.modalForm}
        onClose={() => u.setModalForm(false)}
        editando={u.editando}
        form={u.form}
        setF={u.setF}
        areas={u.areas}
        roles={u.ROLES_DISPONIBLES}
        ROL_LABEL={u.ROL_LABEL}
        loading={u.loading}
        onGuardar={u.handleGuardar}
      />

      <Modal open={u.modalReset} onClose={() => u.setModalReset(false)} title="Resetear contraseña" size="sm"
        footer={<><Button variant="secondary" onClick={() => u.setModalReset(false)}>Cancelar</Button><Button variant="primary" loading={u.loading} icon={<KeyRound size={14} />} onClick={u.handleResetPassword} disabled={!u.nuevaPass}>Actualizar</Button></>}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Reseteando contraseña de: <strong>{u.userReset?.nombre_completo}</strong></p>
          <Input label="Nueva contraseña" type="password" placeholder="Mínimo 6 caracteres" value={u.nuevaPass} onChange={(e) => u.setNuevaPass(e.target.value)} required autoFocus />
        </div>
      </Modal>

      <ModalArea
        open={u.modalArea}
        onClose={() => u.setModalArea(false)}
        editando={u.editandoArea}
        form={u.formArea}
        setFA={u.setFA}
        loading={u.loading}
        onGuardar={u.handleGuardarArea}
      />

      <ModalTramite
        open={u.modalTramite}
        onClose={() => u.setModalTramite(false)}
        editando={u.editandoTramite}
        form={u.formTramite}
        setFT={u.setFT}
        loading={u.loading}
        onGuardar={u.handleGuardarTramite}
      />

      <ModalRequisito
        open={u.modalReq}
        onClose={() => u.setModalReq(false)}
        tramiteReq={u.tramiteReq}
        editandoReq={u.editandoReq}
        form={u.formReq}
        setForm={u.setFormReq}
        loading={u.loading}
        onGuardar={u.handleGuardarReq}
      />

      {/* Confirms */}
      <ConfirmModal open={!!u.confirmDesactivar} onClose={() => u.setConfirmDesactivar(null)} onConfirm={() => u.confirmDesactivar && u.handleDesactivar(u.confirmDesactivar)} title="Desactivar usuario"  message={`¿Desactivar a ${u.confirmDesactivar?.nombre_completo}?`}    confirmText="Desactivar" loading={u.loading} danger />
      <ConfirmModal open={!!u.confirmActivar}    onClose={() => u.setConfirmActivar(null)}    onConfirm={() => u.confirmActivar    && u.handleActivar(u.confirmActivar)}       title="Activar usuario"    message={`¿Activar a ${u.confirmActivar?.nombre_completo}?`}           confirmText="Activar"    loading={u.loading} />
      <ConfirmModal open={!!u.confirmElimArea}   onClose={() => u.setConfirmElimArea(null)}   onConfirm={() => u.confirmElimArea   && u.handleEliminarArea(u.confirmElimArea)}  title="Eliminar área"      message={`¿Eliminar el área "${u.confirmElimArea?.nombre}"?`}          confirmText="Eliminar"   loading={u.loading} danger />
      <ConfirmModal open={!!u.confirmElimReq}    onClose={() => u.setConfirmElimReq(null)}    onConfirm={() => u.confirmElimReq    && u.handleEliminarReq(u.confirmElimReq)}    title="Eliminar requisito" message={`¿Eliminar el requisito "${u.confirmElimReq?.nombre}"?`}   confirmText="Eliminar"   loading={u.loading} danger />
    </div>
  );
}