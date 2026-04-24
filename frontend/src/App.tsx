// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { NombreRol } from './types';

// Páginas
import LoginPage      from './pages/LoginPage';
import DashboardPage  from './pages/DashboardPage';
import PortalPage     from './pages/PortalPage';
import ConsultaPage   from './pages/ConsultaPage';
import CajeroPage     from './pages/CajeroPage';
import MesaPartesPage from './pages/MesaPartesPage';
import AreasPage      from './pages/AreasPage';
import UsuariosPage   from './pages/UsuariosPage';
import AuditoriaPage  from './pages/AuditoriaPage';
import ReportesPage   from './pages/ReportesPage';
import HistorialPage from './pages/HistorialPage';
import MainLayout     from './layouts/MainLayout';

// ── Ruta protegida por autenticación ────────────────────────
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { usuario } = useAuth();
  return usuario ? <>{children}</> : <Navigate to="/login" replace />;
};

// ── Ruta protegida por rol ───────────────────────────────────
const RolRoute = ({
  roles,
  children,
}: {
  roles: NombreRol[];
  children: React.ReactNode;
}) => {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (!roles.includes(usuario.rol.nombre)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { usuario } = useAuth();

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login"             element={usuario ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/portal"            element={<PortalPage />} />
      <Route path="/consulta/:codigo?" element={<ConsultaPage />} />

      {/* Rutas internas protegidas */}
      <Route path="/" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="cajero" element={
          <RolRoute roles={['CAJERO', 'ADMIN']}>
            <CajeroPage />
          </RolRoute>
        } />

        <Route path="mesa-partes" element={
          <RolRoute roles={['MESA_DE_PARTES', 'ADMIN']}>
            <MesaPartesPage />
          </RolRoute>
        } />

        <Route path="areas" element={
          <RolRoute roles={['TECNICO', 'JEFE_AREA', 'ADMIN']}>
            <AreasPage />
          </RolRoute>
        } />
        <Route path="historial" element={
  <RolRoute roles={['JEFE_AREA', 'ADMIN']}>
    <HistorialPage />
  </RolRoute>
} />

        <Route path="usuarios" element={
          <RolRoute roles={['ADMIN']}>
            <UsuariosPage />
          </RolRoute>
        } />

        <Route path="auditoria" element={
          <RolRoute roles={['ADMIN']}>
            <AuditoriaPage />
          </RolRoute>
        } />

        <Route path="reportes" element={
          <RolRoute roles={['ADMIN', 'MESA_DE_PARTES', 'JEFE_AREA']}>
            <ReportesPage />
          </RolRoute>
        } />
      </Route>

      {/* Ruta no encontrada */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}