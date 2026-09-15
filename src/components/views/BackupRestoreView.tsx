import React, { useState } from 'react';
import { 
  Database, Save, RotateCcw, Cloud, Download, Trash2, 
  AlertTriangle, CheckCircle2, Clock, Calendar, HardDrive, Shield
} from 'lucide-react';

export const BackupRestoreView: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const [backups, setBackups] = useState([
    { id: 'bkp-1', name: 'Auto-Backup (Daily)', date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), size: '24.5 MB', type: 'auto', status: 'success' },
  ]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/v1/system/backup');
      if (!res.ok) throw new Error('Erro ao gerar snapshot');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enlace-pbx-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
      setBackups([
        {
          id: `bkp-${Date.now()}`,
          name: 'Backup Manual (Snapshot JSON Completo)',
          date: new Date().toISOString(),
          size: `${sizeMb} MB`,
          type: 'manual',
          status: 'success',
        },
        ...backups,
      ]);
      setRestoreMessage('Snapshot baixado com sucesso no formato JSON padrão!');
      setTimeout(() => setRestoreMessage(null), 4000);
    } catch (err) {
      console.error('Backup error:', err);
      setRestoreMessage('Erro ao gerar backup do sistema.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUploadRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      setIsRestoring(true);
      setRestoreMessage(null);
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          const res = await fetch('/api/v1/system/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json)
          });
          if (res.ok) {
            setRestoreMessage('Backup restaurado com sucesso! Recarregue a página para aplicar.');
            setTimeout(() => window.location.reload(), 3000);
          } else {
            setRestoreMessage('Falha ao restaurar: Formato inválido.');
          }
        } catch(err) {
          setRestoreMessage('Falha ao ler o arquivo JSON.');
        }
        setIsRestoring(false);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600 fill-blue-600" />
            Backup & Disaster Recovery
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Crie snapshots de segurança, restaure configurações do Asterisk e gerencie backups na nuvem.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleUploadRestore}
            disabled={isRestoring}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isRestoring ? <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Restaurar de Arquivo
          </button>
          <button 
            onClick={handleCreateBackup}
            disabled={isCreating}
            className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Gerar Backup Agora
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Cloud Config & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-full blur-2xl -mr-8 -mt-8" />
             <Cloud className="w-8 h-8 text-blue-400 mb-4 relative z-10" />
             <h3 className="font-bold text-lg mb-1 relative z-10">Backup em Nuvem (S3)</h3>
             <p className="text-[11px] text-slate-400 font-medium relative z-10 mb-6">
               Seus dados estão sincronizados com o AWS S3 via rotinas automáticas de crontab.
             </p>
             
             <div className="space-y-4 relative z-10">
               <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                 <span className="text-xs font-semibold text-slate-400">Status do Sync</span>
                 <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-400/20">
                   <CheckCircle2 className="w-3 h-3" /> Ativo
                 </span>
               </div>
               <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                 <span className="text-xs font-semibold text-slate-400">Rotina (Cron)</span>
                 <span className="text-xs font-mono font-bold text-blue-300">0 3 * * * (Diário)</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-xs font-semibold text-slate-400">Retenção</span>
                 <span className="text-xs font-bold text-white">30 dias</span>
               </div>
             </div>
             
             <button className="w-full mt-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition border border-white/10">
               Configurar Credenciais S3
             </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                 <AlertTriangle className="w-5 h-5 text-amber-600" />
               </div>
               <div>
                 <h4 className="font-bold text-sm text-slate-900">Aviso de Restauração</h4>
                 <p className="text-[10px] text-slate-500 font-medium">Leia antes de prosseguir</p>
               </div>
             </div>
             <p className="text-xs text-slate-600 font-medium leading-relaxed">
               Restaurar um snapshot irá <strong>sobrescrever as configurações atuais</strong> do banco de dados (PGSQL) e forçar um *reload* (core reload) no serviço do Asterisk. Ligações em andamento poderão ser desconectadas.
             </p>
          </div>
        </div>

        {/* Right Column: Snapshots List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-slate-400" /> Histórico de Snapshots
              </h3>
              <span className="text-xs font-semibold text-slate-500">Últimos 30 dias</span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {backups.map(bkp => (
                <div key={bkp.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${
                      bkp.type === 'auto' ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-blue-50 border-blue-200 text-blue-600'
                    }`}>
                      {bkp.type === 'auto' ? <Clock className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{bkp.name}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> 
                          {new Date(bkp.date).toLocaleDateString('pt-BR')} às {new Date(bkp.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[11px] font-mono font-bold text-slate-500">{bkp.size}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                          {bkp.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                      <Download className="w-3.5 h-3.5" /> Baixar
                    </button>
                    <button className="px-3 py-2 bg-rose-50 border border-rose-100 hover:bg-rose-600 hover:text-white text-rose-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                    </button>
                    <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {backups.length === 0 && (
                <div className="p-12 text-center flex flex-col items-center justify-center text-slate-500">
                  <Database className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-bold">Nenhum backup encontrado.</p>
                  <p className="text-xs mt-1">Crie o seu primeiro snapshot utilizando o botão acima.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
