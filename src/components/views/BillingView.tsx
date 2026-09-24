import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Wallet,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  PhoneCall,
  MessageSquare,
  Download,
  Users,
  Zap,
  ShieldCheck,
  FileArchive,
  QrCode,
  Copy,
  Check,
  Calendar,
  RefreshCw,
  X,
  AlertCircle,
  Clock,
  Printer,
  ChevronRight,
  Receipt,
  Layers,
  Building2,
  Hash,
  Edit3,
  User,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  exportInvoicePdf,
  exportFinancialStatementPdf,
  InvoiceData,
  BillingSummaryData,
  FinancialTransaction,
} from '../../utils/pdfExportHelper';
import { Tenant, Did } from '../../types/pbx';

interface BillingViewProps {
  currentTenant?: Tenant | null;
}

interface ExtendedBillingData extends BillingSummaryData {
  tenantId: string;
  plan: string;
  balance: number;
  currency: string;
  currentMonthCosts: {
    telephony: number;
    aiTokens: number;
    omnichannel: number;
    licenses: number;
  };
  recentInvoices: InvoiceData[];
  transactions?: FinancialTransaction[];
}

const tokenUsageData = [
  { day: '01/09', tokens: 120000, cost: 24, telephony: 32 },
  { day: '02/09', tokens: 150000, cost: 30, telephony: 38 },
  { day: '03/09', tokens: 180000, cost: 36, telephony: 42 },
  { day: '04/09', tokens: 140000, cost: 28, telephony: 30 },
  { day: '05/09', tokens: 200000, cost: 40, telephony: 45 },
  { day: '06/09', tokens: 250000, cost: 50, telephony: 25 },
  { day: '07/09', tokens: 300000, cost: 60, telephony: 20 },
  { day: '08/09', tokens: 280000, cost: 56, telephony: 40 },
  { day: '09/09', tokens: 320000, cost: 64, telephony: 44 },
  { day: '10/09', tokens: 380000, cost: 76, telephony: 48 },
  { day: '11/09', tokens: 410000, cost: 82, telephony: 52 },
];

