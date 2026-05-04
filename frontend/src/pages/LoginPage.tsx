// src/pages/LoginPage.tsx
// Login del Sistema de Trámite Documentario · Carmen Alto
// Split-screen sobrio gobierno peruano. Lógica del backend INTACTA.

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate }  from 'react-router-dom';
import { useAuth }      from '../context/AuthContext';
import Input            from '../components/ui/Input';
import Button           from '../components/ui/Button';
import Alert            from '../components/ui/Alert';
import {
  LogIn, Mail, Lock, Eye, EyeOff,
} from 'lucide-react';
import logoCA   from '../assets/logoCA.webp';
import headerCA from '../assets/headerCA.webp';

const PRIMARY = '#216ece';
const ACCENT  = '#4abdef';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [showPass, setShowPass] = useState<boolean>(false);

  const { login, cargando } = useAuth();
  const navigate            = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Completa todos los campos.');
      return;
    }

    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.error ?? 'Credenciales incorrectas. Verifica e intenta de nuevo.'
      );
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* ═══════ Panel izquierdo · branding (lg+) ═══════ */}
      <aside
        className="hidden lg:flex lg:w-[44%] xl:w-[48%] relative overflow-hidden flex-col"
        style={{ backgroundColor: PRIMARY }}
      >
        {/* Imagen header con overlay */}
        <img
          src={headerCA}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, #143f7a 0%, ${PRIMARY} 50%, ${ACCENT} 130%)`,
            opacity: 0.92,
          }}
        />

        {/* Logo top */}
        <div className="relative z-10 p-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-white/95 flex items-center justify-center overflow-hidden">
            <img src={logoCA} alt="Logo Municipalidad Carmen Alto" className="w-9 h-9 object-contain" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
              Cuna de los legendarios arrieros
            </p>
            <p className="text-sm font-bold text-white">
              Municipalidad Distrital de Carmen Alto
            </p>
          </div>
        </div>

        {/* Texto central */}
        <div className="relative z-10 flex-1 flex items-center px-10">
          <div className="max-w-md">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 mb-3">
              Plataforma oficial
            </p>
            <h2 className="text-3xl font-bold text-white leading-tight mb-4">
              Gestión documentaria<br />transparente y trazable
            </h2>
            <p className="text-sm text-white/80 leading-relaxed mb-8">
              Sistema oficial de trámite documentario de la Municipalidad Distrital de Carmen Alto.
              Registra, deriva y resuelve expedientes con seguimiento en tiempo real.
            </p>

            
          </div>
        </div>

        <div className="relative z-10 px-10 py-6 border-t border-white/10">
          <p className="text-[11px] text-white/55">
            Carmen Alto, Huamanga · Ayacucho · Perú
          </p>
        </div>
      </aside>

      {/* ═══════ Panel derecho · formulario ═══════ */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Header del card */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-gray-200 shadow-sm mb-4 overflow-hidden">
              <img src={logoCA} alt="Logo Carmen Alto" className="w-12 h-12 object-contain" />
            </div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{ color: PRIMARY }}
            >
              Acceso Personal
            </p>
            <h1 className="text-xl font-bold text-gray-900 mt-1">
              Sistema de Trámite Documentario
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Ingresa con tu correo institucional para continuar
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert
                type="error"
                message={error}
                onClose={() => setError('')}
              />
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Correo institucional
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Mail size={16} />
                </span>
                <Input
                  type="email"
                  placeholder="usuario@carmenalto.gob.pe"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Contraseña</label>
              
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Lock size={16} />
                </span>
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={cargando}
              icon={<LogIn size={16} />}
              className="w-full justify-center mt-2"
            >
              Ingresar al sistema
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">o</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Portal ciudadano */}
            <a
              href="/portal"
              className="block text-center py-2.5 rounded-lg text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-700"
            >
              Soy ciudadano · Ir al Portal de Trámites
            </a>
          </form>

          {/* Aviso de seguridad */}
          

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2026 Municipalidad Distrital de Carmen Alto
          </p>
        </div>
      </main>
    </div>
  );
}
