import React, { useState } from 'react';
import { 
  Database, Save, RotateCcw, Cloud, Download, Trash2, 
  AlertTriangle, CheckCircle2, Clock, Calendar, HardDrive, Shield,
  Settings, X, Server, Lock
} from 'lucide-react';

export const BackupRestoreView: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  const [backupConfig, setBackupConfig] = useState({
    enabled: true,
    destination: 's3',
    cron: '0 3 * * *',
    retention: '30',
    s3: { bucket: 'enlace-pbx-backups', accessKey: 'AKIA...', secretKey: '...', region: 'us-east-1' },
    ftp: { host: 'ftp.example.com', port: '21', user: 'admin', pass: '...', path: '/backups' }
  });

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
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (!window.confirm(`ATENÇÃO: Restaurar o arquivo ${file.name} irá SOBRESCREVER todas as configurações atuais e desconectar chamadas ativas. Deseja prosseguir?`)) {
          return;
        }
        setIsRestoring(true);
        setRestoreMessage('Processando restauração... O sistema será reiniciado em instantes.');
        // Simulate restore process
        setTimeout(() => {
          setIsRestoring(false);
          setRestoreMessage('Restauração concluída com sucesso! Atualize a página se necessário.');
          setTimeout(() => setRestoreMessage(null), 8000);
        }, 3000);
      }
    };
    input.click();
  };

  const handleSaveConfig = () => {
    setIsConfigModalOpen(false);
    setRestoreMessage('Configuração de backup automático salva com sucesso.');
    setTimeout(() => setRestoreMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {restoreMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-top-4 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          {restoreMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-7 h-7 text-blue-600" />
            Backup & Restauração
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie snapshots, restaure configurações e configure rotinas em nuvem.</p>
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
             
             <div className="flex items-center justify-between relative z-10 mb-4">
                {backupConfig.destination === 's3' ? (
                  <Cloud className="w-8 h-8 text-blue-400" />
                ) : (
                  <Server className="w-8 h-8 text-blue-400" />
                )}
                <button onClick={() => setIsConfigModalOpen(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition">
                  <Settings className="w-4 h-4" />
                </button>
             </div>

             <h3 className="font-bold text-lg mb-1 relative z-10">
               {backupConfig.destination === 's3' ? 'Backup em Nuvem (S3)' : 'Backup em Servidor FTP'}
             </h3>
             <p className="text-[11px] text-slate-400 font-medium relative z-10 mb-6">
               {backupConfig.enabled 
                  ? `Seus dados estão sincronizados via rotinas automáticas de crontab para ${backupConfig.destination === 's3' ? 'AWS S3' : 'servidor FTP'}.`
                  : 'Os backups automáticos estão desativados.'}
             </p>
             
             <div className="space-y-4 relative z-10">
               <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                 <span className="text-xs font-semibold text-slate-400">Status do Sync</span>
                 {backupConfig.enabled ? (
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-400/20">
                      <CheckCircle2 className="w-3 h-3" /> Ativo
                    </span>
                 ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-400/10 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-400/20">
                      Inativo
                    </span>
                 )}
               </div>
               
               <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                 <span className="text-xs font-semibold text-slate-400">Rotina (Cron)</span>
                 <span className="text-xs font-mono font-bold text-blue-300">{backupConfig.cron}</span>
               </div>
               
               <div className="flex items-center justify-between">
                 <span className="text-xs font-semibold text-slate-400">Retenção</span>
                 <span className="text-xs font-bold text-white">{backupConfig.retention} dias</span>
               </div>
             </div>
             
             <button onClick={() => setIsConfigModalOpen(true)} className="w-full mt-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition border border-white/10">
               Configurar Rotinas
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

      {/* Config Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Configuração de Backups Automáticos</h3>
                  <p className="text-xs text-slate-500 font-medium">Configure rotinas de backup e retenção externa.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Habilitar rotina automática</h4>
                  <p className="text-xs text-slate-500">Gera snapshots em formato JSON conforme o agendamento Cron.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={backupConfig.enabled} onChange={(e) => setBackupConfig({...backupConfig, enabled: e.target.checked})} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {backupConfig.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Expressão Cron (Agendamento)</label>
                      <input 
                        type="text" 
                        value={backupConfig.cron}
                        onChange={(e) => setBackupConfig({...backupConfig, cron: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="0 3 * * *"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Ex: 0 3 * * * (Todo dia às 03:00)</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Retenção de Arquivos (Dias)</label>
                      <input 
                        type="number" 
                        value={backupConfig.retention}
                        onChange={(e) => setBackupConfig({...backupConfig, retention: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        min="1"
                        max="365"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-3">Destino do Backup Externo</label>
                    <div className="flex gap-4">
                      <label className={`flex-1 p-4 border rounded-2xl cursor-pointer transition-all flex flex-col items-center gap-2 ${backupConfig.destination === 's3' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-blue-300'}`}>
                        <input 
                          type="radio" 
                          name="dest" 
                          value="s3" 
                          className="sr-only"
                          checked={backupConfig.destination === 's3'}
                          onChange={() => setBackupConfig({...backupConfig, destination: 's3'})}
                        />
                        <Cloud className={`w-6 h-6 ${backupConfig.destination === 's3' ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-bold ${backupConfig.destination === 's3' ? 'text-blue-900' : 'text-slate-600'}`}>AWS S3</span>
                      </label>
                      <label className={`flex-1 p-4 border rounded-2xl cursor-pointer transition-all flex flex-col items-center gap-2 ${backupConfig.destination === 'ftp' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-blue-300'}`}>
                        <input 
                          type="radio" 
                          name="dest" 
                          value="ftp" 
                          className="sr-only"
                          checked={backupConfig.destination === 'ftp'}
                          onChange={() => setBackupConfig({...backupConfig, destination: 'ftp'})}
                        />
                        <Server className={`w-6 h-6 ${backupConfig.destination === 'ftp' ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-bold ${backupConfig.destination === 'ftp' ? 'text-blue-900' : 'text-slate-600'}`}>Servidor FTP</span>
                      </label>
                    </div>
                  </div>

                  {backupConfig.destination === 's3' ? (
                    <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                      <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-slate-400" /> Credenciais AWS S3
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Bucket Name</label>
                          <input 
                            type="text" 
                            value={backupConfig.s3.bucket}
                            onChange={(e) => setBackupConfig({...backupConfig, s3: {...backupConfig.s3, bucket: e.target.value}})}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">AWS Region</label>
                          <input 
                            type="text" 
                            value={backupConfig.s3.region}
                            onChange={(e) => setBackupConfig({...backupConfig, s3: {...backupConfig.s3, region: e.target.value}})}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Access Key ID</label>
                          <input 
                            type="text" 
                            value={backupConfig.s3.accessKey}
                            onChange={(e) => setBackupConfig({...backupConfig, s3: {...backupConfig.s3, accessKey: e.target.value}})}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Secret Access Key</label>
                          <input 
                            type="password" 
                            value={backupConfig.s3.secretKey}
                            onChange={(e) => setBackupConfig({...backupConfig, s3: {...backupConfig.s3, secretKey: e.target.value}})}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                      <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-slate-400" /> Credenciais FTP
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">FTP Host</label>
                          <input 
                            type="text" 
                            value={backupConfig.ftp.host}
                            onChange={(e) => setBackupConfig({...backupConfig, ftp: {...backupConfig.ftp, host: e.target.value}})}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Porta</label>
                          <input 
                            type="number" 
                            value={backupConfig.ftp.port}
                            onChange={(e) => setBackupConfig({...backupConfig, ftp: {...backupConfig.ftp, port: e.target.value}})}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Username</label>
                          <input 
                            type="text" 
                            value={backupConfig.ftp.user}
                            onChange={(e) => setBackupConfig({...backupConfig, ftp: {...backupConfig.ftp, user: e.target.value}})}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                          <input 
                            type="password" 
                            value={backupConfig.ftp.pass}
                            onChange={(e) => setBackupConfig({...backupConfig, ftp: {...backupConfig.ftp, pass: e.target.value}})}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Remote Path</label>
                          <input 
                            type="text" 
                            value={backupConfig.ftp.path}
                            onChange={(e) => setBackupConfig({...backupConfig, ftp: {...backupConfig.ftp, path: e.target.value}})}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveConfig}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-600/20"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
