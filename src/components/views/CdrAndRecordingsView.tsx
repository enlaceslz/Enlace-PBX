import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { CdrRecord } from '../../types/pbx';

interface CdrAndRecordingsProps {
  cdrs: CdrRecord[];
  onRefresh: () => void;
  onOpenWebphone: (number: string) => void;
}

export const CdrAndRecordingsView: React.FC<CdrAndRecordingsProps> = ({
  cdrs,
  onRefresh,
  onOpenWebphone,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound' | 'internal'>('all');
  const [dispositionFilter, setDispositionFilter] = useState<'all' | 'ANSWERED' | 'NO ANSWER'>('all');
  const [handlingFilter, setHandlingFilter] = useState<'all' | 'ai' | 'transferred' | 'human' | 'has_recording'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [isSummarizingId, setIsSummarizingId] = useState<string | null>(null);
  const [selectedCdrForModal, setSelectedCdrForModal] = useState<CdrRecord | null>(null);

  // Audio Playback state
  const [activeAudioCdr, setActiveAudioCdr] = useState<CdrRecord | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const handlePlayRecording = (cdr: CdrRecord) => {
    if (activeAudioCdr?.id === cdr.id && isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
      return;
    }

    setActiveAudioCdr(cdr);
    setIsPlayingAudio(true);
    setAudioProgress(0);

    window.speechSynthesis?.cancel();
    const textToRead =
      cdr.transcription ||
      cdr.summary ||
      `Gravação da chamada de ${cdr.caller} para ${cdr.callee}. Duração de ${cdr.duration} segundos com status ${cdr.disposition}.`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;

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

    utterance.onend = () => {
      setIsPlayingAudio(false);
      setAudioProgress(100);
      clearInterval(interval);
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
      clearInterval(interval);
    };

    window.speechSynthesis?.speak(utterance);
  };

  const handleStopAudio = () => {
    window.speechSynthesis?.cancel();
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Histórico de Chamadas (CDR) & Gravações
            </h1>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono font-bold">
              PostgreSQL • Transcrição Gemini 3.8
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Registro detalhado com rastreamento de transferências ARI, retenção de atendentes de IA e bilhetagem brasileira.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          <button
            onClick={onRefresh}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200"
            title="Atualizar registros"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Total de Chamadas</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">{stats.total}</div>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
            {stats.answerRate}% atendidas com sucesso
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Atendidas por IA</span>
            <Bot className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-cyan-700 font-mono mt-1">{stats.aiHandled}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {stats.aiContainmentRate}% resolvidas sem transbordo
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Transferências ARI</span>
            <PhoneForwarded className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono mt-1">{stats.transferred}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Encaminhadas entre ramais/filas
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Custo Bilhetado</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            R$ {stats.totalCost.toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Tarifação pública e tokens IA
          </p>
        </div>
      </div>

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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-[11px]">
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
              <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                <button
                  onClick={() => {
                    const num = selectedCdrForModal.caller;
                    setSelectedCdrForModal(null);
                    onOpenWebphone(num);
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-semibold flex items-center gap-1.5 transition border border-blue-200"
                >
                  <PhoneIncoming className="w-3.5 h-3.5" />
                  Retornar Chamada
                </button>

                <button
                  onClick={() => setSelectedCdrForModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Fechar
                </button>
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
