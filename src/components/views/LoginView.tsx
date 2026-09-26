import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { User } from '../../types/pbx';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@enlace.slz.br');
  const [password, setPassword] = useState('Enlace@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Por favor, informe o e-mail e a senha.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('enlace_jwt', data.token);
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch {
      setError('Erro de conexão com o servidor PBX. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1e] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-4 shadow-lg shadow-blue-500/5">
            <img
              src="/logo.svg"
              alt="Enlace PBX"
              className="w-12 h-12 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <ShieldCheck className="w-10 h-10 text-blue-400 hidden" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Enlace <span className="text-blue-500">PBX</span>
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-1">
            Plataforma Enterprise de Telefonia IP e Inteligência Artificial
          </p>
        </div>

        <div className="bg-[#15203b]/90 backdrop-blur-xl border border-slate-700/60 p-6 sm:p-8 rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-700/60">
            <div>
              <h2 className="text-lg font-bold text-white">Autenticação Corporativa</h2>
              <p className="text-xs text-slate-400 mt-0.5">Acesso restrito por credencial criptografada</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              PBX Online
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium space-y-1">
              <div className="flex items-start gap-2">
                <span className="font-bold text-rose-400">Falha de autenticação:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="mb-5 p-3 bg-blue-950/60 border border-blue-500/30 rounded-xl flex items-center justify-between text-xs text-blue-200">
            <div>
              <span className="font-semibold text-white">Acesso Master: </span>
              <span className="font-mono text-blue-300">admin@enlace.slz.br</span> / <span className="font-mono text-blue-300">Enlace@2026!</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@enlace.slz.br');
                setPassword('Enlace@2026!');
              }}
              className="text-[11px] font-bold text-blue-400 hover:text-white px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/60 rounded-lg transition cursor-pointer"
            >
              Preencher
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                E-mail Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0b1329] border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm"
                  placeholder="admin@enlace.slz.br"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b1329] border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm"
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-[11px] text-slate-400 font-mono">
            Autenticação Baseada em PostgreSQL • Criptografia bcrypt & JWT
          </div>
        </div>
      </div>
    </div>
  );
};
