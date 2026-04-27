// src/layouts/PublicLayout.tsx
// Layout para páginas públicas: HomePage, PortalPage, ConsultaPage.
// Usa los componentes reutilizables Navbar y Footer.

import { Outlet } from 'react-router-dom';
import Navbar     from '../components/shared/Navbar';
import Footer     from '../components/shared/Footer';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}