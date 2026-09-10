import React from 'react';
import {
  Phone,
  Server,
  Sparkles,
  Shield,
  Activity,
  ChevronDown,
  Building2,
  Radio,
} from 'lucide-react';
import { Tenant, User } from '../types/pbx';

interface NavbarProps {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  onSelectTenant: (tenant: Tenant) => void;
  currentUser: User | null;
  activeCallsCount: number;
  onOpenWebphone: () => void;
  isWebphoneOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  tenants,
  currentTenant,
  onSelectTenant,
  currentUser,
  activeCallsCount,
  onOpenWebphone,
  isWebphoneOpen,
}) => {
  return (
    <header className="h-16 bg-slate-950 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Slogan */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-950/40 border border-emerald-400/30">
            <Phone className="w-5 h-5 text-slate-950 font-black fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-100 tracking-tight">
                Enlace<span className="text-emerald-400">-PBX</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                Asterisk 20 + Gemini
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Telefonia inteligente. Simples, aberta e brasileira.
            </p>
          </div>
        </div>

        {/* Asterisk Core & AI Health Badges */}
        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-800">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>Asterisk 20.17</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Gemini Live AI</span>
            <span className="text-[10px] text-cyan-400 font-semibold">Ativo</span>
          </div>

          {activeCallsCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 font-semibold animate-pulse">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>{activeCallsCount} {activeCallsCount === 1 ? 'chamada ativa' : 'chamadas ativas'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Multi-Tenant Switcher */}
        {tenants.length > 0 && (
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 transition">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[150px] truncate">{currentTenant?.name || 'Selecionar Tenant'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-xl py-1.5 hidden group-hover:block z-50">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                Alternar Empresa (Multi-Tenant)
              </div>
              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTenant(t)}
                  className={`w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-slate-800 transition ${
                    t.id === currentTenant?.id ? 'bg-emerald-950/40 text-emerald-300 font-medium' : 'text-slate-300'
                  }`}
                >
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">CNPJ: {t.cnpj}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Webphone Toggle Button */}
        <button
          onClick={onOpenWebphone}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
            isWebphoneOpen
              ? 'bg-emerald-500 text-slate-950 shadow-emerald-950'
              : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
          }`}
        >
          <Phone className="w-3.5 h-3.5 fill-current" />
          <span>Webphone</span>
        </button>

        {/* User Identity */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400">
            {currentUser?.name?.slice(0, 2).toUpperCase() || 'CH'}
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-semibold text-slate-200">{currentUser?.name || 'Administrador'}</div>
            <div className="text-[10px] text-emerald-400 font-mono capitalize">
              {currentUser?.role?.replace('_', ' ') || 'Super Admin'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
