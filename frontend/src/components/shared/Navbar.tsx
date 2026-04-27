// src/components/shared/Navbar.tsx
// Navbar institucional profesional para páginas públicas.
// Incluye megamenú con secciones del HomePage.

import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText, Search, LogIn, Menu, X,
  ChevronDown, Building2, CreditCard,
  HelpCircle, Phone, Clock, ArrowRight,
} from 'lucide-react';
import logoCA from '../../assets/logoCA.webp';

const PRIMARY        = '#216ece';
const PRIMARY_DARKER = '#143f7a';
const TINT           = '#eaf2fb';

// ── Trámites para el megamenú ────────────────────────────────
const TRAMITES_MENU = [
  { nombre: 'Licencia de Funcionamiento',     plazo: '15 días', costo: 'S/ 120.00' },
  { nombre: 'Renovación de Licencia',         plazo: '10 días', costo: 'S/ 80.00'  },
  { nombre: 'Licencia de Construcción',       plazo: '20 días', costo: 'S/ 200.00' },
  { nombre: 'Certificado de No Adeudo',       plazo: '5 días',  costo: 'S/ 30.00'  },
  { nombre: 'Partida de Nacimiento',          plazo: '3 días',  costo: 'S/ 15.00'  },
  { nombre: 'Autorización de Evento Público', plazo: '7 días',  costo: 'S/ 50.00'  },
];

export default function Navbar() {
  const navigate   = useNavigate();
  const location   = useLocation();

  const [menuOpen,     setMenuOpen]     = useState(false);
  const [tramitesOpen, setTramitesOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  // Cerrar megamenú al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) {
        setTramitesOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cerrar al cambiar de ruta
  useEffect(() => {
    setTramitesOpen(false);
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
              <Clock size={11} />Lun–Vie: 8:00 AM – 6:00 PM
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

            {/* Trámites — con megamenú */}
            <div className="relative" ref={megaRef}>
              <button
                onClick={() => setTramitesOpen(!tramitesOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tramitesOpen || isActive('/portal')
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                style={tramitesOpen || isActive('/portal') ? { backgroundColor: PRIMARY } : undefined}>
                <FileText size={14} />
                Trámites
                <ChevronDown size={13} className={`transition-transform ${tramitesOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Megamenú */}
              {tramitesOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[520px] bg-white rounded-2xl border border-gray-200 overflow-hidden"
                  style={{ boxShadow: '0 20px 60px -20px rgba(33,110,206,.30), 0 4px 16px -8px rgba(15,23,42,.12)' }}>

                  {/* Header del megamenú */}
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"
                    style={{ background: TINT }}>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Catálogo de Trámites</p>
                      <p className="text-xs text-gray-500 mt-0.5">Selecciona el trámite que necesitas</p>
                    </div>
                    <button
                      onClick={() => { navigate('/portal'); setTramitesOpen(false); }}
                      className="flex items-center gap-1 text-xs font-semibold hover:underline"
                      style={{ color: PRIMARY }}>
                      Ver todos <ArrowRight size={11} />
                    </button>
                  </div>

                  {/* Lista de trámites */}
                  <div className="grid grid-cols-2 gap-px bg-gray-100">
                    {TRAMITES_MENU.map((t, i) => (
                      <button key={i}
                        onClick={() => { navigate('/portal'); setTramitesOpen(false); }}
                        className="bg-white px-4 py-3 text-left hover:bg-blue-50 transition-colors group/item">
                        <p className="text-xs font-semibold text-gray-800 group-hover/item:text-blue-700 transition-colors leading-snug">
                          {t.nombre}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock size={9} />{t.plazo}
                          </span>
                          <span className="text-[10px] font-semibold" style={{ color: PRIMARY }}>{t.costo}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Footer del megamenú */}
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                    <span className="text-xs text-gray-500">¿No encuentras tu trámite?</span>
                    <button
                      onClick={() => { navigate('/portal'); setTramitesOpen(false); }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: PRIMARY }}>
                      Registrar trámite
                    </button>
                  </div>
                </div>
              )}
            </div>

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

          {/* Trámites expandible móvil */}
          <div>
            <button
              onClick={() => setTramitesOpen(!tramitesOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
              <span className="flex items-center gap-2"><FileText size={15} />Trámites</span>
              <ChevronDown size={14} className={`transition-transform ${tramitesOpen ? 'rotate-180' : ''}`} />
            </button>
            {tramitesOpen && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                {TRAMITES_MENU.map((t, i) => (
                  <button key={i}
                    onClick={() => { navigate('/portal'); setMenuOpen(false); setTramitesOpen(false); }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                    <p className="text-xs font-medium text-gray-700">{t.nombre}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t.plazo} · {t.costo}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

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