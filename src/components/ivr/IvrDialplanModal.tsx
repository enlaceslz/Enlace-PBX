import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, FileCode, Terminal, Sparkles } from 'lucide-react';
import { Ivr } from '../../types/pbx';

interface IvrDialplanModalProps {
  ivr: Ivr;
  onClose: () => void;
}

export const IvrDialplanModal: React.FC<IvrDialplanModalProps> = ({ ivr, onClose }) => {
  const [dialplanText, setDialplanText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/ivr/${ivr.id}/dialplan`)
      .then((res) => res.json())
      .then((data) => {
        if (data.dialplan) {
          setDialplanText(data.dialplan);
        }
      })
      .catch((err) => {
        console.error('Falha ao carregar dialplan do Asterisk:', err);
      })
      .finally(() => setIsLoading(false));
  }, [ivr.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(dialplanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([dialplanText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extensions-ivr-${ivr.number}.conf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Dialplan Asterisk 20 (extensions.conf)</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
                  Contexto: [ivr-{ivr.number}]
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sintaxe oficial compilada do fluxo visual para implantação no Asterisk PBX
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>/etc/asterisk/extensions.conf</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition flex items-center gap-1.5 text-xs border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Código'}
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition flex items-center gap-1.5 text-xs shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar .conf
            </button>
          </div>
        </div>

        {/* Code View */}
        <div className="p-4 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-950">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">Compilando dialplan da URA...</div>
          ) : (
            <pre className="whitespace-pre overflow-x-auto text-[11px] select-text">
              {dialplanText}
            </pre>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-slate-800 bg-[#0f172a]/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Recarregue com: <code className="text-emerald-400 font-mono">asterisk -rx "dialplan reload"</code>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
