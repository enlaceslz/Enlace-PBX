import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Loader2, ArrowRight, Eye, EyeOff, KeyRound, UserCheck } from 'lucide-react';
import { User } from '../../types/pbx';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

const DEMO_ACCOUNTS = [
  {
    roleLabel: 'Super Admin',
    email: 'admin@enlace.pbx',
    password: 'enlace123',
    desc: 'Acesso irrestrito a todo o PBX',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    roleLabel: 'Admin (slzenlace)',
    email: 'slzenlace@gmail.com',
    password: 'enlace123',
    desc: 'Conta de Administrador Master',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  {
    roleLabel: 'Supervisor',
    email: 'mariana.souza@enlacedigital.com.br',
    password: 'enlace123',
    desc: 'Filas, gravação e relatórios',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    roleLabel: 'Operador',
    email: 'lucas.barreto@enlacedigital.com.br',
    password: 'enlace123',
    desc: 'Webphone e fila de atendimento',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
];

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@enlace.pbx');
  const [password, setPassword] = useState('enlace123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const executeLogin = async (targetEmail: string, targetPass: string) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail.trim(), password: targetPass.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('enlace_jwt', data.token);
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor PBX. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  const selectAccount = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  };

  const handleQuickLogin = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    executeLogin(acc.email, acc.password);
  };

  return (
    <div className="min-h-screen bg-[#0b1329] flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-900/50 mb-4 ring-4 ring-blue-500/20">
            <ShieldCheck className="w-8 h-8 text-white" />
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
              <h2 className="text-lg font-bold text-white">Autenticação do Sistema</h2>
              <p className="text-xs text-slate-400 mt-0.5">Informe suas credenciais corporativas</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              PBX Online
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-bold text-rose-400">Falha de login:</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@enlace.pbx');
                  setPassword('enlace123');
                  setError('');
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline font-semibold cursor-pointer block"
              >
                Clique aqui para preencher credenciais padrão (admin@enlace.pbx / enlace123)
              </button>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                E-mail Corporativo ou Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0b1329] border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm"
                  placeholder="admin@enlace.pbx"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Senha de Acesso
                </label>
                <span className="text-[11px] text-slate-400 font-mono">Padrão: enlace123</span>
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
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-3 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Autenticando no PBX...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Access Demo Profiles */}
          <div className="mt-6 pt-5 border-t border-slate-700/60">
            <div className="flex items-center gap-1.5 mb-3">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Acesso Rápido com 1 Clique (Perfis de Demonstração)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  disabled={isLoading}
                  className="flex flex-col text-left p-2.5 rounded-xl bg-[#0b1329]/80 hover:bg-[#0b1329] border border-slate-700/70 hover:border-blue-500/60 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${acc.badgeClass}`}>
                      {acc.roleLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-blue-400 font-mono transition-colors">
                      Entrar →
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-300 truncate mt-1">
                    {acc.email}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {acc.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 text-center text-[11px] text-slate-400 font-mono">
            Ambiente Asterisk 20 LTS • Criptografia TLS 1.3 & JWT
          </div>
        </div>
      </div>
    </div>
  );
};
