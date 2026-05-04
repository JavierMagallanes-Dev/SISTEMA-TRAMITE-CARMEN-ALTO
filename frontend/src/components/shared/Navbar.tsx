// Navbar institucional profesional para páginas públicas.
// Redirección directa en el menú de trámites.

import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText, Search, LogIn, Menu, X,
  Building2, CreditCard,
  HelpCircle, Phone, Clock,
} from 'lucide-react';
import logoCA from '../../assets/logoCA.webp';

const PRIMARY        = '#216ece';
const PRIMARY_DARKER = '#143f7a';

export default function Navbar() {
  const navigate   = useNavigate();
  const location   = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  // Cerrar al cambiar de ruta
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40"
      style={{ boxShadow: '0 1px 3px rgba(15,23,42,.08), 0 4px 16px -8px rgba(33,110,206,.12)' }}>

      {/* ── Barra superior institucional ──────────────────── */}
      <div className="hidden lg:block border-b border-gray-100" style={{ backgroundColor: PRIMARY_DARKER }}>
        <div className="max-w-6xl mx-auto px-6 h-8 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-white/70">
            <span className="flex items-center gap-1.5">
              <Clock size={11} />Lun–Vie: 8:00 AM – 4:30 PM
            </span>
            <span className="flex items-center gap-1.5">
              <Phone size={11} />(066) 123-456
            </span>
          </div>
          <span className="text-xs text-white/70">
            Municipalidad Distrital de Carmen Alto
          </span>
        </div>
      </div>

      {/* ── Navbar principal ──────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ boxShadow: '0 1px 4px rgba(33,110,206,.15)' }}>
              <img src={logoCA} alt="Carmen Alto" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-gray-900 leading-tight">Municipalidad Distrital</p>
              <p className="text-xs font-bold leading-tight" style={{ color: PRIMARY }}>de Carmen Alto</p>
            </div>
          </NavLink>

          {/* ── Links desktop ─────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-0.5">

            {/* Inicio */}
            <NavLink to="/"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') ? 'text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              style={isActive('/') ? { backgroundColor: PRIMARY } : undefined}>
              <Building2 size={14} />Inicio
            </NavLink>

            {/* Trámites — Redirección directa */}
            <NavLink to="/portal"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/portal') ? 'text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              style={isActive('/portal') ? { backgroundColor: PRIMARY } : undefined}>
              <FileText size={14} />Trámites
            </NavLink>

            {/* Consultar */}
            <NavLink to="/consulta"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/consulta') ? 'text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              style={isActive('/consulta') ? { backgroundColor: PRIMARY } : undefined}>
              <Search size={14} />Consultar
            </NavLink>

            {/* Pagar */}
            <NavLink to="/consulta"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
              <CreditCard size={14} />Pagar
            </NavLink>

            {/* Ayuda */}
            <NavLink to="/#faq"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
                setTimeout(() => {
                  document.querySelector('#faq')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
              <HelpCircle size={14} />Ayuda
            </NavLink>
          </nav>

          {/* ── Acceso personal + hamburguesa ─────────────── */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: PRIMARY }}>
              <LogIn size={14} />
              Acceso personal
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Menú móvil ────────────────────────────────────── */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <NavLink to="/" onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/') ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            style={isActive('/') ? { backgroundColor: PRIMARY } : undefined}>
            <Building2 size={15} />Inicio
          </NavLink>

          <NavLink to="/portal" onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/portal') ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            style={isActive('/portal') ? { backgroundColor: PRIMARY } : undefined}>
            <FileText size={15} />Trámites
          </NavLink>

          <NavLink to="/consulta" onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/consulta') ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            style={isActive('/consulta') ? { backgroundColor: PRIMARY } : undefined}>
            <Search size={15} />Consultar estado
          </NavLink>

          <NavLink to="/consulta" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
            <CreditCard size={15} />Pagar trámite
          </NavLink>

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => { navigate('/login'); setMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: PRIMARY }}>
              <LogIn size={15} />Acceso personal
            </button>
          </div>
        </div>
      )}
    </header>
  );
}