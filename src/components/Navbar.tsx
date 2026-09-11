import React, { useState } from 'react';
import {
  Phone,
  Server,
  Sparkles,
  Shield,
  Activity,
  ChevronDown,
  Building2,
  Radio,
  Menu,
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
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tenants,
  currentTenant,
  onSelectTenant,
  currentUser,
  activeCallsCount,
  onOpenWebphone,
  isWebphoneOpen,
  onToggleMobileMenu,
}) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="h-16 bg-slate-50 border-b border-slate-200 shadow-sm px-4 md:px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Slogan */}
      <div className="flex items-center gap-4">
        {onToggleMobileMenu && (
          <button 
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          {!logoError ? (
            <img 
              src="/logo.svg" 
              alt="Enlace PBX Logo" 
              className="h-11 w-auto max-w-[190px] object-contain cursor-pointer" 
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-600/20 border border-sky-400/30">
                <Phone className="w-5 h-5 text-white font-black fill-slate-950" />
              </div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                Enlace<span className="text-blue-600">-PBX</span>
              </span>
            </div>
          )}
          <div className="hidden sm:block">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              Asterisk 20 + Gemini
            </span>
          </div>
        </div>

        {/* Asterisk Core & AI Health Badges */}
        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 font-mono">
            <Server className="w-3.5 h-3.5 text-blue-600" />
            <span>Asterisk 20.17</span>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse ml-1" />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Gemini Live AI</span>
            <span className="text-[10px] text-teal-600 font-semibold">Ativo</span>
          </div>

          {activeCallsCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 font-semibold animate-pulse">
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              <span>{activeCallsCount} {activeCallsCount === 1 ? 'chamada ativa' : 'chamadas ativas'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Multi-Tenant Switcher */}
        {tenants.length > 0 && (
          <div className="relative group hidden sm:block">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="max-w-[150px] truncate">{currentTenant?.name || 'Selecionar Tenant'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 hidden group-hover:block z-50">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                Alternar Empresa (Multi-Tenant)
              </div>
              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTenant(t)}
                  className={`w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-slate-50 transition ${
                    t.id === currentTenant?.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                  }`}
                >
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">CNPJ: {t.cnpj}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="hidden md:flex items-center gap-1.5 mr-2">
           <a href="https://enlace.slz.br" target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[9px] font-black uppercase text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-colors">
             Open Source by Enlace
           </a>
        </div>
        {/* Webphone Toggle Button */}
        <button
          onClick={onOpenWebphone}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
            isWebphoneOpen
              ? 'bg-blue-600 text-white shadow-blue-600/30'
              : 'bg-blue-600/15 border border-sky-500/40 text-blue-700 hover:bg-blue-600/25'
          }`}
        >
          <Phone className="w-3.5 h-3.5 fill-current" />
          <span>Webphone</span>
        </button>

        {/* User Identity */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-blue-600">
            {currentUser?.name?.slice(0, 2).toUpperCase() || 'CH'}
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-semibold text-slate-700">{currentUser?.name || 'Administrador'}</div>
            <div className="text-[10px] text-blue-600 font-mono capitalize">
              {currentUser?.role?.replace('_', ' ') || 'Super Admin'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
