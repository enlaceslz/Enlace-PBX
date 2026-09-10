import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet, FileText, ArrowUpRight, ArrowDownRight, CheckCircle2, TrendingUp, Sparkles, PhoneCall, MessageSquare, Download } from 'lucide-react';

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
    return <div className="p-8 text-center text-slate-500">Carregando dados financeiros...</div>;
  }

  if (!billing) {
    return <div className="p-8 text-center text-slate-500">Erro ao carregar dados de faturamento.</div>;
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
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" />
            Faturamento & Custos
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie saldos, visualize faturas e acompanhe o consumo de IA em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition flex items-center gap-2">
            <FileText className="w-4 h-4" /> Extrato
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition shadow-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Adicionar Saldo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Balance Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-8">
              <span className="text-sm font-medium text-slate-300">Saldo Atual (Pré-pago)</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                Ativo
              </span>
            </div>
            <div className="text-4xl font-black mb-1">{formatCurrency(billing.balance)}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              Última recarga: R$ 500,00 (05/09/2026)
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-700/50 flex items-center justify-between text-sm">
            <span className="text-slate-400">Plano Atual:</span>
            <span className="font-semibold text-white">Enterprise AI Plus</span>
          </div>
        </div>

        {/* Current Month Costs */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
            <h3 className="font-bold text-slate-800">Consumo Acumulado (Mês Vigente)</h3>
            <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Total: {formatCurrency(totalCurrentCost)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Telephony */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <PhoneCall className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Telefonia</span>
              </div>
              <div className="text-lg font-bold text-slate-800">{formatCurrency(billing.currentMonthCosts.telephony)}</div>
              <div className="text-[10px] text-slate-400 mt-1">Minutos PJSIP/Troncos</div>
            </div>

            {/* AI Tokens */}
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Tokens IA</span>
              </div>
              <div className="text-lg font-bold text-slate-800">{formatCurrency(billing.currentMonthCosts.aiTokens)}</div>
              <div className="text-[10px] text-slate-500 mt-1">MaIA / Gemini API</div>
            </div>

            {/* Omnichannel */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Canais WABA</span>
              </div>
              <div className="text-lg font-bold text-slate-800">{formatCurrency(billing.currentMonthCosts.omnichannel)}</div>
              <div className="text-[10px] text-slate-400 mt-1">WhatsApp & SMS</div>
            </div>

            {/* Licenses */}
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold uppercase tracking-wider">Licenças</span>
              </div>
              <div className="text-lg font-bold text-slate-800">{formatCurrency(billing.currentMonthCosts.licenses)}</div>
              <div className="text-[10px] text-slate-400 mt-1">Agentes Simultâneos</div>
            </div>

          </div>
        </div>

      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            Faturas e Extratos Anteriores
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {billing.recentInvoices.map(invoice => (
            <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{invoice.id}</div>
                  <div className="text-xs text-slate-500">Emitida em {new Date(invoice.date).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="font-bold text-slate-900">{formatCurrency(invoice.amount)}</div>
                  {invoice.status === 'paid' && <span className="text-[10px] font-bold text-emerald-600 uppercase">Pago</span>}
                  {invoice.status === 'pending' && <span className="text-[10px] font-bold text-amber-600 uppercase">Pendente</span>}
                  {invoice.status === 'overdue' && <span className="text-[10px] font-bold text-rose-600 uppercase">Vencida</span>}
                </div>
                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Baixar PDF">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};

// Temp mock for missing icon in import
function Receipt(props: any) {
  return <FileText {...props} />;
}
