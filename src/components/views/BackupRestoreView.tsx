import React, { useEffect, useState } from 'react';
import { Database, Download, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { fetchWithAuth, getAuthHeaders } from '../../utils/api';

type Backup = { name: string; createdAt: string; bytes: number; encrypted: boolean };
export const BackupRestoreView: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [downloading, setDownloading] = useState<string>();
  const load = async () => {
    setLoading(true); setMessage('');
    try { setBackups(await fetchWithAuth<Backup[]>('/api/v1/system/backups')); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível consultar as cópias.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const download = async (backup: Backup) => {
    if (backup.bytes > 64 * 1024 * 1024) { setMessage('Esta cópia excede o limite de download pelo navegador. Solicite a transferência segura do arquivo ao administrador do servidor.'); return; }
    setDownloading(backup.name); setMessage('');
    try {
      const response = await fetch(`/api/v1/system/backups/${encodeURIComponent(backup.name)}/download`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Download não autorizado ou indisponível.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = backup.name;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha no download.'); }
    finally { setDownloading(undefined); }
  };
  return <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
      <div><h1 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Database className="w-8 h-8 text-blue-600" />Backup e recuperação</h1>
        <p className="text-sm text-slate-500 mt-2">Cópias integrais criptografadas disponíveis no servidor.</p></div>
      <button onClick={() => void load()} disabled={loading} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"><RefreshCw className="w-4 h-4" />Atualizar lista</button>
    </div>
    {message && <div role="alert" className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900">{message}</div>}
    <div className="grid md:grid-cols-2 gap-4">
      <div className="p-5 border border-slate-200 rounded-xl bg-white"><h2 className="font-bold text-slate-900 flex items-center gap-2"><Shield className="w-5 h-5 text-blue-600" />Conteúdo da cópia</h2>
        <p className="text-sm text-slate-600 mt-3">Banco PostgreSQL, chaves da aplicação, configurações do Asterisk e gravações. A geração é feita pela rotina operacional do servidor. Nenhum agendamento ou envio à nuvem é presumido.</p></div>
      <div className="p-5 border border-amber-200 rounded-xl bg-amber-50"><h2 className="font-bold text-amber-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Recuperação em ambiente separado</h2>
        <p className="text-sm text-amber-900 mt-3">A chave de backup deve ser guardada separadamente. A recuperação autentica o arquivo, cria um banco novo e compara a quantidade de registros. O administrador valida o ambiente recuperado antes de substituir a central em operação.</p></div>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <h2 className="px-5 py-4 font-bold text-slate-900 border-b border-slate-200">Arquivos disponíveis</h2>
      {loading ? <p className="p-6 text-sm text-slate-500">Consultando o servidor…</p> : backups.length === 0 ? <p className="p-6 text-sm text-slate-500">Nenhuma cópia disponível. Configure a rotina de backup e verifique a primeira recuperação.</p> :
        <ul className="divide-y divide-slate-100">{backups.map(backup => <li key={backup.name} className="p-5 flex flex-wrap justify-between items-center gap-4">
          <div><p className="font-mono text-sm text-slate-900 break-all">{backup.name}</p><p className="text-xs text-slate-500 mt-2">{new Date(backup.createdAt).toLocaleString('pt-BR')} · {(backup.bytes / (1024 * 1024)).toFixed(2)} MB · Criptografado</p></div>
          <button onClick={() => void download(backup)} disabled={downloading === backup.name} className="px-4 py-2 text-sm font-bold text-blue-700 border border-blue-200 rounded-xl flex items-center gap-2 disabled:opacity-50"><Download className="w-4 h-4" />{downloading === backup.name ? 'Baixando…' : 'Baixar arquivo'}</button>
        </li>)}</ul>}
    </div>
  </div>;
};
