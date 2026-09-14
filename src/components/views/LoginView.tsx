import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { User } from '../../types/pbx';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('pbx@enlace.slz.br');
  const [password, setPassword] = useState('enlace123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          password: password.trim() 
        }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('enlace_jwt', data.token);
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.error || 'Credenciais inválidas');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor PBX.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-900/50 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Enlace <span className="text-blue-500">PBX</span></h1>
          <p className="text-sm font-medium text-slate-400 mt-1">Plataforma Enterprise de Comunicação e IA Asterisk 20</p>
        </div>

        <div className="bg-[#1e293b]/90 backdrop-blur-xl border border-slate-700/60 p-8 rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">Acesso Administrativo</h2>
            <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
              JWT v2.1
            </span>
          </div>

          {/* Quick Credential Helper Banner */}
          <div className="mb-5 p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl">
            <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Credenciais Padrão:</span>
              <span className="text-[10px] text-slate-400 font-mono">Pronto p/ Uso</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('pbx@enlace.slz.br', 'enlace123')}
                className="text-left px-2.5 py-1.5 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/40 rounded-lg text-white transition group"
              >
                <div className="font-bold text-[11px] text-blue-200 group-hover:text-blue-100">Super Admin</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">pbx@enlace.slz.br</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('carlos.silva@enlace.slz.br', 'enlace123')}
                className="text-left px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-white transition group"
              >
                <div className="font-bold text-[11px] text-slate-200 group-hover:text-white">Carlos Silva</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">carlos.silva@...</div>
              </button>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
              <span>Senha padrão: <strong className="text-white font-mono bg-slate-800 px-1 py-0.5 rounded">enlace123</strong></span>
              <button 
                type="button"
                onClick={() => handleQuickFill('pbx@enlace.slz.br', 'enlace123')} 
                className="text-blue-400 hover:text-blue-300 underline font-sans"
              >
                Auto-preencher
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold leading-relaxed animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                E-mail Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm font-mono"
                  placeholder="pbx@enlace.slz.br"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm font-mono"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center border-t border-slate-700/50 pt-4">
             <p className="text-[11px] text-slate-400 font-medium">Autenticação JWT • Criptografia TLS 1.3 • Asterisk 20</p>
          </div>
        </div>
      </div>
    </div>
  );
};
