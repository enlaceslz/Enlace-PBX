import React, { useState } from 'react';
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
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isSummarizingId, setIsSummarizingId] = useState<string | null>(null);
  const [selectedCdrForModal, setSelectedCdrForModal] = useState<CdrRecord | null>(null);

  const filteredCdrs = cdrs.filter((cdr) => {
    const matchSearch =
      cdr.caller.includes(searchTerm) ||
      cdr.callee.includes(searchTerm) ||
      (cdr.uniqueId && cdr.uniqueId.includes(searchTerm));
    const matchDir = directionFilter === 'all' || cdr.direction === directionFilter;
    const matchDisp = dispositionFilter === 'all' || cdr.disposition === dispositionFilter;
    return matchSearch && matchDir && matchDisp;
  });

  const handleSummarizeWithGemini = async (cdr: CdrRecord) => {
    setIsSummarizingId(cdr.id);
    try {
      const res = await fetch(`/api/v1/cdr/${cdr.id}/summarize`, { method: 'POST' });
      const data = await res.json();
      if (data.analysis) {
        cdr.summary = data.analysis.summary;
        if (selectedCdrForModal?.id === cdr.id) {
          setSelectedCdrForModal({ ...cdr, summary: data.analysis.summary });
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
    const headers = 'ID,Origem,Destino,Direção,Início,Duração(s),Tarifado(s),Status,Agente IA,Resumo\n';
    const rows = filteredCdrs
      .map(
        (c) =>
          `"${c.uniqueId}","${c.caller}","${c.callee}","${c.direction}","${c.startTime}",${c.duration},${c.billsec},"${c.disposition}","${c.aiAgentId || 'Nenhum'}","${(c.summary || '').replace(/"/g, '""')}"`
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Histórico de Chamadas (CDR) & Gravações
            </h1>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
              PostgreSQL • Transcrição Gemini
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Registro detalhado de chamadas, bilhetagem com regras de telefonia brasileira e análise de IA.
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
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrar por número, ramal ou ID da chamada..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-slate-700 placeholder-slate-500 w-full focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Direção:</span>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 text-xs focus:outline-none"
            >
              <option value="all">Todas</option>
              <option value="inbound">Entrada (Inbound)</option>
              <option value="outbound">Saída (Outbound)</option>
              <option value="internal">Interna</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={dispositionFilter}
              onChange={(e) => setDispositionFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 text-xs focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="ANSWERED">Atendidas</option>
              <option value="NO ANSWER">Não Atendidas</option>
            </select>
          </div>
        </div>
      </div>

      {/* CDR Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-mono text-[11px] uppercase">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Origem</th>
                <th className="py-3 px-4">Destino</th>
                <th className="py-3 px-4">Direção</th>
                <th className="py-3 px-4">Duração</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Gravação</th>
                <th className="py-3 px-4">Análise IA</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredCdrs.map((cdr) => (
                <tr key={cdr.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    <div>{new Date(cdr.startTime).toLocaleDateString('pt-BR')}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(cdr.startTime).toLocaleTimeString('pt-BR')}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {cdr.caller}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {cdr.callee}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                        cdr.direction === 'inbound'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                          : cdr.direction === 'outbound'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 shadow-sm'
                      }`}
                    >
                      {cdr.direction}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {Math.floor(cdr.duration / 60)}m {cdr.duration % 60}s
                    <div className="text-[10px] text-slate-500">Bill: {cdr.billsec}s</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-sm border ${
                        cdr.disposition === 'ANSWERED'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {cdr.disposition}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {cdr.recordingUrl ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPlayingId(playingId === cdr.id ? null : cdr.id)}
                          className="w-7 h-7 rounded-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-600 flex items-center justify-center transition"
                          title="Tocar gravação"
                        >
                          {playingId === cdr.id ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>
                        <span className="text-[10px] text-slate-500 font-mono">WAV/Opus</span>
                      </div>
                    ) : (
                      <span className="text-slate-700 text-[10px]">Sem gravação</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {cdr.summary ? (
                      <button
                        onClick={() => setSelectedCdrForModal(cdr)}
                        className="text-[11px] text-teal-600 hover:underline flex items-center gap-1 font-semibold max-w-[200px] truncate"
                      >
                        <Sparkles className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{cdr.summary}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSummarizeWithGemini(cdr)}
                        disabled={isSummarizingId === cdr.id}
                        className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3" />
                        {isSummarizingId === cdr.id ? 'Analisando...' : 'Resumir com IA'}
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onOpenWebphone(cdr.caller)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-medium transition"
                    >
                      Retornar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Detailed AI Call Summary */}
      {selectedCdrForModal && (
        <div className="fixed inset-0 z-50 bg-slate-50/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Resumo Executivo da Chamada (Gemini)
                </h3>
              </div>
              <button
                onClick={() => setSelectedCdrForModal(null)}
                className="p-1 text-slate-500 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block">Origem:</span>
                  <span className="text-slate-700 font-bold">{selectedCdrForModal.caller}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Destino:</span>
                  <span className="text-slate-700 font-bold">{selectedCdrForModal.callee}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Duração:</span>
                  <span className="text-slate-700">{selectedCdrForModal.duration} segundos</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Data:</span>
                  <span className="text-slate-700">
                    {new Date(selectedCdrForModal.startTime).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider block mb-1.5">
                  Resumo e Tópicos Discutidos:
                </label>
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedCdrForModal.summary}
                </div>
              </div>

              {selectedCdrForModal.transcription && (
                <div>
                  <label className="text-slate-500 uppercase text-[10px] font-bold tracking-wider block mb-1.5">
                    Transcrição Integral da Conversa:
                  </label>
                  <pre className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedCdrForModal.transcription}
                  </pre>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedCdrForModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
