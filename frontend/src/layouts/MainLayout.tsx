// src/layouts/MainLayout.tsx
// Layout principal del Sistema de Trámite Documentario · Carmen Alto
// - Sidebar fijo en desktop (≥ lg)
// - Drawer lateral con overlay en móvil/tablet (< lg)
// - Botón "Cerrar sesión" SIEMPRE visible al fondo (sticky bottom) en AMBOS modos
// - Modal de confirmación antes de cerrar sesión

import { useEffect, useState, useMemo } from 'react';
import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, FolderOpen, Layers, CreditCard, Users, BarChart3,
  Bell, ChevronDown, Menu, X, LogOut, Building2, Archive, Shield,
  AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoCA from '../assets/logoCA.webp';

// ── Tipos ───────────────────────────────────────────────────────────
type RolNombre =
  | 'ADMIN'
  | 'MESA_DE_PARTES'
  | 'CAJERO'
  | 'TECNICO'
  | 'JEFE_AREA'
  | 'CIUDADANO';

interface MenuItem {
  to:    string;
  label: string;
  Icon:  LucideIcon;
  roles: readonly RolNombre[];
}

const MENU: readonly MenuItem[] = [
  { to: '/dashboard',   label: 'Dashboard',     Icon: Home,       roles: ['ADMIN', 'MESA_DE_PARTES', 'CAJERO', 'TECNICO', 'JEFE_AREA'] },
  { to: '/cajero',      label: 'Cajero',         Icon: CreditCard, roles: ['ADMIN', 'CAJERO'] },
  { to: '/mesa-partes', label: 'Mesa de Partes', Icon: FolderOpen, roles: ['ADMIN', 'MESA_DE_PARTES'] },
  { to: '/areas',       label: 'Mi Área',        Icon: Layers,     roles: ['ADMIN', 'TECNICO', 'JEFE_AREA'] },
  { to: '/historial',   label: 'Historial',      Icon: Archive,    roles: ['ADMIN', 'JEFE_AREA'] },
  { to: '/reportes',    label: 'Reportes',       Icon: BarChart3,  roles: ['ADMIN', 'MESA_DE_PARTES', 'JEFE_AREA'] },
  { to: '/usuarios',    label: 'Usuarios',       Icon: Users,      roles: ['ADMIN'] },
  { to: '/auditoria',   label: 'Auditoría',      Icon: Shield,     roles: ['ADMIN'] },
] as const;

const PRIMARY = '#216ece';
const ACCENT  = '#4abdef';
const TINT    = '#eaf2fb';

