import React, { useState } from 'react';
import {
  GitFork,
  ArrowRight,
  Bot,
  PhoneCall,
  Split,
  Plus,
  Radio,
  Clock,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Route, Trunk } from '../../types/pbx';

interface RoutesViewProps {
  routes: Route[];
  trunks: Trunk[];
  onRefresh: () => void;
}

export const RoutesView: React.FC<RoutesViewProps> = ({ routes, trunks, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('outbound');

  const filteredRoutes = routes.filter((r) => r.type === activeTab);

  const brazilianRulesHelper = [
    { pattern: '_9XXXXXXXX', desc: 'Celular Local (9 dígitos SP/Brasil)' },
    { pattern: '_[2-5]XXXXXXX', desc: 'Fixo Local (8 dígitos)' },
    { pattern: '_0XX9XXXXXXXX', desc: 'DDD Móvel Nacional (Ex: 011 98765-4321)' },
    { pattern: '_0XX[2-5]XXXXXXX', desc: 'DDD Fixo Nacional' },
    { pattern: '_0800XXXXXXX', desc: 'Chamadas Gratuitas 0800' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Rotas de Entrada e Saída (Dialplan)
            </h1>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              extensions.conf • Padrão E.164 Brasil
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Regras de discagem para operadoras nacionais, tratamento de DDD e direcionamento inteligente para IA Gemini.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 self-start">
          <button
            onClick={() => setActiveTab('outbound')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'outbound'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Rotas de Saída (Outbound)
          </button>
          <button
            onClick={() => setActiveTab('inbound')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'inbound'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Rotas de Entrada (DIDs)
          </button>
        </div>
      </div>

      {/* Rules Cheatsheet for Brazilian Dialing */}
      {activeTab === 'outbound' && (
        <div className="bg-white/60 rounded-2xl border border-slate-100 p-4">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 font-mono flex items-center gap-2">
            <GitFork className="w-3.5 h-3.5 text-blue-600" />
            Expressões Regulares do Dialplan Brasileiro:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
            {brazilianRulesHelper.map((rule, idx) => (
              <div key={idx} className="bg-slate-50 p-2 rounded-xl border border-slate-200/70 font-mono">
                <span className="text-blue-600 font-bold block">{rule.pattern}</span>
                <span className="text-[10px] text-slate-400 font-sans">{rule.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Routes List */}
      <div className="space-y-3">
        {filteredRoutes.map((route) => (
          <div
            key={route.id}
            className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-blue-600 font-mono text-xs">
                P{route.priority}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800">{route.name}</h3>
                  <span className="font-mono text-[11px] text-blue-600 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                    {route.pattern}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  {route.type === 'outbound' ? (
                    <span>
                      Tronco de Saída:{' '}
                      <strong className="text-slate-700">
                        {trunks.find((t) => t.id === route.trunkId)?.name || 'Padrão'}
                      </strong>
                    </span>
                  ) : (
                    <span>
                      Destino de Entrada:{' '}
                      <strong className="text-slate-700 uppercase">{route.destinationType}</strong>
                    </span>
                  )}
                  {route.prefixRemove && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Remove Prefixo: {route.prefixRemove}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Target Destination & Fallback */}
            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <div className="font-mono text-slate-700 flex items-center gap-1.5 justify-end">
                  <span>Destino:</span>
                  {route.destinationType === 'ai_agent' ? (
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-sans font-bold flex items-center gap-1">
                      <Bot className="w-3 h-3 text-teal-600" /> MaIA (Gemini IA)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                      {route.destinationId}
                    </span>
                  )}
                </div>
                {route.fallbackType && (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Fallback: Transbordo para {route.fallbackType} ({route.fallbackTarget})
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
