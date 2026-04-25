// src/pages/HomePage.tsx
// Página de inicio de la Municipalidad Distrital de Carmen Alto.
// Landing pública con sección «¿Cómo realizar tu trámite en línea?» (timeline sobrio).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoCA   from '../assets/logoCA.webp';
import headerCA from '../assets/headerCA.webp';
import {
  Search, FileText, ArrowRight,
  Phone, MapPin, Clock,
  UserPlus, Wallet, Activity, Download,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Definición de los 4 pasos ────────────────────────────────────────
interface Paso {
  n:      1 | 2 | 3 | 4;
  titulo: string;
  desc:   string;
  Icon:   LucideIcon;
}

const PASOS: readonly Paso[] = [
  {
    n: 1,
    titulo: 'Regístrate en el portal',
    desc:   'Ingresa tus datos, elige el trámite y obtén tu código de expediente al instante.',
    Icon:   UserPlus,
  },
  {
    n: 2,
    titulo: 'Paga en ventanilla',
    desc:   'Acércate a la caja municipal con tu código y realiza el pago para activar el trámite.',
    Icon:   Wallet,
  },
  {
    n: 3,
    titulo: 'Seguimiento en línea',
    desc:   'Consulta el avance de tu expediente en tiempo real desde cualquier dispositivo.',
    Icon:   Activity,
  },
  {
    n: 4,
    titulo: 'Descarga tu documento',
    desc:   'Cuando esté firmado, descarga el resultado oficial directamente desde el portal.',
    Icon:   Download,
  },
] as const;

// ── Sección «¿Cómo realizar tu trámite?» — timeline sobrio ───────────
function ComoRealizarTramite() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-8 sm:py-14">
        {/* Encabezado */}
        <div className="mb-8 sm:mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#216ece' }}>
            Guía rápida
          </p>
          <h2 className="text-xl font-bold text-gray-900 leading-tight sm:text-2xl">
            ¿Cómo realizar tu trámite en línea?
          </h2>
          <p className="text-sm text-gray-500 mt-1 sm:text-base max-w-2xl">
            En cuatro pasos sencillos puedes registrar tu solicitud, pagar y descargar tu documento sin volver a la municipalidad.
          </p>
        </div>

        {/* Timeline horizontal en desktop, vertical en móvil */}
        <div className="relative">
          {/* Conector horizontal punteado (sólo lg+) */}
          <div
            className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5"
            style={{
              backgroundImage: 'radial-gradient(circle, #216ece 1.5px, transparent 1.5px)',
              backgroundSize:  '10px 4px',
              backgroundRepeat: 'repeat-x',
              backgroundPosition: 'center',
            }}
            aria-hidden="true"
          />

          <ol className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-4">
            {PASOS.map(({ n, titulo, desc, Icon }) => (
              <li key={n} className="relative flex gap-4 lg:flex-col lg:items-start lg:gap-3">
                {/* Conector vertical punteado (móvil/tablet) */}
                {n < 4 && (
                  <span
                    className="lg:hidden absolute left-[27px] top-14 bottom-[-1.5rem] w-0.5 border-l-2 border-dashed"
                    style={{ borderColor: 'rgba(33, 110, 206, 0.3)' }}
                    aria-hidden="true"
                  />
                )}

                {/* Círculo numerado */}
                <div className="relative shrink-0">
                  <div
                    className="w-14 h-14 rounded-full bg-white border-2 flex items-center justify-center shadow-sm"
                    style={{ borderColor: '#216ece' }}
                  >
                    <span className="font-bold text-xl" style={{ color: '#216ece' }}>{n}</span>
                  </div>
                  <div
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: '#216ece' }}
                  >
                    <Icon size={12} strokeWidth={2.5} />
                  </div>
                </div>

                {/* Texto */}
                <div className="flex-1 pt-1 lg:pt-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Paso {n}
                  </p>
                  <h3 className="text-sm font-bold text-gray-900 sm:text-base">{titulo}</h3>
                  <p className="text-xs text-gray-500 mt-1 sm:text-sm leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Nota legal de gobierno digital */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#eaf2fb' }}
          >
            <Clock size={14} style={{ color: '#216ece' }} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700">Atención 24/7 en línea</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Puedes registrar y consultar tus trámites en cualquier momento. El pago en ventanilla se realiza en horario de oficina.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Componente principal ─────────────────────────────────────────────
export default function HomePage() {
  const navigate            = useNavigate();
  const [codigo, setCodigo] = useState<string>('');

  const irAConsulta = () => {
    if (codigo) navigate(`/consulta/${codigo}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoCA} alt="Logo Municipalidad Carmen Alto" className="w-10 h-10 object-contain" />
            <div>
              <p className="text-xs font-bold text-gray-900 leading-tight">Municipalidad Distrital</p>
              <p className="text-xs font-bold leading-tight" style={{ color: '#216ece' }}>de Carmen Alto</p>
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
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(20,63,122,0.78) 0%, rgba(33,110,206,0.35) 50%, transparent 100%)' }}
        />
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
        <div
          className="rounded-2xl p-5 sm:p-8"
          style={{ background: 'linear-gradient(135deg, #216ece 0%, #4abdef 130%)' }}
        >
          <h2 className="text-white font-bold text-base mb-1 sm:text-lg">
            Consulta el estado de tu trámite
          </h2>
          <p className="text-white/80 text-xs mb-4 sm:text-sm">
            Ingresa tu código de expediente para ver el avance
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <input
              type="text"
              placeholder="EXP-2026-000001"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && irAConsulta()}
              className="flex-1 px-4 py-2.5 rounded-lg text-gray-900 text-sm outline-none font-mono"
            />
            <button
              onClick={irAConsulta}
              className="bg-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-blue-50 flex items-center justify-center gap-2 transition-colors"
              style={{ color: '#216ece' }}
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
            className="group bg-white border-2 border-gray-200 rounded-2xl p-6 text-left hover:shadow-md transition-all"
            style={{ borderColor: undefined }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#216ece')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors"
                 style={{ backgroundColor: '#eaf2fb' }}>
              <FileText size={22} style={{ color: '#216ece' }} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Registrar trámite</h3>
            <p className="text-sm text-gray-500 mb-4">
              Inicia tu solicitud en línea y recibe tu código de expediente al instante.
            </p>
            <span className="flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all"
                  style={{ color: '#216ece' }}>
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
      </div>

      {/* ── ⭐ Sección «¿Cómo realizar tu trámite en línea?» ── */}
      <ComoRealizarTramite />

      {/* ── Información de atención ─────────────────────────── */}
      <div className="max-w-5xl mx-auto w-full px-4 py-6 sm:px-8 sm:py-8 border-t border-gray-100">
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
