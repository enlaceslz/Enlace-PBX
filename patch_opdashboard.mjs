import fs from 'fs';
const file = 'src/components/views/OperationDashboardView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update Props interface
content = content.replace(
  `interface OperationDashboardViewProps {
  channels: AsteriskChannel[];
  metrics: DashboardMetrics | null;
}`,
  `interface OperationDashboardViewProps {
  channels: AsteriskChannel[];
  metrics: DashboardMetrics | null;
  onOpenWebphone?: () => void;
}`
);

// Update component signature
content = content.replace(
  `export const OperationDashboardView: React.FC<OperationDashboardViewProps> = ({ channels, metrics }) => {`,
  `export const OperationDashboardView: React.FC<OperationDashboardViewProps> = ({ channels, metrics, onOpenWebphone }) => {`
);

// Add icons to import
if (!content.includes('Ear')) {
  content = content.replace(
    `import { Activity, PhoneCall,`,
    `import { Activity, PhoneCall, Ear, Mic, Users2, `
  );
}

// Update table header to add 'Ações (NOC)'
const thOld = `<th className="px-5 py-3">Duração</th>
                </tr>`;
const thNew = `<th className="px-5 py-3">Duração</th>
                  <th className="px-5 py-3 text-right">Intervenção (NOC)</th>
                </tr>`;
content = content.replace(thOld, thNew);

// Update table row to add buttons
const tdOld = `                    <td className="px-5 py-3 font-mono text-xs text-slate-300">
                      {Math.floor(chan.durationSeconds / 60)}:{chan.durationSeconds % 60 < 10 ? '0' : ''}{chan.durationSeconds % 60}
                    </td>
                  </tr>`;
const tdNew = `                    <td className="px-5 py-3 font-mono text-xs text-slate-300">
                      {Math.floor(chan.durationSeconds / 60)}:{chan.durationSeconds % 60 < 10 ? '0' : ''}{chan.durationSeconds % 60}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {chan.state === 'Up' && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => onOpenWebphone?.()} title="Spy (Escuta silenciosa)" className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md border border-slate-700 transition">
                            <Ear className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onOpenWebphone?.()} title="Whisper (Sussurrar para o operador)" className="p-1.5 bg-slate-800 hover:bg-sky-900/50 text-slate-400 hover:text-sky-400 rounded-md border border-slate-700 hover:border-sky-700 transition">
                            <Mic className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => onOpenWebphone?.()} title="Barge (Intervenção a 3)" className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 rounded-md border border-slate-700 hover:border-rose-700 transition">
                            <Users2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>`;
content = content.replace(tdOld, tdNew);

// Update colspan for empty state
content = content.replace(`colSpan={5}`, `colSpan={6}`);

fs.writeFileSync(file, content);
console.log('Patched OperationDashboardView for NOC features');
