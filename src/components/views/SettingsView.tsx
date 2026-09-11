import React, { useState } from 'react';
import { 
  Settings, Clock, Music, Route, Shield, HardDrive, Bell, CheckCircle2, Search, ArrowUpRight, Save, Play, Upload, Plus, Bot, Network
} from 'lucide-react';

interface SettingsViewProps {
  onNavigate?: (view: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'business_hours' | 'media' | 'routing' | 'preferences'>('business_hours');

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600 fill-blue-600" />
            Configurações Globais
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Gestão de horários de atendimento, arquivos de áudio, roteamento DIDs e preferências da conta.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-md shadow-blue-600/20">
              <Save className="w-4 h-4" /> Salvar Configurações
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sub Navigation Sidebar */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2">Regras de Negócio</div>
          
          <button
            onClick={() => setActiveTab('business_hours')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              activeTab === 'business_hours'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" /> Horários (SLA)
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('media')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              activeTab === 'media'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5" /> Áudios & Prompts
            </div>
          </button>

          <button
            onClick={() => setActiveTab('routing')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              activeTab === 'routing'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Route className="w-5 h-5" /> Roteamento DID
            </div>
          </button>

          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-6 mb-2 px-2">Usuário Atual</div>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group ${
              activeTab === 'preferences'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5" /> Minha Conta
            </div>
          </button>

          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-4 mb-2 px-2">Infraestrutura</div>

          {onNavigate && (
            <button
              onClick={() => onNavigate('network_security')}
              className="px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
            >
              <div className="flex items-center gap-3">
                <Network className="w-5 h-5 text-blue-600" /> Redes &amp; Fail2ban
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </button>
          )}
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">

          {/* 1. BUSINESS HOURS TAB */}
          {activeTab === 'business_hours' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Janelas de Atendimento</h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-1">Defina quando sua central telefônica está operando ativamente.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'].map((day) => (
                    <div key={day} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-4 w-1/3">
                        <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                        <span className="text-sm font-bold text-slate-700">{day}</span>
                      </div>
                      <div className="flex items-center gap-3 w-1/3 justify-center">
                        <input type="time" defaultValue="08:00" className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-mono text-slate-700 bg-white" />
                        <span className="text-slate-400">até</span>
                        <input type="time" defaultValue="18:00" className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-mono text-slate-700 bg-white" />
                      </div>
                      <div className="w-1/3 flex justify-end">
                         <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wider">Aberto</span>
                      </div>
                    </div>
                  ))}
                  
                  {['Sábado', 'Domingo'].map((day) => (
                    <div key={day} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 opacity-60">
                      <div className="flex items-center gap-4 w-1/3">
                        <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                        <span className="text-sm font-bold text-slate-700">{day}</span>
                      </div>
                      <div className="flex items-center gap-3 w-1/3 justify-center">
                        <input type="time" disabled defaultValue="--:--" className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-mono text-slate-400 bg-slate-100" />
                        <span className="text-slate-400">até</span>
                        <input type="time" disabled defaultValue="--:--" className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-mono text-slate-400 bg-slate-100" />
                      </div>
                      <div className="w-1/3 flex justify-end">
                         <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-[10px] font-bold uppercase tracking-wider">Fechado</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Ação Fora do Horário</h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-1">O que acontece quando o cliente liga fora do expediente?</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border-2 border-blue-600 bg-blue-50/50 rounded-xl cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                       <Bot className="w-5 h-5 text-blue-600" />
                       <span className="text-sm font-bold text-blue-900">Agente de IA (MaIA)</span>
                    </div>
                    <p className="text-[10px] text-blue-700 font-medium">A IA atende, tira dúvidas e anota recados.</p>
                  </div>
                  <div className="p-4 border border-slate-200 bg-white rounded-xl cursor-pointer hover:border-slate-300">
                    <div className="flex items-center gap-3 mb-2">
                       <Music className="w-5 h-5 text-slate-600" />
                       <span className="text-sm font-bold text-slate-700">Tocar Áudio de Fechado</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Reproduz aviso de "Estamos fechados" e desliga.</p>
                  </div>
                  <div className="p-4 border border-slate-200 bg-white rounded-xl cursor-pointer hover:border-slate-300">
                    <div className="flex items-center gap-3 mb-2">
                       <HardDrive className="w-5 h-5 text-slate-600" />
                       <span className="text-sm font-bold text-slate-700">Caixa Postal (Voicemail)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Grava recado e envia por e-mail para os gestores.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. MEDIA TAB */}
          {activeTab === 'media' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Gerenciador de Mídia (.wav, .ulaw)</h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-1">Áudios para URA, Música em Espera (MoH) e avisos institucionales.</p>
                  </div>
                  <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload de Arquivo
                  </button>
                </div>
                
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-3 px-3">Nome do Arquivo</th>
                      <th className="py-3 px-3">Categoria</th>
                      <th className="py-3 px-3">Duração</th>
                      <th className="py-3 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {[
                      { name: 'ura_principal.wav', cat: 'URA (IVR)', dur: '0:14' },
                      { name: 'aviso_fechado.wav', cat: 'Aviso', dur: '0:08' },
                      { name: 'bossa_nova_hold.ulaw', cat: 'MoH (Espera)', dur: '4:20' }
                    ].map((file, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-3 font-mono font-bold text-slate-900">{file.name}</td>
                        <td className="py-4 px-3">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 text-[10px] font-bold uppercase">{file.cat}</span>
                        </td>
                        <td className="py-4 px-3 font-mono text-slate-500">{file.dur}</td>
                        <td className="py-4 px-3 text-right flex items-center justify-end gap-2">
                           <button className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition"><Play className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}

          {/* 3. ROUTING TAB */}
          {activeTab === 'routing' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">Roteamento de Entrada (Inbound)</h3>
                    <p className="text-[11px] font-medium text-slate-500 mt-1">Mapeamento de números DID externos para destinos internos no Asterisk.</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-2 border border-blue-200">
                    <Plus className="w-4 h-4" /> Nova Rota
                  </button>
                </div>

                <div className="space-y-3">
                   {[
                     { did: '0800-555-1234', desc: 'Linha Nacional de Suporte', dest: 'URA: Atendimento Principal' },
                     { did: '11-4004-9090', desc: 'Vendas SP', dest: 'Fila: Comercial (Ringall)' },
                     { did: 'Qualquer (ANY)', desc: 'Padrão / Catch-all', dest: 'IA: Agente Recepcionista' }
                   ].map((route, i) => (
                     <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between group hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center font-mono font-bold text-slate-900 shadow-sm">
                             DID
                           </div>
                           <div>
                             <div className="font-black text-slate-800 text-sm">{route.did}</div>
                             <div className="text-[11px] text-slate-500 mt-0.5">{route.desc}</div>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <Route className="w-5 h-5 text-slate-300" />
                           <div className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold">
                             Destino: {route.dest}
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
            </div>
          )}

          {/* 4. PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-inner">
                    AD
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Administrador Enlace</h3>
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Super Admin • admin@enlace.pbx</p>
                  </div>
                </div>

                <div className="space-y-5">
                   <div>
                     <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tema do Sistema</label>
                     <div className="flex items-center gap-3">
                        <button className="flex-1 py-3 border-2 border-blue-600 bg-blue-50 text-blue-700 font-bold rounded-xl text-sm">Claro (Padrão)</button>
                        <button className="flex-1 py-3 border border-slate-200 bg-slate-50 text-slate-500 font-bold rounded-xl text-sm">Escuro (NOC)</button>
                     </div>
                   </div>

                   {/* Identidade Visual & Logotipos Oficiais */}
                   <div className="pt-4 border-t border-slate-100">
                     <div className="flex items-center justify-between mb-3">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                         Logotipos Oficiais do Sistema (Ativos &amp; Validados)
                       </label>
                       <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                         <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sincronizados
                       </span>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {/* Logo 1: Horizontal Navbar & Relatórios */}
                       <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-sm transition">
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-xs font-bold text-slate-800">1. Logo Principal</span>
                           <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Horizontal</span>
                         </div>
                         <div className="h-16 flex items-center justify-center p-2 bg-white rounded-xl border border-slate-200/80 mb-2">
                           <img src="/logo.png" alt="Logo Principal Enlace" className="max-h-12 w-auto object-contain" />
                         </div>
                         <p className="text-[10px] text-slate-500 mb-2">Barra superior, relatórios e faturas PDF.</p>
                         <div className="flex items-center gap-2">
                           <a href="/logo.png" download="enlace-pbx-logo.png" className="text-[10px] font-bold text-blue-600 hover:underline">PNG</a>
                           <span className="text-slate-300">•</span>
                           <a href="/logo.svg" download="enlace-pbx-logo.svg" className="text-[10px] font-bold text-blue-600 hover:underline">SVG</a>
                         </div>
                       </div>

                       {/* Logo 2: Símbolo / Ícone Enlace */}
                       <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-sm transition">
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-xs font-bold text-slate-800">2. Símbolo / Ícone</span>
                           <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Squircle</span>
                         </div>
                         <div className="h-16 flex items-center justify-center p-2 bg-white rounded-xl border border-slate-200/80 mb-2">
                           <img src="/logo-icon.png" alt="Símbolo Enlace" className="max-h-12 w-auto object-contain" />
                         </div>
                         <p className="text-[10px] text-slate-500 mb-2">Menu lateral, Webphone, PWA e favicon.</p>
                         <div className="flex items-center gap-2">
                           <a href="/logo-icon.png" download="enlace-icon.png" className="text-[10px] font-bold text-blue-600 hover:underline">PNG</a>
                           <span className="text-slate-300">•</span>
                           <a href="/logo-icon.svg" download="enlace-icon.svg" className="text-[10px] font-bold text-blue-600 hover:underline">SVG</a>
                         </div>
                       </div>
                     </div>
                   </div>

                   <div>
                     <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Siga-me (Call Forwarding)</label>
                     <div className="flex items-center gap-3">
                        <input type="text" placeholder="Ex: 11999998888" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm focus:outline-none focus:border-blue-500" />
                        <button className="px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm border border-slate-200">Ativar Desvio</button>
                     </div>
                   </div>

                   <div>
                     <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Notificações</label>
                     <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer">
                          <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                          <span className="text-sm font-semibold text-slate-700">Receber alertas de queda de SIP Trunk (E-mail)</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer">
                          <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                          <span className="text-sm font-semibold text-slate-700">Notificar quando o SLA das filas for violado</span>
                        </label>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
