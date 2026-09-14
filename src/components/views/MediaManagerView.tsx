import React, { useState, useRef } from 'react';
import { 
  Play, 
  Square, 
  Upload, 
  Trash2, 
  Mic, 
  Wand2, 
  Music, 
  FileAudio, 
  Search, 
  Bot, 
  Volume2, 
  Clock, 
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AudioFile {
  id: string;
  name: string;
  category: 'ivr' | 'moh' | 'prompt' | 'voicemail';
  duration: string;
  format: string;
  createdAt: string;
  size: string;
  isAiGenerated: boolean;
}

const mockAudioFiles: AudioFile[] = [
  { id: '1', name: 'ura_principal_dia.wav', category: 'ivr', duration: '00:15', format: 'WAV 16-bit 8kHz', createdAt: '2026-09-10', size: '240 KB', isAiGenerated: true },
  { id: '2', name: 'ura_fora_horario.wav', category: 'ivr', duration: '00:22', format: 'WAV 16-bit 8kHz', createdAt: '2026-09-10', size: '350 KB', isAiGenerated: true },
  { id: '3', name: 'espera_corporativa.mp3', category: 'moh', duration: '03:45', format: 'MP3 128kbps', createdAt: '2026-08-15', size: '3.4 MB', isAiGenerated: false },
  { id: '4', name: 'aviso_feriado.wav', category: 'prompt', duration: '00:08', format: 'WAV 16-bit 8kHz', createdAt: '2026-09-01', size: '128 KB', isAiGenerated: true },
  { id: '5', name: 'anuncio_posicao_fila.wav', category: 'prompt', duration: '00:04', format: 'WAV 16-bit 8kHz', createdAt: '2026-07-22', size: '64 KB', isAiGenerated: false },
];

export const MediaManagerView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'ai_tts'>('library');
  const [files, setFiles] = useState<AudioFile[]>(mockAudioFiles);
  const [searchTerm, setSearchTerm] = useState('');
  
  // TTS State
  const [ttsScript, setTtsScript] = useState('Olá! Seja muito bem-vindo à Enlace Telecom. Para suporte técnico, digite 1. Para comercial, digite 2.');
  const [ttsVoice, setTtsVoice] = useState<'maia_female' | 'roberto_male'>('maia_female');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSuccess, setGeneratedSuccess] = useState(false);
  
  // Audio Player State (Mock)
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlayMock = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
      // Auto stop after 3 seconds for mock
      setTimeout(() => setPlayingId(null), 3000);
    }
  };

  const handleGenerateTTS = () => {
    if (!ttsScript.trim()) return;
    setIsGenerating(true);
    setGeneratedSuccess(false);
    
    // Simulate AI Generation
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedSuccess(true);
      
      const newFile: AudioFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: `tts_gerado_${new Date().getTime().toString().slice(-4)}.wav`,
        category: 'ivr',
        duration: '00:12',
        format: 'WAV 16-bit 8kHz',
        createdAt: new Date().toISOString().split('T')[0],
        size: '185 KB',
        isAiGenerated: true
      };
      
      setFiles([newFile, ...files]);
      
      setTimeout(() => {
        setGeneratedSuccess(false);
        setActiveTab('library');
      }, 2000);
      
    }, 2500);
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Volume2 className="w-8 h-8 text-blue-600" />
            Mídia e Áudios
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os áudios da URA, músicas de espera e gere locuções profissionais com Inteligência Artificial.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'library' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileAudio className="w-4 h-4" />
              Biblioteca
            </div>
          </button>
          <button
            onClick={() => setActiveTab('ai_tts')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'ai_tts' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Estúdio de IA (TTS)
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'library' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar arquivo de áudio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Fazer Upload
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                  <th className="px-6 py-4">Arquivo</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Duração</th>
                  <th className="px-6 py-4">Formato / Tamanho</th>
                  <th className="px-6 py-4">Origem</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/50 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handlePlayMock(file.id)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
                            playingId === file.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'
                          }`}
                        >
                          {playingId === file.id ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                        <div>
                          <p className="font-semibold text-slate-800">{file.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{file.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        file.category === 'ivr' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                        file.category === 'moh' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {file.category === 'ivr' && <Bot className="w-3 h-3" />}
                        {file.category === 'moh' && <Music className="w-3 h-3" />}
                        {file.category === 'prompt' && <Mic className="w-3 h-3" />}
                        {file.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {file.duration}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-700 font-medium">{file.format}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{file.size}</div>
                    </td>
                    <td className="px-6 py-4">
                      {file.isAiGenerated ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded w-fit">
                          <Wand2 className="w-3 h-3" />
                          Gemini TTS
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">
                          <Upload className="w-3 h-3" />
                          Upload Manual
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Baixar arquivo">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredFiles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Nenhum áudio encontrado com esse nome.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ai_tts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-600" />
                Gerador de Locução Neural (Gemini TTS)
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Texto do Locutor (Script)
                  </label>
                  <textarea
                    value={ttsScript}
                    onChange={(e) => setTtsScript(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition font-medium"
                    placeholder="Digite o texto que o locutor deverá falar na URA..."
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-slate-400 font-mono">Aproximadamente {ttsScript.length / 10} segundos de áudio</span>
                    <span className="text-xs text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded-md">Português (Brasil)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    Selecione a Voz Neural
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setTtsVoice('maia_female')}
                      className={`flex items-start p-4 rounded-xl border-2 text-left transition-all ${
                        ttsVoice === 'maia_female' ? 'border-purple-600 bg-purple-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-3 ${
                        ttsVoice === 'maia_female' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`font-bold ${ttsVoice === 'maia_female' ? 'text-purple-900' : 'text-slate-700'}`}>MaIA (Feminino)</div>
                        <div className="text-[11px] text-slate-500 mt-1">Voz suave, acolhedora e profissional. Ideal para URA principal e atendimento inicial.</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setTtsVoice('roberto_male')}
                      className={`flex items-start p-4 rounded-xl border-2 text-left transition-all ${
                        ttsVoice === 'roberto_male' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-3 ${
                        ttsVoice === 'roberto_male' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`font-bold ${ttsVoice === 'roberto_male' ? 'text-blue-900' : 'text-slate-700'}`}>Roberto (Masculino)</div>
                        <div className="text-[11px] text-slate-500 mt-1">Voz grave, técnica e objetiva. Ideal para comunicados de rede (NOC) e avisos de falhas.</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleGenerateTTS}
                  disabled={isGenerating || !ttsScript.trim()}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-md ${
                    isGenerating 
                      ? 'bg-purple-400 cursor-not-allowed' 
                      : generatedSuccess
                      ? 'bg-emerald-500'
                      : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20 hover:shadow-purple-600/40'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sintetizando Voz Neural...
                    </>
                  ) : generatedSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Áudio Gerado com Sucesso!
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Gerar Áudio
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-blue-900 text-sm">Dicas de Sintetização</h3>
                  <ul className="mt-2 text-[11px] text-blue-800 space-y-2 list-disc list-inside">
                    <li>Utilize pontuação correta (vírgulas e pontos) para criar pausas naturais.</li>
                    <li>Para siglas, prefira soletrar: <strong>A P I</strong> em vez de <strong>API</strong>.</li>
                    <li>O áudio gerado será automaticamente convertido para o formato canônico <strong>WAV PCM 8kHz/16kHz 16-bit Mono</strong> exigido pelo Asterisk.</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-slate-500" />
                Formatos Asterisk
              </h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Ao fazer upload manual, certifique-se de que o arquivo esteja em um dos formatos nativos do PJSIP para evitar transcodificação excessiva da CPU.
              </p>
              <div className="space-y-2 font-mono text-[10px]">
                <div className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg">
                  <span className="text-slate-600">PCM (alaw/ulaw)</span>
                  <span className="text-emerald-600 font-bold">Recomendado</span>
                </div>
                <div className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg">
                  <span className="text-slate-600">WAV (16-bit, 8kHz)</span>
                  <span className="text-emerald-600 font-bold">Recomendado</span>
                </div>
                <div className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg">
                  <span className="text-slate-600">MP3</span>
                  <span className="text-amber-600 font-bold">Aceito (Alto CPU)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