export const BillingView: React.FC<BillingViewProps> = ({ currentTenant }) => {
  const [billing, setBilling] = useState<ExtendedBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'invoices' | 'statement' | 'dids_billing'>('overview');
  const [didsList, setDidsList] = useState<Did[]>([]);
  const [didsSearchTerm, setDidsSearchTerm] = useState('');
  
  // Selected Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  // Edit DID Billing Modal
  const [editingDid, setEditingDid] = useState<Did | null>(null);
  const [isSavingDid, setIsSavingDid] = useState(false);
  const [didEditForm, setDidEditForm] = useState({
    assignedCompany: '',
    assignedCnpj: '',
    assignedUser: '',
    monthlyFee: '29.90',
    billingCycleDay: '10',
  });
  
  // Recharge Modal
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState<number>(500);
  const [isProcessingRecharge, setIsProcessingRecharge] = useState(false);
  const [rechargeSuccess, setRechargeSuccess] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Statement Period Filter
  const [statementPeriod, setStatementPeriod] = useState<'current_month' | 'last_30_days' | 'all'>('current_month');

  const fetchBilling = async () => {
    try {
      const tenantId = currentTenant?.id;
      if (!tenantId) {
        setLoading(false);
        return;
      }
      const [resBilling, resDids] = await Promise.all([
        fetch(`/api/v1/billing/${tenantId}`),
        fetch(`/api/v1/dids?tenantId=${tenantId}`),
      ]);
      if (resBilling.ok) {
        const data = await resBilling.json();
        setBilling(data);
      }
      if (resDids.ok) {
        const didsData = await resDids.json();
        setDidsList(didsData);
      }
    } catch (e) {
      console.error('Error loading billing data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, [currentTenant]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: billing?.currency || 'BRL',
    }).format(value);
  };

  const totalCurrentCost = useMemo(() => {
    if (!billing) return 0;
    return (
      billing.currentMonthCosts.telephony +
      billing.currentMonthCosts.aiTokens +
      billing.currentMonthCosts.omnichannel +
      billing.currentMonthCosts.licenses
    );
  }, [billing]);

  // Handle Export Single Invoice
  const handleExportSingleInvoice = (invoice: InvoiceData) => {
    if (!billing) return;
    exportInvoicePdf(invoice, billing, currentTenant);
  };

  // Handle Export Financial Statement
  const handleExportStatement = () => {
    if (!billing) return;
    const txs = billing.transactions || [];
    exportFinancialStatementPdf(billing, txs, 'Setembro de 2026', currentTenant);
  };

  // Handle Add Balance
  const handleConfirmRecharge = async () => {
    if (!billing) return;
    const tenantId = currentTenant?.id;
    if (!tenantId) return;
    setIsProcessingRecharge(true);
    try {
      const res = await fetch(`/api/v1/billing/${tenantId}/recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: rechargeAmount, paymentMethod: 'PIX Instantâneo' }),
      });
      if (res.ok) {
        setRechargeSuccess(true);
        setTimeout(() => {
          setRechargeSuccess(false);
          setIsRechargeModalOpen(false);
          fetchBilling();
        }, 1500);
      }
    } catch (err) {
      console.error('Error recharging:', err);
    } finally {
      setIsProcessingRecharge(false);
    }
  };

  // Handle Pay Invoice Simulated
  const handlePayInvoice = async (invoiceId: string) => {
    if (!billing) return;
    const tenantId = currentTenant?.id;
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/v1/billing/${tenantId}/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'PIX' }),
      });
      if (res.ok) {
        if (selectedInvoice && selectedInvoice.id === invoiceId) {
          setSelectedInvoice({ ...selectedInvoice, status: 'paid' });
        }
        fetchBilling();
      }
    } catch (err) {
      console.error('Error paying invoice:', err);
    }
  };

  // Handle Export Single DID Invoice PDF
  const handleGenerateDidInvoicePdf = (didItem: Did) => {
    const fee = didItem.monthlyFee !== undefined ? didItem.monthlyFee : 29.90;
    const invData: InvoiceData = {
      id: `INV-DID-${(didItem.did || '').slice(-4)}-${new Date().getMonth() + 1}${new Date().getFullYear()}`,
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      amount: fee,
      status: 'pending',
      pixKey: '12.345.678/0001-90',
      barcode: '34191.79001 01043.510047 91020.150008 8 98450000002990',
      items: [
        {
          description: `Locação Mensal de DID Telefônico E.164 (${didItem.presentedNumber || didItem.did})`,
          category: 'Numeração DID & Telefonia',
          qty: '1 número DID',
          unitPrice: fee,
          total: fee,
        },
      ],
    };

    const summaryData: BillingSummaryData = {
      tenantId: didItem.tenantId || currentTenant?.id || '',
      tenantName: didItem.assignedCompany || 'Cliente Assinante de Linha DID',
      tenantCnpj: didItem.assignedCnpj || '00.000.000/0001-00',
      plan: 'Locação de Linha Telefônica DID Receptiva',
      balance: 0,
      currency: 'BRL',
      currentMonthCosts: {
        telephony: fee,
        aiTokens: 0,
        omnichannel: 0,
        licenses: 0,
      },
    };

    const mockTenant: Tenant = {
      id: didItem.tenantId || 'tenant-custom',
      name: didItem.assignedCompany || 'Cliente Assinante de Linha DID',
      cnpj: didItem.assignedCnpj || '00.000.000/0001-00',
      plan: 'Locação DID Receptivo',
      maxExtensions: 10,
      maxTrunks: 2,
      aiCreditsUsd: 0,
      createdAt: new Date().toISOString(),
    };

    exportInvoicePdf(invData, summaryData, mockTenant);
  };

  // Open Edit DID Modal from Billing Tab
  const handleOpenEditDid = (didItem: Did) => {
    setEditingDid(didItem);
    setDidEditForm({
      assignedCompany: didItem.assignedCompany || '',
      assignedCnpj: didItem.assignedCnpj || '',
      assignedUser: didItem.assignedUser || '',
      monthlyFee: didItem.monthlyFee !== undefined ? String(didItem.monthlyFee) : '29.90',
      billingCycleDay: didItem.billingCycleDay !== undefined ? String(didItem.billingCycleDay) : '10',
    });
  };

  // Save DID Billing Information
  const handleSaveDidBilling = async () => {
    if (!editingDid) return;
    setIsSavingDid(true);
    try {
      const res = await fetch(`/api/v1/dids/${editingDid.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingDid,
          assignedCompany: didEditForm.assignedCompany,
          assignedCnpj: didEditForm.assignedCnpj,
          assignedUser: didEditForm.assignedUser,
          monthlyFee: parseFloat(didEditForm.monthlyFee) || 29.90,
          billingCycleDay: parseInt(didEditForm.billingCycleDay, 10) || 10,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDidsList((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        setEditingDid(null);
      }
    } catch (err) {
      console.error('Error saving DID billing details:', err);
    } finally {
      setIsSavingDid(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 font-medium flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <p className="text-sm">Sincronizando portal financeiro e bilhetagem...</p>
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <p className="font-bold text-slate-800">Erro ao carregar dados de faturamento.</p>
        <p className="text-xs text-slate-500 mt-1">Verifique a conectividade com o backend do PBX.</p>
        <button onClick={fetchBilling} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Faturamento & Gestão Financeira
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Tarifação de telefonia SIP Asterisk, consumo de tokens de voz Gemini e emissão oficial de relatórios e faturas em PDF.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Export Full Statement in PDF */}
          <button
            onClick={handleExportStatement}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs hover:border-slate-400"
            title="Exportar extrato consolidado com logo oficial em PDF"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Extrato em PDF</span>
          </button>

          {/* Quick Recharge */}
          <button
            onClick={() => setIsRechargeModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Adicionar Saldo (PIX)</span>
          </button>
        </div>
      </div>

      {/* Subtabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          Visão Geral & Consumo
        </button>
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'invoices'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Faturas & Boletos ({billing.recentInvoices.length})
        </button>
        <button
          onClick={() => setActiveSubTab('statement')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'statement'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Extrato Detalhado de Lançamentos
        </button>
        <button
          onClick={() => setActiveSubTab('dids_billing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'dids_billing'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          DIDs por Empresa & Mensalidades ({didsList.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CONSUMPTION */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Balance Card (Dark Slate Premium) */}
            <div className="lg:col-span-4 bg-slate-900 rounded-3xl p-7 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-slate-800">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Saldo Disponível em Conta</span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Pré-pago Ativo
                  </span>
                </div>

                <div className="text-4xl font-black mb-2 tracking-tight">{formatCurrency(billing.balance)}</div>

                <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5 bg-slate-800/60 inline-flex px-3 py-1.5 rounded-lg border border-slate-700/50 mt-2">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  Última recarga: R$ 500,00 <span className="opacity-60">(05/09/2026)</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 relative z-10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Empresa / Tenant:</span>
                  <span className="font-bold text-white truncate max-w-[180px]">{currentTenant?.name || 'Enlace Matriz'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Plano Assinado:</span>
                  <span className="font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-md">Enterprise AI Plus</span>
                </div>
                <button
                  onClick={() => setIsRechargeModalOpen(true)}
                  className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-900/30 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" /> Realizar Recarga Instantânea (PIX)
                </button>
              </div>
            </div>

            {/* Current Month Costs Breakdown */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Consumo Acumulado (Competência Setembro/2026)</h2>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Rateio tarifário da infraestrutura Asterisk 20 e modelos de IA.</p>
                  </div>
                  <div className="sm:text-right bg-slate-50 p-3 rounded-2xl border border-slate-100 sm:bg-transparent sm:p-0 sm:border-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Fatura Parcial Prevista</div>
                    <div className="text-2xl font-black text-slate-900">{formatCurrency(totalCurrentCost)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {/* Telephony */}
                  <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/40 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                      <PhoneCall className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Telefonia SIP</span>
                    </div>
                    <div className="text-xl font-black text-slate-800">{formatCurrency(billing.currentMonthCosts.telephony)}</div>
                    <div className="text-[10px] font-medium text-slate-400 mt-1">12.450 min tarifados</div>
                  </div>

                  {/* AI Tokens */}
                  <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/50 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-purple-600 mb-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Tokens Gemini</span>
                    </div>
                    <div className="text-xl font-black text-slate-800">{formatCurrency(billing.currentMonthCosts.aiTokens)}</div>
                    <div className="text-[10px] font-medium text-purple-400 mt-1">2.85M tokens consumidos</div>
                  </div>

                  {/* Omnichannel */}
                  <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">WABA / WhatsApp</span>
                    </div>
                    <div className="text-xl font-black text-slate-800">{formatCurrency(billing.currentMonthCosts.omnichannel)}</div>
                    <div className="text-[10px] font-medium text-slate-400 mt-1">4.500 msgs ativas</div>
                  </div>

                  {/* Licenses */}
                  <div className="p-4 rounded-2xl border border-orange-100 bg-orange-50/40 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-orange-600 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Ramais PJSIP</span>
                    </div>
                    <div className="text-xl font-black text-slate-800">{formatCurrency(billing.currentMonthCosts.licenses)}</div>
                    <div className="text-[10px] font-medium text-slate-400 mt-1">30 ramais ativos</div>
                  </div>
                </div>
              </div>

              {/* Area Chart Consumption */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" /> Histórico Diário de Consumo (Telefonia & IA)
                  </h3>
                  <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                    Setembro/2026
                  </div>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={tokenUsageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTelephony" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      />
                      <Area type="monotone" dataKey="telephony" name="Telefonia (R$)" stroke="#2563eb" strokeWidth={2.5} fill="url(#colorTelephony)" />
                      <Area type="monotone" dataKey="cost" name="Tokens IA (R$)" stroke="#9333ea" strokeWidth={2.5} fill="url(#colorTokens)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Invoices Quick Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                Faturas Recentes
              </h3>
              <button
                onClick={() => setActiveSubTab('invoices')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Ver Todas as Faturas <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {billing.recentInvoices.slice(0, 3).map((invoice) => (
                <div
                  key={invoice.id}
                  className="p-5 flex items-center justify-between hover:bg-slate-50/70 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-sm">{invoice.id}</div>
                      <div className="text-[11px] font-medium text-slate-400">
                        Vencimento: {new Date(invoice.dueDate || invoice.date).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <div className="text-base font-black text-slate-900">{formatCurrency(invoice.amount)}</div>
                      {invoice.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3" /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-100">
                          <Clock className="w-3 h-3" /> Pendente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                      >
                        Detalhes
                      </button>
                      <button
                        onClick={() => handleExportSingleInvoice(invoice)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-100 shadow-xs flex items-center gap-1.5 text-xs font-bold"
                        title="Baixar Fatura em PDF"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES & TAX RECEIPTS */}
      {activeSubTab === 'invoices' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900">Histórico de Faturas & Notas Fiscais</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Emissão eletrônica com discriminação de telefonia SIP, tokens de IA e chave PIX para quitação.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Total emitido: {billing.recentInvoices.length} faturas
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
            {billing.recentInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">{invoice.id}</span>
                      {invoice.status === 'paid' ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> PAGO
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> AGUARDANDO PAGAMENTO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-4 flex-wrap">
                      <span>Emissão: {new Date(invoice.date).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>Vencimento: {new Date(invoice.dueDate || invoice.date).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>Forma: {invoice.paymentMethod || 'PIX'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Valor Líquido</div>
                    <div className="text-xl font-black text-slate-900">{formatCurrency(invoice.amount)}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    >
                      Visualizar
                    </button>
                    <button
                      onClick={() => handleExportSingleInvoice(invoice)}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exportar PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DETAILED STATEMENT (EXTRATO DE LANÇAMENTOS) */}
      {activeSubTab === 'statement' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900">Extrato Consolidado de Movimentações</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Histórico detalhado de créditos adicionados, tarifas de ligação e tokens consumidos em tempo real.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportStatement}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Baixar Extrato em PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Data</th>
                  <th className="p-3.5">Descrição do Lançamento</th>
                  <th className="p-3.5">Serviço</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5 text-right">Valor (R$)</th>
                  <th className="p-3.5 text-right">Saldo Resultante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(billing.transactions || []).map((tx) => {
                  const isCredit = tx.type === 'credit';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 whitespace-nowrap text-slate-500">
                        {new Date(tx.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">{tx.description}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {tx.category === 'telephony'
                            ? 'Telefonia SIP'
                            : tx.category === 'ai_tokens'
                            ? 'IA Gemini'
                            : tx.category === 'recharge'
                            ? 'Recarga Saldo'
                            : tx.category === 'omnichannel'
                            ? 'WhatsApp WABA'
                            : 'Licenças Ramais'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {isCredit ? (
                          <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            + Crédito
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold text-[10px] uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                            - Débito
                          </span>
                        )}
                      </td>
                      <td className={`p-3.5 text-right font-black ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {isCredit ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-600">
                        {formatCurrency(tx.balanceAfter)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DIDS POR EMPRESA & MENSALIDADES */}
      {activeSubTab === 'dids_billing' && (
        <div className="space-y-6">
          {/* Summary KPIs for DIDs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de DIDs</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Hash className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{didsList.length}</span>
                <span className="text-xs text-slate-400 font-medium">números ativos</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Empresas Clientes</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {new Set(didsList.map((d) => d.assignedCompany).filter(Boolean)).size}
                </span>
                <span className="text-xs text-slate-400 font-medium">empresas vinculadas</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receita Recorrente (MRR)</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700">
                  {formatCurrency(
                    didsList.reduce((acc, d) => acc + (d.monthlyFee !== undefined ? d.monthlyFee : 29.9), 0)
                  )}
                </span>
                <span className="text-xs text-slate-400 font-medium">/mês em DIDs</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chamadas Recebidas</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-purple-700">
                  {didsList.reduce((acc, d) => acc + (d.totalCallsReceived || 0), 0)}
                </span>
                <span className="text-xs text-slate-400 font-medium">inbound total</span>
              </div>
            </div>
          </div>

          {/* DIDs & Companies Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Gestão de DIDs Vinculados a Empresas & Cobrança
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Associação de números telefônicos a clientes receptores, cadastro de CNPJ, contato responsável e valores de mensalidade.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Buscar empresa, CNPJ ou número..."
                  value={didsSearchTerm}
                  onChange={(e) => setDidsSearchTerm(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 w-64 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider font-mono">
                  <tr>
                    <th className="p-3.5">Empresa Titular / Cliente</th>
                    <th className="p-3.5">CNPJ / CPF</th>
                    <th className="p-3.5">Número DID</th>
                    <th className="p-3.5">Tronco SIP Operadora</th>
                    <th className="p-3.5">Responsável</th>
                    <th className="p-3.5 text-right">Mensalidade</th>
                    <th className="p-3.5 text-center">Vencimento</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {didsList
                    .filter((item) => {
                      if (!didsSearchTerm) return true;
                      const term = didsSearchTerm.toLowerCase();
                      return (
                        (item.assignedCompany && item.assignedCompany.toLowerCase().includes(term)) ||
                        (item.assignedCnpj && item.assignedCnpj.toLowerCase().includes(term)) ||
                        (item.did && item.did.includes(term)) ||
                        (item.presentedNumber && item.presentedNumber.includes(term))
                      );
                    })
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {item.assignedCompany || (
                                  <span className="text-slate-400 italic">Não vinculado</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {item.description || `DID ${item.presentedNumber || item.did}`}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-[11px] text-slate-700">
                          {item.assignedCnpj || '—'}
                        </td>

                        <td className="p-3.5">
                          <div className="font-mono font-bold text-slate-900">
                            {item.presentedNumber || item.did}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {item.normalizedNumber || `+55${item.did}`}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {item.operatorName}
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-700">
                          {item.assignedUser || '—'}
                        </td>

                        <td className="p-3.5 text-right font-black text-slate-900 font-mono">
                          R$ {(item.monthlyFee !== undefined ? item.monthlyFee : 29.9).toFixed(2).replace('.', ',')}
                        </td>

                        <td className="p-3.5 text-center font-medium text-slate-700">
                          Dia {item.billingCycleDay || 10}
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {item.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleGenerateDidInvoicePdf(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition font-bold text-[11px] flex items-center gap-1 border border-blue-200 shadow-xs"
                              title="Emitir Fatura PDF Individual do DID"
                            >
                              <Download className="w-3.5 h-3.5 text-blue-600" />
                              <span>Fatura PDF</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditDid(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-slate-200"
                              title="Editar Vínculo & Cobrança"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INVOICE DETAILS & PDF PREVIEW */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">Fatura {selectedInvoice.id}</h3>
                  <p className="text-xs text-slate-500">
                    Vencimento em {new Date(selectedInvoice.dueDate || selectedInvoice.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase">Status Atual</span>
                  <div className="text-sm font-black mt-0.5">
                    {selectedInvoice.status === 'paid' ? (
                      <span className="text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Fatura Quitada / Paga
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> Aguardando Pagamento
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold uppercase">Valor Total</span>
                  <div className="text-2xl font-black text-slate-900">{formatCurrency(selectedInvoice.amount)}</div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
                  Discriminação dos Serviços
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {(
                    selectedInvoice.items || [
                      { description: 'Telefonia SIP Asterisk 20', category: 'Telefonia', qty: '12.450 min', unitPrice: 0.028, total: 345.20 },
                      { description: 'Locação e Roteamento de Numeração DID Receptiva', category: 'Numeração DID', qty: '5 números', unitPrice: 29.90, total: 149.50 },
                      { description: 'Processamento de Voz Gemini Live', category: 'IA Gemini', qty: '2.85M tokens', unitPrice: 0.000045, total: 128.50 },
                      { description: 'Licenças Ramais PJSIP Cloud', category: 'Licenças', qty: '30 ramais', unitPrice: 5.0, total: 150.00 },
                      { description: 'Mensagens WhatsApp Business API', category: 'Omnichannel', qty: '4.500 msgs', unitPrice: 0.02, total: 90.00 },
                    ]
                  ).map((item, i) => (
                    <div key={i} className="p-3 text-xs flex justify-between items-center bg-white hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-800">{item.description}</div>
                        <div className="text-[10px] text-slate-400">{item.category} • Qtd: {item.qty}</div>
                      </div>
                      <div className="font-black text-slate-900">{formatCurrency(item.total)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Section if pending */}
              {selectedInvoice.status !== 'paid' && (
                <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-blue-600" /> Chave PIX Copia e Cola
                    </h4>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      Compensação Instantânea
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-blue-200 font-mono text-[11px] text-slate-700 break-all select-all">
                    <span>00020126360014BR.GOV.BCB.PIX0114123456780001905204000053039865405{selectedInvoice.amount.toFixed(2)}5802BR5925ENLACE TELECOMUNICACOES6009SAO PAULO62070503***6304</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('12.345.678/0001-90');
                        setCopiedPix(true);
                        setTimeout(() => setCopiedPix(false), 2000);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg shrink-0 transition"
                      title="Copiar Chave PIX"
                    >
                      {copiedPix ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    onClick={() => handlePayInvoice(selectedInvoice.id)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirmar Pagamento Simulado
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Fechar
              </button>
              <button
                onClick={() => handleExportSingleInvoice(selectedInvoice)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar PDF Oficial com Logo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECHARGE BALANCE */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Adicionar Saldo Pré-pago</h3>
                  <p className="text-xs text-slate-500">Recarga instantânea para telefonia e IA</p>
                </div>
              </div>
              <button
                onClick={() => setIsRechargeModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Escolha o Valor do Crédito:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[100, 250, 500, 1000, 2000].map((val) => (
                    <button
                      key={val}
                      onClick={() => setRechargeAmount(val)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border ${
                        rechargeAmount === val
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      R$ {val}
                    </button>
                  ))}
                  <button
                    onClick={() => setRechargeAmount(100)}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold bg-white text-slate-500 border border-slate-200"
                  >
                    Outro
                  </button>
                </div>
              </div>

              {/* PIX Mock instructions */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <div className="w-24 h-24 mx-auto bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-slate-800" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Chave PIX: CNPJ Enlace Telecom</div>
                  <div className="text-[11px] font-mono text-slate-500 select-all">12.345.678/0001-90</div>
                </div>
              </div>

              {rechargeSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-2 justify-center">
                  <CheckCircle2 className="w-4 h-4" /> Recarga realizada com sucesso! Saldo atualizado.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => setIsRechargeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={isProcessingRecharge || rechargeSuccess}
                onClick={handleConfirmRecharge}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-2"
              >
                {isProcessingRecharge ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Confirmar Crédito de R$ {rechargeAmount.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DID BILLING & COMPANY ASSIGNMENT */}
      {editingDid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Editar Cobrança: DID {editingDid.presentedNumber || editingDid.did}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tronco SIP: <span className="font-bold text-slate-700">{editingDid.operatorName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingDid(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Empresa Titular / Cliente Assinante
                </label>
                <input
                  type="text"
                  value={didEditForm.assignedCompany}
                  onChange={(e) => setDidEditForm({ ...didEditForm, assignedCompany: e.target.value })}
                  placeholder="Ex: Prime Consultoria e Tecnologia Ltda"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    CNPJ ou CPF
                  </label>
                  <input
                    type="text"
                    value={didEditForm.assignedCnpj}
                    onChange={(e) => setDidEditForm({ ...didEditForm, assignedCnpj: e.target.value })}
                    placeholder="Ex: 23.456.789/0001-12"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Contato / Responsável
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={didEditForm.assignedUser}
                      onChange={(e) => setDidEditForm({ ...didEditForm, assignedUser: e.target.value })}
                      placeholder="Ex: Carlos Mendes"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mensalidade do DID (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={didEditForm.monthlyFee}
                    onChange={(e) => setDidEditForm({ ...didEditForm, monthlyFee: e.target.value })}
                    placeholder="29.90"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Dia do Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={didEditForm.billingCycleDay}
                    onChange={(e) => setDidEditForm({ ...didEditForm, billingCycleDay: e.target.value })}
                    placeholder="10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingDid(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                disabled={isSavingDid}
                onClick={handleSaveDidBilling}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
              >
                {isSavingDid ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