// ── NavItem ─────────────────────────────────────────────────────────
function NavItem({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  const { Icon } = item;
  return (
    <NavLink to={item.to} onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
         ${isActive ? '' : 'text-gray-700 hover:bg-gray-100'}`
      }
      style={({ isActive }) => isActive ? { backgroundColor: TINT, color: PRIMARY } : undefined}
    >
      <Icon size={18} className="shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
    </NavLink>
  );
}

// ── Modal de confirmación de cierre de sesión ────────────────────────
function ModalCerrarSesion({
  open, onConfirmar, onCancelar, usuario,
}: {
  open:       boolean;
  onConfirmar: () => void;
  onCancelar:  () => void;
  usuario: { nombre: string; rol: string; iniciales: string };
}) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelar();
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancelar]);

  // Bloquear scroll del body
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancelar}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header rojo */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">¿Cerrar sesión?</h3>
            <p className="text-xs text-gray-500 mt-0.5">Se cerrará tu sesión actual</p>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-4">
          {/* Info usuario */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-200">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})` }}>
              {usuario.iniciales}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{usuario.nombre}</p>
              <p className="text-xs text-gray-500 truncate">{usuario.rol}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 text-center">
            ¿Estás seguro que deseas cerrar tu sesión? Tendrás que volver a iniciar sesión para acceder al sistema.
          </p>
        </div>

        {/* Botones */}
        <div className="px-6 pb-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirmar}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <LogOut size={15} />
            Sí, cerrar sesión
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SidebarContent ───────────────────────────────────────────────────
interface SidebarContentProps {
  items:          readonly MenuItem[];
  onNavigate:     () => void;
  onLogout:       () => void;
  onCloseMobile?: () => void;
  usuario: { nombre: string; rol: string; iniciales: string; area?: string };
}
function SidebarContent({ items, onNavigate, onLogout, onCloseMobile, usuario }: SidebarContentProps) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header — logo */}
      <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white border border-gray-100 flex items-center justify-center">
          <img src={logoCA} alt="Municipalidad Carmen Alto" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: PRIMARY }}>
            Carmen Alto
          </p>
          <p className="text-xs text-gray-500 truncate">Trámite Documentario</p>
        </div>
        {onCloseMobile && (
          <button type="button" onClick={onCloseMobile}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 lg:hidden"
            aria-label="Cerrar menú">
            <X size={18} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Nav scrolleable */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-2">
          Navegación
        </p>
        {items.map((item) => (
          <NavItem key={item.to} item={item} onClick={onNavigate} />
        ))}
      </nav>

      {/* Footer — perfil + Cerrar sesión */}
      <div className="border-t border-gray-100 shrink-0 bg-white">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})` }}
            aria-hidden="true">
            {usuario.iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{usuario.nombre}</p>
            <p className="text-[10px] text-gray-500 truncate">
              {usuario.rol}{usuario.area ? ` · ${usuario.area}` : ''}
            </p>
          </div>
        </div>

        {/* Botón cerrar sesión — muestra modal de confirmación */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold border bg-red-50 border-red-200 text-red-700 hover:bg-red-100 transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────
function calcIniciales(nombreCompleto: string): string {
  const partes  = nombreCompleto.trim().split(/\s+/);
  const primera = partes[0]?.[0] ?? '';
  const segunda = partes[1]?.[0] ?? '';
  return (primera + segunda).toUpperCase() || 'U';
}

// ── MainLayout ───────────────────────────────────────────────────────
export default function MainLayout({ children }: { children?: ReactNode }) {
  const { usuario, logout } = useAuth();
  const navigate            = useNavigate();
  const location            = useLocation();

  const [drawerOpen,        setDrawerOpen]        = useState(false);
  const [modalLogoutOpen,   setModalLogoutOpen]   = useState(false);

  const items = useMemo<readonly MenuItem[]>(() => {
    const rol = usuario?.rol?.nombre as RolNombre | undefined;
    if (!rol) return [];
    return MENU.filter((m) => m.roles.includes(rol));
  }, [usuario]);

  // Cerrar drawer al cambiar de ruta
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Tecla Esc cierra drawer (solo si modal no está abierto)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modalLogoutOpen) setDrawerOpen(false);
    };
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeyDown);
    }
    return () => {
      if (!modalLogoutOpen) document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen, modalLogoutOpen]);

  // Abre el modal de confirmación
  const pedirConfirmacionLogout = () => {
    setDrawerOpen(false); // Cierra el drawer si estaba abierto
    setModalLogoutOpen(true);
  };

  // Confirma y ejecuta el logout
  const confirmarLogout = () => {
    setModalLogoutOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  if (!usuario) return null;

  const usuarioVista = {
    nombre:    usuario.nombre_completo,
    rol:       usuario.rol?.nombre?.replace(/_/g, ' ') ?? '',
    iniciales: calcIniciales(usuario.nombre_completo),
    area:      usuario.area?.nombre,
  };

  const tituloPagina = items.find((i) => location.pathname.startsWith(i.to))?.label ?? 'Inicio';

  const onOverlayKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Modal confirmación cierre de sesión ─────────── */}
      <ModalCerrarSesion
        open={modalLogoutOpen}
        onConfirmar={confirmarLogout}
        onCancelar={() => setModalLogoutOpen(false)}
        usuario={usuarioVista}
      />

      {/* ── Sidebar Desktop ──────────────────────────────── */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-gray-100 fixed inset-y-0 left-0 z-30">
        <SidebarContent
          items={items}
          onNavigate={() => {}}
          onLogout={pedirConfirmacionLogout}
          usuario={usuarioVista}
        />
      </aside>

      {/* ── Drawer Móvil ────────────────────────────────── */}
      <div
        role="button" tabIndex={drawerOpen ? 0 : -1}
        aria-label="Cerrar menú" aria-hidden={!drawerOpen}
        onClick={() => setDrawerOpen(false)} onKeyDown={onOverlayKey}
        className={`lg:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-300
          ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 shadow-xl
          transition-transform duration-300 ease-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!drawerOpen}
      >
        <SidebarContent
          items={items}
          onNavigate={() => setDrawerOpen(false)}
          onLogout={pedirConfirmacionLogout}
          onCloseMobile={() => setDrawerOpen(false)}
          usuario={usuarioVista}
        />
      </aside>

      {/* ── Main column ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between gap-3 px-4 sm:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              aria-label="Abrir menú">
              <Menu size={20} className="text-gray-700" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
                <Building2 size={15} className="text-white" />
              </div>
              <span className="text-sm font-bold text-gray-800 truncate">Carmen Alto</span>
            </div>
            <h1 className="hidden lg:block text-base font-bold text-gray-900 truncate">
              {tituloPagina}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button"
              className="relative w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              aria-label="Notificaciones">
              <Bell size={18} className="text-gray-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-100">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})` }}>
                {usuarioVista.iniciales}
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}