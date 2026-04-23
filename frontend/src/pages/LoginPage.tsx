// src/pages/LoginPage.tsx

import { useState }       from 'react';
import { useNavigate }    from 'react-router-dom';
import { useAuth }        from '../context/AuthContext';
import Input              from '../components/ui/Input';
import Button             from '../components/ui/Button';
import Alert              from '../components/ui/Alert';
import { LogIn, Building2 } from 'lucide-react';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  const { login, cargando } = useAuth();
  const navigate            = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card login */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white mb-4">
              <Building2 size={26} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Municipalidad Distrital
            </h1>
            <p className="text-blue-600 font-semibold text-sm">Carmen Alto</p>
            <p className="text-gray-400 text-xs mt-1">
              Sistema de Trámite Documentario
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

            <Input
              label="Correo institucional"
              type="email"
              placeholder="usuario@carmenalto.gob.pe"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

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
          </form>

          {/* Link portal ciudadano */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-2">¿Eres ciudadano?</p>
            <a
              href="/portal"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ir al Portal de Trámites →
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © 2026 Municipalidad Distrital de Carmen Alto
        </p>
      </div>
    </div>
  );
}