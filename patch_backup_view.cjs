const fs = require('fs');
let code = fs.readFileSync('src/components/views/BackupRestoreView.tsx', 'utf8');

const oldLogic = `export const BackupRestoreView: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [backups, setBackups] = useState([
    { id: 'bkp-1', name: 'Auto-Backup (Daily)', date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), size: '24.5 MB', type: 'auto', status: 'success' },
    { id: 'bkp-2', name: 'Before Update v20.17', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), size: '22.1 MB', type: 'manual', status: 'success' },
    { id: 'bkp-3', name: 'Auto-Backup (Daily)', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), size: '24.0 MB', type: 'auto', status: 'success' },
  ]);

  const handleCreateBackup = () => {
    setIsCreating(true);
    setTimeout(() => {
      setBackups([
        {
          id: \`bkp-\${Date.now()}\`,
          name: 'Manual Backup (Snapshot)',
          date: new Date().toISOString(),
          size: '25.2 MB',
          type: 'manual',
          status: 'success'
        },
        ...backups
      ]);
      setIsCreating(false);
    }, 2500);
  };`;

const newLogic = `export const BackupRestoreView: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const [backups, setBackups] = useState([
    { id: 'bkp-1', name: 'Auto-Backup (Daily)', date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), size: '24.5 MB', type: 'auto', status: 'success' },
  ]);

  const handleCreateBackup = () => {
    setIsCreating(true);
    // Actually download the backup from the server
    window.open('/api/v1/system/backup', '_blank');
    setTimeout(() => {
      setBackups([
        {
          id: \`bkp-\${Date.now()}\`,
          name: 'Manual Backup (JSON Snapshot)',
          date: new Date().toISOString(),
          size: '25.2 MB',
          type: 'manual',
          status: 'success'
        },
        ...backups
      ]);
      setIsCreating(false);
    }, 1500);
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
  };`;

const oldButtons = `        <div className="flex items-center gap-3">
          <button 
            onClick={handleCreateBackup}
            disabled={isCreating}`;

const newButtons = `        <div className="flex items-center gap-3">
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
            disabled={isCreating}`;

code = code.replace(oldLogic, newLogic);
code = code.replace(oldButtons, newButtons);

// Inject the success/error message
const oldHeader = `        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">`;
      
const newHeader = `        </div>
      </div>

      {restoreMessage && (
        <div className={\`p-4 rounded-xl text-sm font-bold flex items-center gap-2 \${restoreMessage.includes('sucesso') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}\`}>
          {restoreMessage.includes('sucesso') ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {restoreMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">`;

code = code.replace(oldHeader, newHeader);
fs.writeFileSync('src/components/views/BackupRestoreView.tsx', code);
console.log('Backup view patched');
