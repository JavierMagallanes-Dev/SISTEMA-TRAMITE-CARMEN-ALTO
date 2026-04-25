// src/pages/HomePage.tsx
// Página de inicio de la Municipalidad de Carmen Alto.
// Landing page limpia antes del portal ciudadano.

import { useNavigate } from 'react-router-dom';
import logoCA          from '../assets/logoCA.webp';
import headerCA        from '../assets/headerCA.webp';
import { Search, FileText, ArrowRight, Phone, MapPin, Clock } from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
  const navigate            = useNavigate();
  const [codigo, setCodigo] = useState('');

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoCA} alt="Logo Municipalidad Carmen Alto" className="w-10 h-10 object-contain" />
            <div>
              <p className="text-xs font-bold text-gray-900 leading-tight">Municipalidad Distrital</p>
              <p className="text-xs font-bold text-blue-700 leading-tight">de Carmen Alto</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-gray-500 hover:text-blue-600 font-medium transition-colors"
          >
            Acceso personal →
          </button>
        </div>
      </nav>

      {/* ── Hero con imagen header ──────────────────────────── */}
      <div className="relative h-56 sm:h-72 overflow-hidden">
        <img
          src={headerCA}
          alt="Municipalidad Carmen Alto"
          className="w-full h-full object-cover"
        />
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-linear-to-t from-blue-900/70 via-blue-800/30 to-transparent" />

        {/* Texto sobre la imagen */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <div className="max-w-5xl mx-auto">
            <p className="text-white/80 text-xs font-medium mb-1 sm:text-sm">
              Municipalidad Distrital de Carmen Alto
            </p>
            <h1 className="text-white text-xl font-bold leading-tight sm:text-3xl">
              Portal de Trámites<br className="sm:hidden" /> Documentarios
            </h1>
          </div>
        </div>
      </div>

      {/* ── Contenido principal ─────────────────────────────── */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8 sm:px-8 sm:py-12">

        {/* Consulta rápida */}
        <div className="bg-blue-600 rounded-2xl p-5 sm:p-8">
          <h2 className="text-white font-bold text-base mb-1 sm:text-lg">
            Consulta el estado de tu trámite
          </h2>
          <p className="text-blue-100 text-xs mb-4 sm:text-sm">
            Ingresa tu código de expediente para ver el avance
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <input
              type="text"
              placeholder="EXP-2026-000001"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && codigo && navigate(`/consulta/${codigo}`)}
              className="flex-1 px-4 py-2.5 rounded-lg text-gray-900 text-sm outline-none font-mono"
            />
            <button
              onClick={() => codigo && navigate(`/consulta/${codigo}`)}
              className="bg-white text-blue-600 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors"
            >
              <Search size={15} />Consultar
            </button>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Registrar trámite */}
          <button
            onClick={() => navigate('/portal')}
            className="group bg-white border-2 border-gray-200 rounded-2xl p-6 text-left hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
              <FileText size={22} className="text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Registrar trámite</h3>
            <p className="text-sm text-gray-500 mb-4">
              Inicia tu solicitud en línea y recibe tu código de expediente al instante.
            </p>
            <span className="flex items-center gap-1 text-sm text-blue-600 font-medium group-hover:gap-2 transition-all">
              Iniciar ahora <ArrowRight size={15} />
            </span>
          </button>

          {/* Consultar estado */}
          <button
            onClick={() => navigate('/consulta')}
            className="group bg-white border-2 border-gray-200 rounded-2xl p-6 text-left hover:border-green-500 hover:shadow-md transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center mb-4 group-hover:bg-green-600 transition-colors">
              <Search size={22} className="text-green-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Ver estado de trámite</h3>
            <p className="text-sm text-gray-500 mb-4">
              Consulta en qué etapa se encuentra tu expediente y descarga tu documento.
            </p>
            <span className="flex items-center gap-1 text-sm text-green-600 font-medium group-hover:gap-2 transition-all">
              Consultar <ArrowRight size={15} />
            </span>
          </button>
        </div>

        {/* Información de contacto */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Información de atención
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Clock size={15} className="text-gray-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Horario de atención</p>
                <p className="text-xs text-gray-500">Lun – Vie: 8:00 am – 4:00 pm</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <MapPin size={15} className="text-gray-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Dirección</p>
                <p className="text-xs text-gray-500">Carmen Alto, Huamanga, Ayacucho</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Phone size={15} className="text-gray-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Contacto</p>
                <p className="text-xs text-gray-500">Mesa de Partes: (066) 000-000</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 px-4 py-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-1 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <img src={logoCA} alt="Logo" className="w-6 h-6 object-contain opacity-60" />
            <p className="text-xs text-gray-400">Municipalidad Distrital de Carmen Alto</p>
          </div>
          <p className="text-xs text-gray-400">© 2026 · Sistema de Trámite Documentario</p>
        </div>
      </footer>

    </div>
  );
}