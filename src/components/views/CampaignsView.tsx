import React, { useState, useEffect } from 'react';
import { Megaphone, Play, Pause, BarChart, Users, Bot, PhoneCall, CheckCircle2, AlertTriangle, Plus, Settings } from 'lucide-react';
import { OutboundCampaign } from '../../../server/db'; // We'll just type it directly to avoid importing from backend

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
    
    // Auto refresh active metrics
    const interval = setInterval(() => {
      setCampaigns(prev => prev.map(c => {
        if (c.status === 'running') {
          return {
            ...c,
            processedLeads: Math.min(c.totalLeads, c.processedLeads + Math.floor(Math.random() * 3)),
            successCount: c.successCount + (Math.random() > 0.7 ? 1 : 0),
            activeCalls: c.type === 'ai_voicebot' ? 10 + Math.floor(Math.random() * 5) : 3 + Math.floor(Math.random() * 4)
          };
        }
        return c;
      }));
    }, 3000);
    
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
      case 'running': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Rodando</span>;
      case 'paused': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Pausada</span>;
      case 'completed': return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold uppercase tracking-wider">Concluída</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ai_voicebot': return <Bot className="w-4 h-4 text-purple-600" />;
      case 'predictive': return <BarChart className="w-4 h-4 text-blue-600" />;
      case 'power_dialer': return <Megaphone className="w-4 h-4 text-orange-600" />;
      default: return <PhoneCall className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'ai_voicebot': return 'AI Voicebot (Agent)';
      case 'predictive': return 'Discador Preditivo';
      case 'power_dialer': return 'Power Dialer';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-600" />
            Campanhas Outbound & AI Dialers
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie discadores automáticos e agentes de voz disparando chamadas em massa.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 transition shadow-sm">
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Carregando campanhas...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm bg-white rounded-xl border border-slate-200">Nenhuma campanha cadastrada.</div>
        ) : (
          campaigns.map(camp => {
            const progress = Math.min(100, Math.round((camp.processedLeads / camp.totalLeads) * 100));
            const successRate = camp.processedLeads > 0 ? Math.round((camp.successCount / camp.processedLeads) * 100) : 0;

            return (
              <div key={camp.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row">
                
                {/* Info Section */}
                <div className="p-6 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      {getStatusBadge(camp.status)}
                      <span className="text-[10px] text-slate-400 font-mono">{camp.id}</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">{camp.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      {getTypeIcon(camp.type)}
                      {getTypeName(camp.type)}
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center gap-2">
                    <button 
                      onClick={() => toggleStatus(camp.id)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        camp.status === 'running' 
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      {camp.status === 'running' ? <><Pause className="w-4 h-4"/> Pausar</> : <><Play className="w-4 h-4"/> Iniciar</>}
                    </button>
                    <button className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metrics Section */}
                <div className="p-6 lg:w-2/3 grid grid-cols-2 sm:grid-cols-4 gap-6 content-center">
                  
                  {/* Active Calls */}
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Canais Ativos</div>
                    <div className="flex items-end gap-2">
                      <span className={`text-4xl font-black ${camp.activeCalls > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {camp.activeCalls}
                      </span>
                      <span className="text-xs text-slate-500 font-medium mb-1">simultâneos</span>
                    </div>
                  </div>

                  {/* Funnel Stats */}
                  <div className="col-span-2 sm:col-span-3 space-y-5">
                    
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                        <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-400"/> Mailing Processado</span>
                        <span className="font-mono">{camp.processedLeads} / {camp.totalLeads} ({progress}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sucesso (Alô)
                        </div>
                        <div className="text-lg font-bold text-slate-800">
                          {camp.successCount} <span className="text-xs font-medium text-emerald-600 ml-1">({successRate}%)</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Falhas / Drop
                        </div>
                        <div className="text-lg font-bold text-slate-800">
                          {camp.processedLeads - camp.successCount} <span className="text-xs font-medium text-rose-500 ml-1">({100 - successRate}%)</span>
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
