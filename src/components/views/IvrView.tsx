import React from 'react';
import {
  PhoneCall,
  Volume2,
  Bot,
  Layers,
  Split,
  Phone,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Ivr } from '../../types/pbx';

interface IvrViewProps {
  ivrs: Ivr[];
  onOpenWebphone: (number: string) => void;
}

export const IvrView: React.FC<IvrViewProps> = ({ ivrs, onOpenWebphone }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-100 tracking-tight">
              URAs de Atendimento (IVR)
            </h1>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              Asterisk Menus • DTMF Interativo
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Menus audíveis automáticos com captura DTMF, transbordo inteligente e roteamento para Agentes de IA.
          </p>
        </div>

        <button
          onClick={() => onOpenWebphone('6001')}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
        >
          <Phone className="w-3.5 h-3.5" />
          Ouvir e Testar URA (6001)
        </button>
      </div>

      {/* IVR List */}
      <div className="space-y-6">
        {ivrs.map((ivr) => (
          <div
            key={ivr.id}
            className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono">
                  {ivr.number}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">{ivr.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                      Áudio: <code className="text-slate-300 font-mono">{ivr.audioPrompt}</code>
                    </span>
                    <span>•</span>
                    <span>Timeout: {ivr.timeoutSeconds}s</span>
                    <span>•</span>
                    <span>Tentativas: {ivr.invalidRetries}x</span>
                  </div>
                </div>
              </div>

              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-3 py-1 rounded-xl self-start">
                Contexto: ivr-{ivr.number}
              </span>
            </div>

            {/* Menu Options Flow */}
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Mapeamento das Teclas Numéricas (DTMF):
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ivr.options.map((opt) => (
                  <div
                    key={opt.digit}
                    className={`p-3 rounded-xl border flex items-center justify-between transition ${
                      opt.destinationType === 'ai_agent'
                        ? 'bg-cyan-950/30 border-cyan-800/60'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-black text-slate-100 text-sm border border-slate-700">
                        {opt.digit}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 text-xs">{opt.label}</div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          Tipo: {opt.destinationType.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    <div>
                      {opt.destinationType === 'ai_agent' ? (
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                          <Bot className="w-3 h-3 text-cyan-400" /> Gemini
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                          {opt.destinationTarget}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
