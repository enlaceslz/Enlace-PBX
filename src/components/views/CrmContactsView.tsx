import React, { useState, useEffect } from 'react';
import { Users, Phone, Mail, Search, BrainCircuit, Activity, Heart, ShieldAlert, Sparkles, Filter, ChevronRight, X, User, MessageSquare } from 'lucide-react';
import { CrmContact, CustomerMemory } from '../../types/pbx';
import { getAuthHeaders } from '../../utils/api';

export const CrmContactsView: React.FC = () => {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [memories, setMemories] = useState<CustomerMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);

  useEffect(() => {
    const headers = getAuthHeaders();
    Promise.all([
      fetch('/api/v1/crm/contacts', { headers })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch('/api/v1/crm/memories', { headers })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [])
    ]).then(([contactsData, memoriesData]) => {
      setContacts(Array.isArray(contactsData) ? contactsData : []);
      setMemories(Array.isArray(memoriesData) ? memoriesData : []);
      setIsLoading(false);
    }).catch(err => {
      console.error('Erro ao carregar contatos do CRM:', err);
      setContacts([]);
      setMemories([]);
      setIsLoading(false);
    });
  }, []);

  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const safeMemories = Array.isArray(memories) ? memories : [];

  const filteredContacts = safeContacts.filter(c => 
    (c?.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c?.phone || '').includes(search)
  );

  const activeMemory = selectedContact ? safeMemories.find(m => m?.contactId === selectedContact.id) : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                CRM & Memória Cognitiva
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Gerencie contatos e visualize o contexto gerado pela IA (Sentimento, Preferências e Churn).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Contatos */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cliente ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-shadow"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mb-3"></div>
                <span className="text-sm font-medium">Carregando carteira...</span>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Nenhum contato encontrado.
              </div>
            ) : (
              filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                    selectedContact?.id === contact.id
                      ? 'bg-rose-50 border border-rose-200 shadow-sm'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    selectedContact?.id === contact.id ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {contact.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-bold truncate ${selectedContact?.id === contact.id ? 'text-rose-900' : 'text-slate-900'}`}>
                      {contact.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {contact.phone}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${selectedContact?.id === contact.id ? 'text-rose-600' : 'text-slate-300'}`} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detalhes e Memória */}
        <div className="lg:col-span-2">
          {selectedContact ? (
            <div className="space-y-6">
              {/* Card Perfil Básicos */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl font-black shrink-0">
                  {selectedContact.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-slate-900">{selectedContact.name}</h2>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> {selectedContact.phone}</span>
                    {selectedContact.email && (
                      <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> {selectedContact.email}</span>
                    )}
                    <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> CRM ID: {selectedContact.crmId || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Cognitive Memory AI Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <BrainCircuit className="w-32 h-32 text-rose-400" />
                </div>
                
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-rose-400" />
                  <h3 className="text-lg font-bold text-white tracking-wide">Memória Cognitiva (Google Gemini)</h3>
                </div>

                {activeMemory ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5" /> Resumo do Cliente
                        </h4>
                        <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                          {activeMemory.summary}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Filter className="w-3.5 h-3.5" /> Preferências
                        </h4>
                        <ul className="space-y-2">
                          {activeMemory.preferences.map((pref, idx) => (
                            <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                              {pref}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5" /> Sentimento Predominante
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                            activeMemory.sentimentHistory === 'positive' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            activeMemory.sentimentHistory === 'negative' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                            'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {activeMemory.sentimentHistory === 'positive' ? 'Positivo' : activeMemory.sentimentHistory === 'negative' ? 'Negativo' : 'Neutro'}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <ShieldAlert className="w-3.5 h-3.5" /> Risco de Churn (Cancelamento)
                        </h4>
                        <div className="flex items-center gap-4">
                          <div className="text-3xl font-black text-white">
                            {activeMemory.churnRisk}%
                          </div>
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                activeMemory.churnRisk > 60 ? 'bg-rose-500' :
                                activeMemory.churnRisk > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${activeMemory.churnRisk}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Activity className="w-8 h-8 opacity-50 mx-auto mb-3" />
                    <p className="text-sm">A IA ainda não gerou memória para este contato.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded-2xl min-h-[600px]">
              <Users className="w-12 h-12 mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-600">Nenhum contato selecionado</p>
              <p className="text-sm mt-1">Selecione um cliente na lista para ver sua Memória Cognitiva</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
