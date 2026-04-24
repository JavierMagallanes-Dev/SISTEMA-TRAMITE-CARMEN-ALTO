// src/layouts/MainLayout.tsx
// Layout interno con sidebar y área de contenido.

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, FileText, CreditCard, Building2, Shield, LogOut, ChevronRight, BarChart2, Archive } from 'lucide-react';

import type { NombreRol } from '../types';

interface NavItem {
  to:     string;
  label:  string;
  icon:   React.ReactNode;
  roles:  NombreRol[];
}

const navItems: NavItem[] = [
  {
    to:    '/dashboard',
    label: 'Dashboard',
    icon:  <LayoutDashboard size={18} />,
    roles: ['ADMIN', 'CAJERO', 'MESA_DE_PARTES', 'TECNICO', 'JEFE_AREA'],
  },
  {
    to:    '/cajero',
    label: 'Cajero',
    icon:  <CreditCard size={18} />,
    roles: ['CAJERO', 'ADMIN'],
  },
  {
    to:    '/mesa-partes',
    label: 'Mesa de Partes',
    icon:  <FileText size={18} />,
    roles: ['MESA_DE_PARTES', 'ADMIN'],
  },
  {
    to:    '/areas',
    label: 'Mi Área',
    icon:  <Building2 size={18} />,
    roles: ['TECNICO', 'JEFE_AREA', 'ADMIN'],
  },
  {
  to:    '/historial',
  label: 'Historial',
  icon:  <Archive size={18} />,
  roles: ['JEFE_AREA', 'ADMIN'],
},
  {
    to:    '/reportes', // Nueva ruta de Reportes
    label: 'Reportes',
    icon:  <BarChart2 size={18} />,
    roles: ['ADMIN', 'MESA_DE_PARTES', 'JEFE_AREA'],
  },
  {
    to:    '/usuarios',
    label: 'Usuarios',
    icon:  <Users size={18} />,
    roles: ['ADMIN'],
  },
  {
    to:    '/auditoria',
    label: 'Auditoría',
    icon:  <Shield size={18} />,
    roles: ['ADMIN'],
  },
];

export default function MainLayout() {
  const { usuario, logout } = useAuth();
  const navigate            = useNavigate();

  const itemsVisibles = navItems.filter(
    (item) => usuario && item.roles.includes(usuario.rol.nombre)
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-sm font-bold text-gray-800 leading-tight">
            Municipalidad Distrital
          </h1>
          <p className="text-xs text-blue-600 font-semibold">Carmen Alto</p>
        </div>

        {/* Usuario */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-800 truncate">
            {usuario?.nombre_completo}
          </p>
          <p className="text-xs text-gray-500">{usuario?.rol?.nombre?.replace('_', ' ')}</p>
          {usuario?.area && (
            <p className="text-xs text-blue-600">{usuario.area.nombre}</p>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {itemsVisibles.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              <ChevronRight size={14} className="text-gray-300" />
            </NavLink>
          ))}
        </nav>

        {/* Portal ciudadano */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => navigate('/portal')}
            className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
          >
            <FileText size={18} />
            Portal Ciudadano
          </button>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}