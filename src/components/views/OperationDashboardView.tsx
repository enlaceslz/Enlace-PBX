import React, { useState, useEffect } from 'react';
import { AsteriskChannel, DashboardMetrics } from '../../types/pbx';
import { Activity, PhoneCall, CheckCircle2, AlertCircle } from 'lucide-react';

interface OperationDashboardViewProps {
  channels: AsteriskChannel[];
  metrics: DashboardMetrics | null;
}

export const OperationDashboardView: React.FC<OperationDashboardViewProps> = ({ channels, metrics }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">NOC / Tempo Real</h2>
        <p className="text-sm text-slate-500 mt-1">Monitoramento operacional em tempo real do Contact Center e Filas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Chamadas Ativas</p>
              <h3 className="text-2xl font-bold text-slate-800">{channels.length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Uso de CPU</p>
              <h3 className="text-2xl font-bold text-slate-800">{metrics?.systemHealth.cpuUsage}%</h3>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Agentes IA Online</p>
              <h3 className="text-2xl font-bold text-slate-800">{metrics?.aiGateway.activeSessions}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Canais em Execução (Live)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-xs text-slate-500 font-medium uppercase tracking-wider">
                <th className="px-6 py-3">Canal</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Origem</th>
                <th className="px-6 py-3">Destino / Aplicação</th>
                <th className="px-6 py-3">Duração</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {channels.map((chan) => (
                <tr key={chan.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{chan.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-md">
                      {chan.state}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-700">{chan.callerNumber}</td>
                  <td className="px-6 py-4 text-slate-700">
                    {chan.connectedLine} <br />
                    <span className="text-[10px] font-mono text-slate-400">{chan.application}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{chan.durationSeconds}s</td>
                </tr>
              ))}
              {channels.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma chamada ativa no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
