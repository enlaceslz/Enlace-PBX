import React from 'react';

export function Fail2banPanel({ snapshot, refresh }: { snapshot: any; refresh: () => void }) {
  return <section className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
    <div className="flex justify-between gap-4"><h3 className="font-bold">Fail2ban — consulta ao host</h3>
      <button onClick={refresh} className="text-blue-700">Atualizar leitura</button></div>
    <p className="text-sm text-slate-600">Banimentos, desbloqueios, recargas e alterações de regras pelo painel estão indisponíveis. A leitura não verifica a eficácia das ações no firewall.</p>
    {!snapshot?.available ? <p role="status" className="text-amber-700">{snapshot?.error || 'Leitura do serviço indisponível.'}</p> : <>
      <p className="text-sm">{snapshot.totalJails} jails consultadas; {snapshot.currentBanEntries} entradas de banimento. Um IP pode aparecer em várias jails.</p>
      <p className="text-xs text-slate-500">Coleta: {snapshot.startedAt} até {snapshot.observedAt}. Consultas sequenciais; cache de até 15 segundos.</p>
      <div className="overflow-auto"><table className="w-full text-sm text-left"><thead><tr>
        <th>Jail</th><th>Falhas atuais</th><th>Falhas acumuladas</th><th>Banimentos atuais</th><th>Banimentos acumulados</th>
      </tr></thead><tbody>{snapshot.jails.map((jail: any) => <tr key={jail.name} className="border-t">
        <td className="font-mono py-2">{jail.name}</td><td>{jail.currentlyFailed}</td><td>{jail.totalFailed}</td>
        <td>{jail.currentlyBanned}</td><td>{jail.totalBanned}</td>
      </tr>)}</tbody></table></div>
      {snapshot.jails.length === 0 && <p>Nenhuma jail informada pelo serviço.</p>}
    </>}
  </section>;
}
