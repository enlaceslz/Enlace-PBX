import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Mic,
  Sparkles,
  Download,
  Play,
  Pause,
  Filter,
  Search,
  Bot,
  Clock,
  CheckCircle2,
  Calendar,
  RefreshCw,
  X,
  Volume2,
  Radio,
  Forward,
  PhoneForwarded,
  Smile,
  Meh,
  Frown,
  PhoneIncoming,
  PhoneOutgoing,
  UserCheck,
  TrendingUp,
  Tag,
  Share2,
  PieChart as PieChartIcon,
  BarChart3,
  Printer,
  Activity
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { CdrRecord, Tenant } from '../../types/pbx';
import { speakHumanized, stopSpeaking, detectVoiceGender } from '../../utils/speechVoiceHelper';
import { exportCdrReportPdf, exportCallDossierPdf } from '../../utils/pdfExportHelper';

interface CdrAndRecordingsProps {
  cdrs: CdrRecord[];
  initialTab?: 'cdr' | 'recordings' | 'transcriptions' | 'reports';
  currentTenant?: Tenant | null;
  onRefresh: () => void;
  onOpenWebphone: (number: string) => void;
}

export const CdrAndRecordingsView: React.FC<CdrAndRecordingsProps> = ({
  cdrs,
  initialTab = 'cdr',
  currentTenant,
  onRefresh,
  onOpenWebphone,
}) => {
  const [activeTab, setActiveTab] = useState<'cdr' | 'recordings' | 'transcriptions' | 'reports'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound' | 'internal'>('all');
  const [dispositionFilter, setDispositionFilter] = useState<'all' | 'ANSWERED' | 'NO ANSWER'>('all');
  const [handlingFilter, setHandlingFilter] = useState<'all' | 'ai' | 'transferred' | 'human' | 'has_recording'>(
    initialTab === 'recordings' ? 'has_recording' : 'all'
  );
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [isSummarizingId, setIsSummarizingId] = useState<string | null>(null);
  const [selectedCdrForModal, setSelectedCdrForModal] = useState<CdrRecord | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      if (initialTab === 'recordings') {
        setHandlingFilter('has_recording');
      } else if (initialTab === 'cdr') {
        setHandlingFilter('all');
      }
    }
  }, [initialTab]);

  // Audio Playback state
  const [activeAudioCdr, setActiveAudioCdr] = useState<CdrRecord | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const handlePlayRecording = (cdr: CdrRecord) => {
    if (activeAudioCdr?.id === cdr.id && isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      return;
    }

    setActiveAudioCdr(cdr);
    setIsPlayingAudio(true);
    setAudioProgress(0);

    stopSpeaking();
    const textToRead =
      cdr.transcription ||
      cdr.summary ||
      `Gravação da chamada de ${cdr.caller} para ${cdr.callee}. Duração de ${cdr.duration} segundos com status ${cdr.disposition}.`;

    const isRoberto =
      cdr.callee === '4102' ||
      cdr.caller === '4102' ||
      cdr.transferredTo?.includes('4102') ||
      cdr.transferredTo?.toLowerCase().includes('roberto') ||
      textToRead.toLowerCase().includes('roberto');

    const isCarlos =
      cdr.callee === '4101' ||
      cdr.caller === '4101' ||
      textToRead.toLowerCase().includes('carlos');

    const gender = isRoberto || isCarlos ? 'male' : detectVoiceGender(textToRead, undefined, 'female');
    const persona = isRoberto ? 'roberto' : isCarlos ? 'carlos' : 'maia';

    const totalSec = Math.max(6, Math.min(20, cdr.duration || 10));
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 0.5;
      const pct = Math.min(100, Math.round((elapsed / totalSec) * 100));
      setAudioProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
      }
    }, 500);

    speakHumanized(textToRead, {
      gender,
      persona,
      onStart: () => setIsPlayingAudio(true),
      onEnd: () => {
        setIsPlayingAudio(false);
        setAudioProgress(100);
        clearInterval(interval);
      },
      onError: () => {
        setIsPlayingAudio(false);
        clearInterval(interval);
      },
    });
  };

  const handleStopAudio = () => {
    stopSpeaking();
    setIsPlayingAudio(false);
    setAudioProgress(0);
  };

  // Filtered CDRs calculation
  const filteredCdrs = useMemo(() => {
    return cdrs.filter((cdr) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        cdr.caller.toLowerCase().includes(term) ||
        cdr.callee.toLowerCase().includes(term) ||
        (cdr.uniqueId && cdr.uniqueId.toLowerCase().includes(term)) ||
        (cdr.transferredTo && cdr.transferredTo.toLowerCase().includes(term)) ||
        (cdr.summary && cdr.summary.toLowerCase().includes(term));

      const matchDir = directionFilter === 'all' || cdr.direction === directionFilter;
      const matchDisp = dispositionFilter === 'all' || cdr.disposition === dispositionFilter;

      // Handling filter: AI, Transferred, Human, Has Recording
      let matchHandling = true;
      if (handlingFilter === 'ai') {
        matchHandling = Boolean(cdr.isAiHandled || cdr.aiAgentId);
      } else if (handlingFilter === 'transferred') {
        matchHandling = Boolean(cdr.isTransferred || cdr.transferredTo);
      } else if (handlingFilter === 'human') {
        matchHandling = !cdr.isAiHandled && !cdr.aiAgentId;
      } else if (handlingFilter === 'has_recording') {
        matchHandling = Boolean(cdr.recordingUrl);
      }

      // Sentiment filter
      const matchSentiment =
        sentimentFilter === 'all' || cdr.sentiment === sentimentFilter;

      return matchSearch && matchDir && matchDisp && matchHandling && matchSentiment;
    });
  }, [cdrs, searchTerm, directionFilter, dispositionFilter, handlingFilter, sentimentFilter]);

  // Key KPI stats
  const stats = useMemo(() => {
    const total = cdrs.length;
    const aiHandled = cdrs.filter((c) => c.isAiHandled || c.aiAgentId).length;
    const transferred = cdrs.filter((c) => c.isTransferred || c.transferredTo).length;
    const answered = cdrs.filter((c) => c.disposition === 'ANSWERED').length;
    const answerRate = total > 0 ? Math.round((answered / total) * 100) : 100;
    const totalCost = cdrs.reduce((acc, c) => acc + (c.costBrl || 0), 0);
    const aiContained = cdrs.filter(
      (c) => (c.isAiHandled || c.aiAgentId) && !c.isTransferred && !c.transferredTo
    ).length;
    const aiContainmentRate = aiHandled > 0 ? Math.round((aiContained / aiHandled) * 100) : 0;

    return { total, aiHandled, transferred, answerRate, totalCost, aiContainmentRate };
  }, [cdrs]);

  const handleSummarizeWithGemini = async (cdr: CdrRecord) => {
    setIsSummarizingId(cdr.id);
    try {
      const res = await fetch(`/api/v1/cdr/${cdr.id}/summarize`, { method: 'POST' });
      const data = await res.json();
      if (data.analysis) {
        cdr.summary = data.analysis.summary;
        cdr.sentiment = data.analysis.sentiment || 'positive';
        if (selectedCdrForModal?.id === cdr.id) {
          setSelectedCdrForModal({
            ...cdr,
            summary: data.analysis.summary,
            sentiment: data.analysis.sentiment || 'positive',
          });
        }
      }
      onRefresh();
    } catch (err) {
      console.error('Summarize error:', err);
    } finally {
      setIsSummarizingId(null);
    }
  };

  const handleExportCsv = () => {
    const headers = 'ID,Origem,Destino,Direcao,Inicio,Duracao(s),Tarifado(s),Status,Agente_IA,Transferido_Para,Sentimento,Resumo\n';
    const rows = filteredCdrs
      .map(
        (c) =>
          `"${c.uniqueId}","${c.caller}","${c.callee}","${c.direction}","${c.startTime}",${c.duration},${c.billsec},"${c.disposition}","${c.aiAgentId || (c.isAiHandled ? 'MaIA' : 'Nenhum')}","${c.transferredTo || (c.isTransferred ? 'Sim' : 'Nao')}","${c.sentiment || 'N/A'}","${(c.summary || '').replace(/"/g, '""')}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `enlace-pbx-cdr-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExecutivePdf = () => {
    const filtersText = [
      directionFilter !== 'all' ? `Direção: ${directionFilter}` : null,
      dispositionFilter !== 'all' ? `Status: ${dispositionFilter}` : null,
      handlingFilter !== 'all' ? `Atendimento: ${handlingFilter}` : null,
    ].filter(Boolean).join(', ') || 'Todas as chamadas do período';

    exportCdrReportPdf(
      filteredCdrs,
      activeTab === 'reports' ? 'Relatório Executivo de SLA & Performance Asterisk 20' : 'Relatório Gerencial de Chamadas & Telefonia IA',
      filtersText,
      currentTenant?.name || 'Enlace Telecomunicações — Matriz São Paulo'
    );
  };


  // Dynamic SLA Calculations for Reports Tab
  const slaMetrics = useMemo(() => {
    const total = filteredCdrs.length;
    const answered = filteredCdrs.filter(c => c.disposition === 'ANSWERED');
    const abandoned = filteredCdrs.filter(c => c.disposition === 'NO ANSWER');
    
    // TME (Tempo Médio de Espera) = duration - billsec (for answered)
    let totalWaitTime = 0;
    answered.forEach(c => {
      totalWaitTime += Math.max(0, c.duration - c.billsec);
    });
    // Add abandoned duration as wait time
    abandoned.forEach(c => {
      totalWaitTime += c.duration;
    });
    const avgWaitTime = total > 0 ? Math.round(totalWaitTime / total) : 0;
    
    // TMA (Tempo Médio de Atendimento) = billsec (for answered)
    const totalTalkTime = answered.reduce((acc, c) => acc + c.billsec, 0);
    const avgTalkTime = answered.length > 0 ? Math.round(totalTalkTime / answered.length) : 0;
    
    // Abandon Rate
    const abandonRate = total > 0 ? ((abandoned.length / total) * 100).toFixed(1) : '0.0';

    return {
      tme: avgWaitTime,
      tma: avgTalkTime,
      abandonRate: parseFloat(abandonRate)
    };
  }, [filteredCdrs]);

  // Sentiment data for chart
  const sentimentData = useMemo(() => {
    const pos = cdrs.filter(c => c.sentiment === 'positive').length;
    const neu = cdrs.filter(c => c.sentiment === 'neutral').length;
    const neg = cdrs.filter(c => c.sentiment === 'negative').length;
    return [
      { name: 'Positivo', value: pos, color: '#10b981' },
      { name: 'Neutro', value: neu, color: '#3b82f6' },
      { name: 'Negativo', value: neg, color: '#f43f5e' }
    ].filter(d => d.value > 0);
  }, [cdrs]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {activeTab === 'cdr' ? (
                <>
                  <FileText className="w-8 h-8 text-blue-600" />
                  Histórico de Chamadas (CDR)
                </>
              ) : activeTab === 'recordings' ? (
                <>
                  <Mic className="w-8 h-8 text-blue-600" />
                  Gravações & Player de Áudio
                </>
              ) : activeTab === 'transcriptions' ? (
                <>
                  <Sparkles className="w-8 h-8 text-blue-600" />
                  Transcrições & IA (Gemini RAG)
                </>
              ) : (
                <>
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                  Relatórios Executivos & SLA
                </>
              )}
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500">
            {activeTab === 'cdr'
              ? 'Bilhetagem completa do Asterisk 20, tarifas, duração e status de todas as chamadas.'
              : activeTab === 'recordings'
              ? 'Armazenamento de áudio em alta definição (Opus/WAV), reprodução web e download.'
              : activeTab === 'transcriptions'
              ? 'Transcrição semântica de chamadas, análise de sentimento e sumarização via Google Gemini.'
              : 'Indicadores de qualidade, tempo de espera na fila, nível de serviço e relatórios oficiais em PDF.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExecutivePdf}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-sm"
            title="Exportar relatório formatado com logo oficial em PDF"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Relatório PDF</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 transition border border-slate-200 shadow-xs"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>CSV</span>
          </button>
          <button
            onClick={onRefresh}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-500 rounded-xl transition border border-slate-200 shadow-xs"
            title="Atualizar registros"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subnav Tabs corresponding to Sidebar items */}
      <div className="flex flex-col sm:flex-row border border-slate-200 bg-white rounded-xl p-1 shadow-xs gap-1">
        <button
          onClick={() => { setActiveTab('cdr'); setHandlingFilter('all'); }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'cdr'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Histórico CDR (Bilhetes)
        </button>
        <button
          onClick={() => { setActiveTab('recordings'); setHandlingFilter('has_recording'); }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'recordings'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Mic className="w-4 h-4" />
          Gravações & Player de Áudio
        </button>
        <button
          onClick={() => { setActiveTab('transcriptions'); setHandlingFilter('all'); }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'transcriptions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Transcrições & IA (Gemini RAG)
        </button>
        <button
          onClick={() => { setActiveTab('reports'); setHandlingFilter('all'); }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'reports'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Relatórios & SLA (Executivo)
        </button>
      </div>

      {/* SLA & Executive Reports Dashboard - Visible in reports tab */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <div className="col-span-12">
             <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
               <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                   <h2 className="text-2xl font-black mb-2">Relatório Executivo de SLA</h2>
                   <p className="text-slate-300 text-sm max-w-2xl">
                     Visão gerencial consolidada do desempenho da operação de telefonia, qualidade de atendimento (QA) analisada por IA e cumprimento dos Acordos de Nível de Serviço (SLA).
                   </p>
                 </div>
                 <button
                   onClick={handleExportExecutivePdf}
                   className="shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition"
                 >
                   <Printer className="w-5 h-5" />
                   Gerar Dossiê PDF
                 </button>
               </div>
             </div>
          </div>
          
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Activity className="w-4 h-4 text-emerald-500" /> TME (Tempo Médio de Espera)
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 20s</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">{slaMetrics.tme}s</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${slaMetrics.tme <= 20 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                {slaMetrics.tme <= 20 ? 'Aprovado' : 'Alerta SLA'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Clock className="w-4 h-4 text-blue-500" /> TMA (Tempo Médio de Atend.)
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 3m</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">{Math.floor(slaMetrics.tma / 60)}m{slaMetrics.tma % 60}s</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${slaMetrics.tma <= 180 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                {slaMetrics.tma <= 180 ? 'Dentro do Padrão' : 'Atenção Operacional'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <PhoneIncoming className="w-4 h-4 text-amber-500" /> Taxa de Abandono
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 5%</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">{slaMetrics.abandonRate}%</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${slaMetrics.abandonRate <= 5 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                {slaMetrics.abandonRate <= 5 ? 'Excelente' : 'Crítico'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SLA & Executive Reports Dashboard - Visible in reports tab */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <div className="col-span-12">
             <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
               <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                   <h2 className="text-2xl font-black mb-2">Relatório Executivo de SLA</h2>
                   <p className="text-slate-300 text-sm max-w-2xl">
                     Visão gerencial consolidada do desempenho da operação de telefonia, qualidade de atendimento (QA) analisada por IA e cumprimento dos Acordos de Nível de Serviço (SLA).
                   </p>
                 </div>
                 <button
                   onClick={handleExportExecutivePdf}
                   className="shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition"
                 >
                   <Printer className="w-5 h-5" />
                   Gerar Dossiê PDF
                 </button>
               </div>
             </div>
          </div>
          
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Activity className="w-4 h-4 text-emerald-500" /> TME (Tempo Médio de Espera)
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 20s</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">{slaMetrics.tme}s</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${slaMetrics.tme <= 20 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                {slaMetrics.tme <= 20 ? 'Aprovado' : 'Alerta SLA'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Clock className="w-4 h-4 text-blue-500" /> TMA (Tempo Médio de Atend.)
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 3m</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">{Math.floor(slaMetrics.tma / 60)}m{slaMetrics.tma % 60}s</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${slaMetrics.tma <= 180 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                {slaMetrics.tma <= 180 ? 'Dentro do Padrão' : 'Atenção Operacional'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <PhoneIncoming className="w-4 h-4 text-amber-500" /> Taxa de Abandono
              </span>
              <p className="text-[10px] text-slate-400 font-medium">SLA Meta: &lt; 5%</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-800">{slaMetrics.abandonRate}%</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${slaMetrics.abandonRate <= 5 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                {slaMetrics.abandonRate <= 5 ? 'Excelente' : 'Crítico'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Dashboard - Only visible in Transcriptions tab as requested */}
      {activeTab === 'transcriptions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* KPI: Resolution Rate */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-4 -mt-4 z-0" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-blue-500" /> Containment (IA)
                </span>
                <p className="text-[10px] text-slate-400 font-medium">Resoluções sem transbordo humano</p>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-800 tracking-tighter">{stats.aiContainmentRate}%</span>
              </div>
            </div>
          </div>
  
          {/* KPI: Call Volume */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <FileText className="w-4 h-4 text-emerald-500" /> Volume CDR
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Bilhetes e logs na base de dados</p>
            </div>
            <div className="mt-4 flex flex-col">
              <span className="text-4xl font-black text-slate-800">{stats.total}</span>
              <span className="text-xs text-emerald-600 font-bold mt-1 bg-emerald-50 self-start px-2 py-0.5 rounded">
                {stats.answerRate}% taxa de atendimento
              </span>
            </div>
          </div>
  
          {/* Chart: Sentiment */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-6">
            <div className="flex-1">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-purple-500" /> Análise Semântica
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mb-4">
                Distribuição de sentimentos analisados pelo Gemini em tempo real durante as conversas (Voz e WABA).
              </p>
              <div className="grid grid-cols-3 gap-2">
                 {sentimentData.map((s, i) => (
                   <div key={i} className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                     <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                     <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">{s.name}</div>
                   </div>
                 ))}
              </div>
            </div>
            <div className="w-36 h-36 relative">
              {sentimentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      paddingAngle={3} dataKey="value" stroke="none"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-slate-50 rounded-full border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Sem Dados</span>
                </div>
              )}
            </div>
          </div>
  
        </div>
      )}

      {/* Enhanced Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="flex items-center gap-2 flex-1 min-w-[240px] bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número, ramal, transbordo ou palavra-chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-slate-800 placeholder-slate-400 w-full focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Selectors */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Process Type Filter (AI / Transferred / Human) */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium text-[11px]">Tipo:</span>
              <select
                value={handlingFilter}
                onChange={(e) => setHandlingFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos os Tipos</option>
                <option value="ai">🤖 Atendidas por IA (MaIA)</option>
                <option value="transferred">➡️ Transferidas (ARI)</option>
                <option value="human">👤 Humanas Diretas</option>
                <option value="has_recording">🎙️ Com Gravação de Voz</option>
              </select>
            </div>

            {/* Direction Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium text-[11px]">Direção:</span>
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none"
              >
                <option value="all">Todas</option>
                <option value="inbound">Entrada (Inbound)</option>
                <option value="outbound">Saída (Outbound)</option>
                <option value="internal">Interna</option>
              </select>
            </div>

            {/* Disposition Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium text-[11px]">Status:</span>
              <select
                value={dispositionFilter}
                onChange={(e) => setDispositionFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="ANSWERED">Atendidas</option>
                <option value="NO ANSWER">Não Atendidas</option>
              </select>
            </div>

            {/* Sentiment Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium text-[11px]">Sentimento:</span>
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="positive">🟢 Positivo</option>
                <option value="neutral">🔵 Neutro</option>
                <option value="negative">🔴 Negativo / Reclamação</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filter Pill Shortcuts */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
          <span className="text-slate-400 text-[10px] font-mono mr-1">Filtros rápidos:</span>
          <button
            onClick={() => {
              setHandlingFilter('ai');
              setDirectionFilter('all');
            }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition ${
              handlingFilter === 'ai'
                ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            🤖 Só IA (MaIA)
          </button>
          <button
            onClick={() => {
              setHandlingFilter('transferred');
              setDirectionFilter('all');
            }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition ${
              handlingFilter === 'transferred'
                ? 'bg-amber-100 text-amber-800 border border-amber-300 font-bold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            ➡️ Só Transferidas
          </button>
          <button
            onClick={() => {
              setHandlingFilter('has_recording');
              setDirectionFilter('all');
            }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition ${
              handlingFilter === 'has_recording'
                ? 'bg-blue-100 text-blue-800 border border-blue-300 font-bold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            🎙️ Com Áudio MixMonitor
          </button>
          {(handlingFilter !== 'all' || directionFilter !== 'all' || dispositionFilter !== 'all' || sentimentFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setHandlingFilter('all');
                setDirectionFilter('all');
                setDispositionFilter('all');
                setSentimentFilter('all');
                setSearchTerm('');
              }}
              className="text-[10px] text-rose-600 hover:underline ml-2"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      </div>

      {/* CDR Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-mono text-[11px] uppercase">
                <th className="py-3.5 px-4">Data / Hora</th>
                <th className="py-3.5 px-4">Origem</th>
                <th className="py-3.5 px-4">Destino & Rota</th>
                <th className="py-3.5 px-4">Tratamento & Transferência</th>
                <th className="py-3.5 px-4">Duração</th>
                <th className="py-3.5 px-4">QoS (MOS)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Gravação</th>
                <th className="py-3.5 px-4">Análise IA Gemini</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredCdrs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="font-semibold text-slate-600">Nenhum registro de chamada encontrado</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tente alterar os filtros ou realizar uma nova chamada pelo Webphone.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCdrs.map((cdr) => (
                  <tr key={cdr.id} className="hover:bg-slate-50/80 transition">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      <div className="font-semibold text-slate-700">
                        {new Date(cdr.startTime).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-300" />
                        {new Date(cdr.startTime).toLocaleTimeString('pt-BR')}
                      </div>
                    </td>

                    {/* Caller */}
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900">{cdr.caller}</div>
                      {cdr.trunkName && (
                        <div className="text-[10px] text-slate-400 font-sans truncate max-w-[110px]">
                          {cdr.trunkName}
                        </div>
                      )}
                    </td>

                    {/* Callee & Direction */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-800 font-semibold">
                        {cdr.direction === 'inbound' && (
                          <PhoneIncoming className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        )}
                        {cdr.direction === 'outbound' && (
                          <PhoneOutgoing className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                        )}
                        {cdr.direction === 'internal' && (
                          <UserCheck className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        )}
                        <span>{cdr.callee}</span>
                      </div>
                      {cdr.ivrPath && (
                        <span className="inline-block text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-sans mt-0.5">
                          {cdr.ivrPath}
                        </span>
                      )}
                    </td>

                    {/* Handling & Transfer */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {(cdr.isAiHandled || cdr.aiAgentId) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-full w-fit shadow-2xs">
                            <Bot className="w-3 h-3 text-cyan-600" />
                            MaIA AI
                          </span>
                        )}
                        {(cdr.isTransferred || cdr.transferredTo) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full w-fit">
                            <Forward className="w-3 h-3 text-amber-600" />
                            {cdr.transferredTo || 'Transf. ARI'}
                          </span>
                        ) : !cdr.isAiHandled && !cdr.aiAgentId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                            Direta Humana
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                      <div>
                        {Math.floor(cdr.duration / 60)}m {cdr.duration % 60}s
                      </div>
                      <div className="text-[10px] text-slate-400">Tarif: {cdr.billsec}s</div>
                    </td>

                    {/* QoS (MOS) */}
                    <td className="py-3 px-4">
                      {cdr.mos ? (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded w-fit ${
                              cdr.mos >= 4.0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : cdr.mos >= 3.5
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                            title={`Jitter: ${cdr.jitter}ms | Loss: ${cdr.packetLoss}%`}
                          >
                            <Activity className="w-3 h-3" />
                            {cdr.mos}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {cdr.packetLoss}% loss
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs border inline-flex items-center gap-1 ${
                          cdr.disposition === 'ANSWERED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {cdr.disposition === 'ANSWERED' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <X className="w-3 h-3 text-rose-600" />
                        )}
                        {cdr.disposition === 'ANSWERED' ? 'Atendida' : 'Não Atend.'}
                      </span>
                    </td>

                    {/* Recording */}
                    <td className="py-3 px-4">
                      {cdr.recordingUrl ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handlePlayRecording(cdr)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition shadow-2xs ${
                              activeAudioCdr?.id === cdr.id && isPlayingAudio
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200'
                            }`}
                            title={activeAudioCdr?.id === cdr.id && isPlayingAudio ? 'Pausar áudio' : 'Ouvir gravação'}
                          >
                            {activeAudioCdr?.id === cdr.id && isPlayingAudio ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">WAV</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-mono">—</span>
                      )}
                    </td>

                    {/* AI Analysis & Summary */}
                    <td className="py-3 px-4">
                      {cdr.summary ? (
                        <div className="space-y-1">
                          <button
                            onClick={() => setSelectedCdrForModal(cdr)}
                            className="text-[11px] text-cyan-700 hover:text-cyan-900 flex items-center gap-1 font-semibold max-w-[200px] truncate text-left group"
                          >
                            <Sparkles className="w-3 h-3 text-cyan-600 flex-shrink-0 group-hover:rotate-12 transition-transform" />
                            <span className="truncate">{cdr.summary}</span>
                          </button>
                          {cdr.sentiment && (
                            <div className="flex items-center gap-1">
                              {cdr.sentiment === 'positive' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">
                                  <Smile className="w-2.5 h-2.5 text-emerald-600" /> Positivo
                                </span>
                              )}
                              {cdr.sentiment === 'neutral' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-medium">
                                  <Meh className="w-2.5 h-2.5 text-blue-600" /> Neutro
                                </span>
                              )}
                              {cdr.sentiment === 'negative' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded font-medium">
                                  <Frown className="w-2.5 h-2.5 text-rose-600" /> Atenção
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSummarizeWithGemini(cdr)}
                          disabled={isSummarizingId === cdr.id}
                          className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          {isSummarizingId === cdr.id ? 'Analisando...' : 'Resumir IA'}
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenWebphone(cdr.caller)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition border border-slate-200"
                        >
                          Ligar
                        </button>
                        <button
                          onClick={() => exportCallDossierPdf(cdr, currentTenant?.name)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition border border-transparent hover:border-blue-100"
                          title="Exportar Dossiê da Chamada em PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedCdrForModal(cdr)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                          title="Ver detalhes da chamada"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Call Lifecycle & AI Summary Modal */}
      {selectedCdrForModal && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Detalhes do Bilhete (CDR) & Análise Gemini
                </h3>
              </div>
              <button
                onClick={() => setSelectedCdrForModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
              {/* Top metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Origem</span>
                  <span className="text-slate-900 font-bold">{selectedCdrForModal.caller}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Destino</span>
                  <span className="text-slate-900 font-bold">{selectedCdrForModal.callee}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Duração / Fatura</span>
                  <span className="text-slate-900 font-semibold">{selectedCdrForModal.duration}s ({selectedCdrForModal.billsec}s)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">QoS (MOS)</span>
                  <span className="text-slate-900 font-semibold">{selectedCdrForModal.mos ? `${selectedCdrForModal.mos} (J: ${selectedCdrForModal.jitter}ms, L: ${selectedCdrForModal.packetLoss}%)` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Custo Estimado</span>
                  <span className="text-slate-900 font-semibold">R$ {selectedCdrForModal.costBrl.toFixed(2)}</span>
                </div>
              </div>

              {/* Call Journey & Architecture Timeline */}
              <div>
                <label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider block mb-2 font-mono">
                  Fluxo de Roteamento & Vida da Chamada:
                </label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">Conexão SIP / PJSIP</div>
                      <p className="text-[11px] text-slate-500">
                        Início em {new Date(selectedCdrForModal.startTime).toLocaleString('pt-BR')} via tronco {selectedCdrForModal.trunkName || 'PJSIP local'}.
                      </p>
                    </div>
                  </div>

                  {selectedCdrForModal.ivrPath && (
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">Navegação URA</div>
                        <p className="text-[11px] text-slate-500">
                          {selectedCdrForModal.ivrPath}
                        </p>
                      </div>
                    </div>
                  )}

                  {(selectedCdrForModal.isAiHandled || selectedCdrForModal.aiAgentId) && (
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
                        {selectedCdrForModal.ivrPath ? '3' : '2'}
                      </div>
                      <div>
                        <div className="font-semibold text-cyan-800 flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5 text-cyan-600" />
                          Atendimento Virtual Gemini (MaIA)
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Sessão bidirecional via AudioSocket em 24kHz com transcrição e execução de ferramentas.
                        </p>
                      </div>
                    </div>
                  )}

                  {(selectedCdrForModal.isTransferred || selectedCdrForModal.transferredTo) && (
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
                        &rarr;
                      </div>
                      <div>
                        <div className="font-semibold text-amber-800 flex items-center gap-1.5">
                          <Forward className="w-3.5 h-3.5 text-amber-600" />
                          Transferência Assistida ARI
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Encaminhada para <span className="font-bold text-slate-900">{selectedCdrForModal.transferredTo}</span> após qualificação do atendimento.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Summary and Sentiment */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider font-mono">
                    Resumo e Análise de Conteúdo (Gemini 3.8):
                  </label>
                  {selectedCdrForModal.sentiment && (
                    <span className="text-[10px] font-semibold text-slate-600">
                      Sentimento: <strong className="capitalize">{selectedCdrForModal.sentiment}</strong>
                    </span>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedCdrForModal.summary || 'Nenhum resumo gerado ainda. Clique em "Resumir com IA" na tabela para processar via Gemini.'}
                </div>
              </div>

              {/* Full Transcription */}
              {selectedCdrForModal.transcription && (
                <div>
                  <label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider block mb-1.5 font-mono">
                    Transcrição Integral da Conversa:
                  </label>
                  <pre className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-700 font-mono text-[11px] max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {selectedCdrForModal.transcription}
                  </pre>
                </div>
              )}

              {/* Audio Playback button inside modal */}
              {selectedCdrForModal.recordingUrl && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold">
                    <Mic className="w-4 h-4 text-blue-600" />
                    <span>Gravação de Áudio Stereo (Opus/MixMonitor)</span>
                  </div>
                  <button
                    onClick={() => handlePlayRecording(selectedCdrForModal)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs transition"
                  >
                    {activeAudioCdr?.id === selectedCdrForModal.id && isPlayingAudio ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        Pausar Áudio
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Reproduzir Áudio
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Modal footer buttons */}
              <div className="pt-2 flex justify-between items-center border-t border-slate-100 gap-2">
                <button
                  onClick={() => {
                    const num = selectedCdrForModal.caller;
                    setSelectedCdrForModal(null);
                    onOpenWebphone(num);
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-semibold flex items-center gap-1.5 transition border border-blue-200 text-xs"
                >
                  <PhoneIncoming className="w-3.5 h-3.5" />
                  Retornar Chamada
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedCdrForModal) {
                        exportCallDossierPdf(selectedCdrForModal, currentTenant?.name);
                      }
                    }}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition shadow-xs text-xs"
                    title="Baixar dossiê com dados e logo em PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Dossiê em PDF (com Logo)
                  </button>

                  <button
                    onClick={() => setSelectedCdrForModal(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition text-xs"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Audio Player Toolbar */}
      {activeAudioCdr && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-2xl bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl shadow-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePlayRecording(activeAudioCdr)}
                className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition shadow-md"
              >
                {isPlayingAudio ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {activeAudioCdr.caller} &rarr; {activeAudioCdr.callee}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                    {activeAudioCdr.duration}s
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-pulse" />
                    Opus 24kHz / Asterisk MixMonitor
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate max-w-md">
                  {activeAudioCdr.summary || activeAudioCdr.transcription || 'Reproduzindo stream de voz da gravação...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeAudioCdr.summary && (
                <button
                  onClick={() => setSelectedCdrForModal(activeAudioCdr)}
                  className="px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Ver Resumo
                </button>
              )}
              <button
                onClick={handleStopAudio}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
                title="Fechar reprodutor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar and waveform */}
          <div className="space-y-1">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${audioProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{Math.round((audioProgress / 100) * (activeAudioCdr.duration || 10))}s</span>
              <span>{activeAudioCdr.duration}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
