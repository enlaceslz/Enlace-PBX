import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet, FileText, ArrowUpRight, ArrowDownRight, CheckCircle2, TrendingUp, Sparkles, PhoneCall, MessageSquare, Download, Users, Zap, ShieldCheck, FileArchive } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface BillingData {
  tenantId: string;
  plan: 'prepaid' | 'postpaid';
  balance: number;
  currency: string;
  currentMonthCosts: {
    telephony: number;
    aiTokens: number;
    omnichannel: number;
    licenses: number;
  };
  recentInvoices: {
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'overdue';
  }[];
}

// Mock token usage data
const tokenUsageData = [
  { day: '01', tokens: 120000, cost: 24 },
  { day: '02', tokens: 150000, cost: 30 },
  { day: '03', tokens: 180000, cost: 36 },
  { day: '04', tokens: 140000, cost: 28 },
  { day: '05', tokens: 200000, cost: 40 },
  { day: '06', tokens: 250000, cost: 50 },
  { day: '07', tokens: 300000, cost: 60 },
  { day: '08', tokens: 280000, cost: 56 },
  { day: '09', tokens: 320000, cost: 64 },
  { day: '10', tokens: 380000, cost: 76 },
];

export const BillingView: React.FC = () => {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const res = await fetch('/api/v1/billing/tenant-enlace-matriz');
        if (res.ok) {
          const data = await res.json();
          setBilling(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBilling();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 font-medium">Sincronizando portal de faturamento...</div>;
  }

  if (!billing) {
    return <div className="p-12 text-center text-slate-500 font-medium">Erro ao carregar dados de faturamento.</div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: billing.currency }).format(value);
  };

  const totalCurrentCost = 
    billing.currentMonthCosts.telephony + 
    billing.currentMonthCosts.aiTokens + 
    billing.currentMonthCosts.omnichannel + 
    billing.currentMonthCosts.licenses;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Wallet className="w-8 h-8 text-blue-600" />
            Faturamento & Custos
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Gestão de saldos, faturas e acompanhamento de consumo de IA e telefonia em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-lg text-sm transition flex items-center gap-2 shadow-sm">
            <FileText className="w-4 h-4" /> Extrato Completo
          </button>
          <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-sm transition shadow-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Adicionar Saldo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Balance Card (Dark Premium) */}
        <div className="lg:col-span-4 bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Saldo Disponível</span>
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Pré-pago Ativo
              </span>
            </div>
            
            <div className="text-5xl font-black mb-2 tracking-tighter">{formatCurrency(billing.balance)}</div>
            
            <div className="text-sm font-medium text-slate-400 flex items-center gap-1.5 bg-slate-800/50 inline-flex px-3 py-1.5 rounded-lg border border-slate-700/50">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              Última recarga: R$ 500,00 <span className="opacity-50">(05/09/2026)</span>
            </div>
          </div>
          
          <div className="mt-12 pt-6 border-t border-slate-800 relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-400">Plano Assinado</span>
              <span className="text-sm font-black text-white bg-white/10 px-3 py-1 rounded-lg">Enterprise AI Plus</span>
            </div>
            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/20">
              Gerenciar Método de Pagamento
            </button>
          </div>
        </div>

        {/* Breakdown & Charts */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Current Month Costs */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Consumo Vigente (Setembro)</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">Rateio de custos por serviço da infraestrutura Enlace-PBX.</p>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Fatura Parcial</div>
                <div className="text-3xl font-black text-slate-900">{formatCurrency(totalCurrentCost)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Telephony */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-between transition hover:border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                  <PhoneCall className="w-5 h-5 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Telefonia</span>
                </div>
                <div className="text-2xl font-black text-slate-800">{formatCurrency(billing.currentMonthCosts.telephony)}</div>
                <div className="text-[10px] font-medium text-slate-400 mt-1">Minutos SIP/Troncos</div>
              </div>
              
              {/* AI Tokens */}
              <div className="p-5 rounded-2xl border border-purple-100 bg-purple-50/50 flex flex-col justify-between transition hover:border-purple-200">
                <div className="flex items-center gap-2 text-purple-600 mb-3">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Tokens IA</span>
                </div>
                <div className="text-2xl font-black text-slate-800">{formatCurrency(billing.currentMonthCosts.aiTokens)}</div>
                <div className="text-[10px] font-medium text-purple-400/80 mt-1">Google Gemini API</div>
              </div>
              
              {/* Omnichannel */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-between transition hover:border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">WABA / SMS</span>
                </div>
                <div className="text-2xl font-black text-slate-800">{formatCurrency(billing.currentMonthCosts.omnichannel)}</div>
                <div className="text-[10px] font-medium text-slate-400 mt-1">Mensageria Meta</div>
              </div>
              
              {/* Licenses */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-between transition hover:border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 mb-3">
                  <Users className="w-5 h-5 text-orange-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Licenças</span>
                </div>
                <div className="text-2xl font-black text-slate-800">{formatCurrency(billing.currentMonthCosts.licenses)}</div>
                <div className="text-[10px] font-medium text-slate-400 mt-1">Assinaturas Fixas</div>
              </div>
            </div>
          </div>

          {/* AI Usage Chart */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-500" /> Consumo de Tokens (Gemini)
                </h3>
              </div>
              <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                Últimos 10 dias
              </div>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tokenUsageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}
                    formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Tokens']}
                  />
                  <Area type="monotone" dataKey="tokens" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorTokens)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-slate-400" />
            Histórico de Faturas
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {billing.recentInvoices.map(invoice => (
            <div key={invoice.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-slate-900 mb-0.5">{invoice.id}</div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Emitida em {new Date(invoice.date).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-xl font-black text-slate-900 mb-0.5">{formatCurrency(invoice.amount)}</div>
                  {invoice.status === 'paid' && <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-100"><CheckCircle2 className="w-3 h-3"/> Pago</span>}
                  {invoice.status === 'pending' && <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-100">Pendente</span>}
                  {invoice.status === 'overdue' && <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-wider border border-rose-100">Vencida</span>}
                </div>
                <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition shadow-sm border border-transparent hover:border-blue-100" title="Baixar PDF">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};
