// src/components/shared/Footer.tsx
// Footer institucional para páginas públicas.
// Reutilizable — importar en cualquier página pública.

import { NavLink } from 'react-router-dom';
import { FileText, Search, LogIn } from 'lucide-react';
import logoCA from '../../assets/logoCA.webp';

const PRIMARY = '#216ece';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">

          {/* Columna 1: Institución */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                <img src={logoCA} alt="Carmen Alto" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Municipalidad Distrital</p>
                <p className="text-sm font-bold leading-tight" style={{ color: PRIMARY }}>de Carmen Alto</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Comprometidos con el desarrollo y bienestar de nuestra comunidad,
              brindando servicios de calidad a todos los vecinos del distrito.
            </p>
          </div>

          {/* Columna 2: Trámites */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800">Trámites en línea</h3>
            <ul className="space-y-2">
              <li>
                <NavLink to="/portal"
                  className="text-xs text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  <FileText size={12} />Registrar nuevo trámite
                </NavLink>
              </li>
              <li>
                <NavLink to="/consulta"
                  className="text-xs text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  <Search size={12} />Consultar estado de trámite
                </NavLink>
              </li>
              <li>
                <NavLink to="/login"
                  className="text-xs text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  <LogIn size={12} />Acceso personal municipal
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Columna 3: Contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800">Contacto</h3>
            <ul className="space-y-2 text-xs text-gray-500">
              <li className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5"></span>
                <span>Av.  Libertadores, Carmen Alto, Ayacucho</span>
              </li>
              <li className="flex items-center gap-2">
                <span></span>
                <span>(066) 123-456</span>
              </li>
              <li className="flex items-center gap-2">
                <span></span>
                <span>tramites@muncarmenalto.gob.pe</span>
              </li>
              <li className="flex items-center gap-2">
                <span></span>
                <span>Lun–Vie: 8:00 AM – 6:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-400">
            © 2026 Municipalidad Distrital de Carmen Alto · Todos los derechos reservados
          </p>
          <p className="text-xs text-gray-400">
            Sistema de Trámite Documentario v1.0
          </p>
        </div>
      </div>
    </footer>
  );
}