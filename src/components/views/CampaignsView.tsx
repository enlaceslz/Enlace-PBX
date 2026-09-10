import React, { useState, useEffect } from 'react';
import { Megaphone, Play, Pause, BarChart, Users, Bot, PhoneCall, CheckCircle2, AlertTriangle, Plus, Settings, TrendingUp, PhoneForwarded, BarChart3, Activity, Zap } from 'lucide-react';

interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  type: 'predictive' | 'power_dialer' | 'ai_voicebot';
  status: 'draft' | 'running' | 'paused' | 'completed';
  aiAgentId?: string;
  totalLeads: number;
  processedLeads: number;
  successCount: number;
  activeCalls: number;
  createdAt: string;
}

export const CampaignsView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/v1/campaigns');
      const data = await res.json();
      setCampaigns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(() => {
      // Simulate real-time lead processing for running campaigns
      setCampaigns(prev => prev.map(c => {
        if (c.status === 'running' && c.processedLeads < c.totalLeads) {
          return {
            ...c,
            processedLeads: Math.min(c.totalLeads, c.processedLeads + Math.floor(Math.random() * 3) + 1),
            successCount: c.successCount + (Math.random() > 0.6 ? 1 : 0),
            activeCalls: c.type === 'ai_voicebot' ? 12 + Math.floor(Math.random() * 5) : 3 + Math.floor(Math.random() * 4)
          };
        }
        return c;
      }));
    }, 2500);
    
    return () => clearInterval(interval);
  }, []);

  const toggleStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/campaigns/${id}/toggle`, { method: 'POST' });
      const updated = await res.json();
      setCampaigns(prev => prev.map(c => c.id === id ? updated : c));
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return <span className="px-2.5 py-1 bg-emerald-100/80 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Em Execução</span>;
      case 'paused': return <span className="px-2.5 py-1 bg-amber-100/80 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Pausada</span>;
      case 'completed': return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Concluída</span>;
      default: return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'ai_voicebot': return { icon: <Bot className="w-4 h-4 text-purple-600" />, label: 'AI Voicebot (Agent)', bg: 'bg-purple-50', border: 'border-purple-200' };
      case 'predictive': return { icon: <BarChart className="w-4 h-4 text-blue-600" />, label: 'Discador Preditivo', bg: 'bg-blue-50', border: 'border-blue-200' };
      case 'power_dialer': return { icon: <Zap className="w-4 h-4 text-orange-600" />, label: 'Power Dialer', bg: 'bg-orange-50', border: 'border-orange-200' };
      default: return { icon: <PhoneCall className="w-4 h-4 text-slate-600" />, label: type, bg: 'bg-slate-50', border: 'border-slate-200' };
    }
  };

  // KPI Calculations
  const totalLeadsToday = campaigns.reduce((acc, c) => acc + c.totalLeads, 0);
  const totalProcessed = campaigns.reduce((acc, c) => acc + c.processedLeads, 0);
  const totalActiveCalls = campaigns.reduce((acc, c) => acc + c.activeCalls, 0);
  const totalSuccess = campaigns.reduce((acc, c) => acc + c.successCount, 0);
  
  const overallSuccessRate = totalProcessed > 0 ? Math.round((totalSuccess / totalProcessed) * 100) : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-600" />
            Outbound & AI Dialer
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie campanhas ativas, discadores preditivos e Agentes de Voz (MaIA) em massa.</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 transition shadow-sm">
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="relative z-10">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-4 h-4 text-indigo-500" /> Canais Disparando</div>
            <div className="text-3xl font-black text-slate-800">{totalActiveCalls}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="relative z-10">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="w-4 h-4 text-purple-500" /> Leads Processados</div>
            <div className="text-3xl font-black text-slate-800">{totalProcessed.toLocaleString('pt-BR')} <span className="text-sm font-semibold text-slate-400">/ {totalLeadsToday.toLocaleString('pt-BR')}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="relative z-10">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Contatos Efetivos (CPC)</div>
            <div className="text-3xl font-black text-slate-800">{totalSuccess.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 z-0" />
          <div className="relative z-10">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-amber-500" /> Taxa de Conversão</div>
            <div className="text-3xl font-black text-slate-800">{overallSuccessRate}%</div>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Sincronizando motor preditivo...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm bg-white rounded-xl border border-slate-200">Nenhuma campanha cadastrada.</div>
        ) : (
          campaigns.map(camp => {
            const progress = Math.min(100, Math.round((camp.processedLeads / camp.totalLeads) * 100));
            const successRate = camp.processedLeads > 0 ? Math.round((camp.successCount / camp.processedLeads) * 100) : 0;
            const typeInfo = getTypeStyle(camp.type);

            return (
              <div key={camp.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col xl:flex-row transition-all hover:shadow-md">
                
                {/* Left Panel: Identity & Controls */}
                <div className="p-6 xl:w-1/3 border-b xl:border-b-0 xl:border-r border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      {getStatusBadge(camp.status)}
                      <span className="text-[10px] text-slate-400 font-mono tracking-wider">ID: {camp.id.split('-')[1]}</span>
                    </div>
                    
                    <h3 className="font-bold text-xl text-slate-900 mb-3">{camp.name}</h3>
                    
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${typeInfo.bg} ${typeInfo.border} text-xs font-bold text-slate-700`}>
                      {typeInfo.icon}
                      {typeInfo.label}
                    </div>

                    {camp.aiAgentId && (
                      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Bot className="w-3.5 h-3.5" />
                        Agente Vinculado: <span className="font-bold text-slate-700">{camp.aiAgentId}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-8 flex items-center gap-3">
                    <button 
                      onClick={() => toggleStatus(camp.id)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                        camp.status === 'running' 
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 hover:shadow' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'
                      }`}
                    >
                      {camp.status === 'running' ? <><Pause className="w-4 h-4"/> Pausar Discador</> : <><Play className="w-4 h-4"/> Iniciar Motor</>}
                    </button>
                    <button className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition shadow-sm">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Right Panel: Metrics & Funnel */}
                <div className="p-6 xl:w-2/3 grid grid-cols-1 sm:grid-cols-12 gap-8 content-center bg-slate-50/30">
                  
                  {/* Progress Ring & Active Calls */}
                  <div className="sm:col-span-4 flex flex-col items-center justify-center border-r border-slate-100 pr-4">
                    <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                      {/* SVG Circular Progress */}
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                        <circle 
                          cx="50" cy="50" r="45" fill="none" 
                          stroke={camp.status === 'running' ? '#10b981' : '#cbd5e1'} 
                          strokeWidth="8" strokeLinecap="round"
                          strokeDasharray="283" strokeDashoffset={283 - (283 * progress) / 100} 
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-slate-800">{progress}%</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Concluído</span>
                      </div>
                    </div>
                    
                    <div className="text-center w-full bg-white border border-slate-100 rounded-xl py-3 shadow-sm">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Canais Simultâneos</div>
                      <div className="flex items-center justify-center gap-2">
                        <PhoneCall className={`w-4 h-4 ${camp.activeCalls > 0 ? 'text-indigo-500 animate-pulse' : 'text-slate-300'}`} />
                        <span className="text-2xl font-black text-slate-800">{camp.activeCalls}</span>
                      </div>
                    </div>
                  </div>

                  {/* Funnel Details */}
                  <div className="sm:col-span-8 flex flex-col justify-center space-y-6">
                    
                    {/* Mailing Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-sm font-bold text-slate-700 mb-2">
                        <span className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400"/> Mailing Base</span>
                        <span className="font-mono text-slate-900">{camp.processedLeads.toLocaleString('pt-BR')} <span className="text-slate-400 font-medium">/ {camp.totalLeads.toLocaleString('pt-BR')}</span></span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-indigo-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Contato Efetivo (Alô)
                        </div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-2xl font-black text-slate-800">{camp.successCount.toLocaleString('pt-BR')}</div>
                          <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{successRate}% da base</div>
                        </div>
                      </div>
                      
                      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Falhas (Ocup/Drop)
                        </div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-2xl font-black text-slate-800">{(camp.processedLeads - camp.successCount).toLocaleString('pt-BR')}</div>
                          <div className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">{100 - successRate}% da base</div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
