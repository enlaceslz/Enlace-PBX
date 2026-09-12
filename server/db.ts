// Enlace-PBX Data Store & State Engine (PostgreSQL Simulation with Multi-Tenant & RLS support)

export interface CrmProvider {
  id: string;
  tenantId: string;
  name: string;
  type: 'hubspot' | 'pipedrive' | 'rdstation' | 'salesforce' | 'zoho' | 'odoo' | 'suitecrm' | 'twenty' | 'espocrm' | 'basaltcrm';
  isConnected: boolean;
  syncedAt?: string;
  config: Record<string, any>;
}

export interface CrmContact {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string;
  crmId?: string;
  lastInteraction?: string;
}

export interface CustomerMemory {
  id: string;
  tenantId: string;
  contactId: string;
  phone: string;
  summary: string;
  preferences: string[];
  sentimentHistory: 'positive' | 'neutral' | 'negative';
  churnRisk: number;
}

export interface OmnichannelMessage {
  id: string;
  sender: 'user' | 'bot' | 'agent';
  text: string;
  timestamp: string;
}

export interface OmnichannelConversation {
  id: string;
  tenantId: string;
  contactId: string;
  channel: 'whatsapp' | 'voice' | 'webrtc' | 'sms';
  status: 'active' | 'closed' | 'queued' | 'bot_handling';
  createdAt: string;
  messages: OmnichannelMessage[];
}

export interface WhatsappConfig {
  tenantId: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  isActive: boolean;
}

export interface TenantAntiFraud {
  maxConcurrentCalls: number;
  maxInternationalPerDay: number;
  blockInternational: boolean;
  blockExpensiveDestinations: boolean;
  maxCallDurationMinutes: number;
  alertEmail: string;
  autoSuspendOnAnomaly: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  cnpj: string;
  plan: string;
  maxExtensions: number;
  maxTrunks: number;
  aiCreditsUsd: number;
  createdAt: string;
  antiFraud?: TenantAntiFraud;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'supervisor' | 'operador' | 'usuario' | 'auditor';
  extension?: string;
  isActive: boolean;
  lastLogin: string;
}

export interface Extension {
  id: string;
  tenantId: string;
  number: string;
  name: string;
  sipSecret: string;
  context: string;
  callerId: string;
  codecs: string[];
  nat: boolean;
  webrtc: boolean;
  recording: 'always' | 'on_demand' | 'never';
  voicemail: boolean;
  dnd: boolean;
  status: 'online' | 'offline' | 'busy' | 'ringing';
  ipAddress?: string;
  allowAiTransfer: boolean;
}

export interface Trunk {
  id: string;
  tenantId: string;
  name: string;
  providerName: string;
  host: string;
  port: number;
  username: string;
  secretMasked: string;
  transport: 'UDP' | 'TCP' | 'TLS';
  callerId: string;
  codecs: string[];
  context: string;
  register: boolean;
  status: 'registered' | 'unregistered' | 'error';
  channelsMax: number;
  channelsInUse: number;
}

export interface Route {
  id: string;
  tenantId: string;
  name: string;
  type: 'outbound' | 'inbound';
  pattern: string; // e.g. "9XXXXXXXX", "0[1-9][1-9]9XXXXXXXX", "0800XXXXXXX"
  prefixRemove?: string;
  trunkId?: string;
  destinationType: 'trunk' | 'extension' | 'queue' | 'ivr' | 'ai_agent' | 'ring_group';
  destinationId: string;
  priority: number;
  timeSchedule?: string;
  fallbackType?: 'human' | 'ivr' | 'voicemail' | 'queue';
  fallbackTarget?: string;
}

export interface RingGroup {
  id: string;
  tenantId: string;
  name: string;
  number: string;
  strategy: 'ringall' | 'roundrobin' | 'linear' | 'random' | 'fewestcalls';
  timeoutSeconds: number;
  members: string[]; // extension numbers
  failoverDestination: string;
}

export interface Queue {
  id: string;
  tenantId: string;
  name: string;
  number: string;
  strategy: 'ringall' | 'roundrobin' | 'leastrecent' | 'fewestcalls' | 'random';
  timeoutSeconds: number;
  wrapUpTimeSeconds: number;
  mohSound: string;
  slaTargetSeconds: number;
  members: string[]; // extension numbers
  callsWaiting: number;
  avgWaitTimeSeconds: number;
  abandonedToday: number;
  answeredToday: number;
}

export interface IvrOption {
  digit: string;
  label: string;
  destinationType: 'extension' | 'queue' | 'ai_agent' | 'ivr' | 'hangup';
  destinationTarget: string;
}

export type IvrFlowNodeType =
  | 'start'
  | 'audio'
  | 'dtmf'
  | 'ai_agent'
  | 'queue'
  | 'extension'
  | 'time_condition'
  | 'hangup';

export interface IvrFlowNode {
  id: string;
  type: IvrFlowNodeType;
  title: string;
  position: { x: number; y: number };
  data: {
    audioSource?: 'tts' | 'file' | 'library';
    audioText?: string;
    audioFile?: string;
    voiceName?: string;
    allowInterrupt?: boolean;
    digits?: Array<{ digit: string; label: string }>;
    timeoutSeconds?: number;
    invalidRetries?: number;
    repeatAudioOnInvalid?: boolean;
    aiAgentId?: string;
    aiAgentName?: string;
    aiPromptContext?: string;
    aiVoiceModel?: string;
    queueId?: string;
    queueName?: string;
    queueStrategy?: string;
    extensionNumber?: string;
    extensionName?: string;
    timeCondition?: {
      openTime: string;
      closeTime: string;
      daysOfWeek: number[];
    };
    hangupCause?: 'normal' | 'busy' | 'rejected' | 'timeout';
    farewellAudio?: string;
  };
}

export interface IvrFlowConnection {
  id: string;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
}

export interface IvrVisualFlow {
  nodes: IvrFlowNode[];
  connections: IvrFlowConnection[];
}

export interface Ivr {
  id: string;
  tenantId: string;
  name: string;
  number: string;
  audioPrompt: string;
  timeoutSeconds: number;
  invalidRetries: number;
  options: IvrOption[];
  flow?: IvrVisualFlow;
}

export interface AiProvider {
  id: string;
  tenantId: string;
  name: string;
  providerType: 'gemini_api' | 'gemini_live' | 'vertex_ai' | '9router' | 'custom';
  baseUrl?: string;
  apiKeyMasked: string;
  googleProjectId?: string;
  googleLocation?: string;
  defaultModel: string;
  defaultVoice: string;
  defaultTemperature: number;
  isActive: boolean;
  updatedAt: string;
}

export interface AiTool {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST';
  requiresConfirmation: boolean;
  schemaJson: Record<string, unknown>;
  mockResponse: Record<string, unknown>;
}

export interface AiKnowledgeSource {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  content: string;
  updatedAt: string;
  fileName?: string;
  fileType?: string;
  fileSizeBytes?: number;
}

export interface AiAgent {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  providerId: string;
  model: string;
  voice: string;
  voiceGender?: 'male' | 'female';
  avatarType?: string;
  language: string;
  systemInstruction: string;
  initialGreeting: string;
  temperature: number;
  tools: string[]; // tool ids
  knowledgeSources: string[];
  allowBargeIn: boolean;
  silenceTimeoutSeconds: number;
  maxSessionMinutes: number;
  transferExtension: string;
  fallbackAction: 'transfer_human' | 'transfer_queue' | 'hangup';
  isActive: boolean;
}

export interface AiSession {
  id: string;
  tenantId: string;
  agentId: string;
  agentName: string;
  callId: string;
  caller: string;
  channel: string;
  sessionType: 'voice_live' | 'audio_stream' | 'chat_turn';
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  status: 'active' | 'completed' | 'transferred' | 'fallback';
  transcript: Array<{ role: 'user' | 'model' | 'system' | 'tool'; text: string; timestamp: string }>;
  tokensInput: number;
  tokensOutput: number;
  audioSeconds: number;
  latencyAverageMs: number;
  transferReason?: string;
  costEstimateBrl: number;
}

export interface CdrRecord {
  id: string;
  tenantId: string;
  uniqueId: string;
  caller: string;
  callee: string;
  direction: 'inbound' | 'outbound' | 'internal';
  startTime: string;
  answerTime?: string;
  endTime: string;
  duration: number; // total sec
  billsec: number; // billed sec
  disposition: 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED';
  recordingUrl?: string;
  trunkName?: string;
  extension?: string;
  aiAgentId?: string;
  aiSessionId?: string;
  isAiHandled?: boolean;
  isTransferred?: boolean;
  transferredTo?: string;
  ivrPath?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  transcription?: string;
  summary?: string;
  costBrl: number;
}

export interface WebhookConfig {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  events: string[];
  secretToken: string;
  isActive: boolean;
  lastTriggered?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  ip: string;
  timestamp: string;
  details: string;
}

// Initial In-Memory Seed Data adhering to Brazilian context & Enlace Telecom standards
export interface OutboundCampaign {
  id: string;
  tenantId: string;
  name: string;
  type: 'predictive' | 'power_dialer' | 'ai_voicebot';
  status: 'draft' | 'running' | 'paused' | 'completed';
  aiAgentId?: string;
  totalLeads: number;
  processedLeads: number;
  successCount: number;
  activeCalls: number;
  createdAt: string;
}

export interface SystemSnapshot {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  data: string; // JSON stringified state of extensions, trunks, routes, etc.
}

export interface BillingInvoice {
  id: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paymentMethod?: string;
  paidAt?: string;
  items?: Array<{
    description: string;
    category: string;
    qty: string | number;
    unitPrice: number;
    total: number;
  }>;
}

export interface BillingTransaction {
  id: string;
  date: string;
  description: string;
  category: 'telephony' | 'ai_tokens' | 'omnichannel' | 'licenses' | 'recharge';
  type: 'debit' | 'credit';
  amount: number;
  balanceAfter: number;
}

export interface TenantBilling {
  tenantId: string;
  plan: 'prepaid' | 'postpaid';
  balance: number;
  currency: string;
  currentMonthCosts: {
    telephony: number;
    aiTokens: number;
    omnichannel: number;
    licenses: number;
  };
  recentInvoices: BillingInvoice[];
  transactions?: BillingTransaction[];
}

export class Database {
  billing: TenantBilling[] = [
    {
      tenantId: 'tenant-enlace-matriz',
      plan: 'prepaid',
      balance: 1450.75,
      currency: 'BRL',
      currentMonthCosts: {
        telephony: 345.20,
        aiTokens: 128.50,
        omnichannel: 90.00,
        licenses: 150.00,
      },
      recentInvoices: [
        {
          id: 'INV-2026-09',
          date: '2026-09-01',
          dueDate: '2026-09-15',
          amount: 713.70,
          status: 'pending',
          paymentMethod: 'PIX ou Boleto',
          items: [
            { description: 'Tarifação Telefonia Fixa e Móvel (PSTN / SIP Trunk)', category: 'Telefonia', qty: '12.450 min', unitPrice: 0.028, total: 345.20 },
            { description: 'Processamento de Voz Neural e Tokens (Gemini AI Voice Engine)', category: 'IA Gemini', qty: '2.850.000 tokens', unitPrice: 0.000045, total: 128.50 },
            { description: 'Licenças Ramais PJSIP e WebRTC Cloud', category: 'Licenciamento', qty: '30 ramais', unitPrice: 5.00, total: 150.00 },
            { description: 'Mensageria Omnichannel (WhatsApp Business API)', category: 'Omnichannel', qty: '4.500 msgs', unitPrice: 0.020, total: 90.00 },
          ]
        },
        {
          id: 'INV-2026-08',
          date: '2026-08-01',
          dueDate: '2026-08-10',
          amount: 850.00,
          status: 'paid',
          paymentMethod: 'PIX',
          paidAt: '2026-08-05T14:20:00Z',
          items: [
            { description: 'Minutos Tarifados Telefonia SIP (Troncos E1/SIP)', category: 'Telefonia', qty: '16.200 min', unitPrice: 0.028, total: 453.60 },
            { description: 'Consumo Tokens Gemini Live Audio', category: 'IA Gemini', qty: '3.400.000 tokens', unitPrice: 0.000045, total: 153.00 },
            { description: 'Licenças Ramais Asterisk PJSIP', category: 'Licenciamento', qty: '30 ramais', unitPrice: 5.00, total: 150.00 },
            { description: 'Disparos Omnichannel WhatsApp Business', category: 'Omnichannel', qty: '4.670 msgs', unitPrice: 0.020, total: 93.40 },
          ]
        },
        {
          id: 'INV-2026-07',
          date: '2026-07-01',
          dueDate: '2026-07-10',
          amount: 790.30,
          status: 'paid',
          paymentMethod: 'Boleto Bancário',
          paidAt: '2026-07-08T09:12:00Z',
          items: [
            { description: 'Minutos Tarifados Telefonia SIP', category: 'Telefonia', qty: '14.800 min', unitPrice: 0.028, total: 414.40 },
            { description: 'Consumo IA Agentes de Voz MaIA', category: 'IA Gemini', qty: '2.950.000 tokens', unitPrice: 0.000045, total: 132.75 },
            { description: 'Licenças Ramais PJSIP', category: 'Licenciamento', qty: '30 ramais', unitPrice: 5.00, total: 150.00 },
            { description: 'Mensagens Ativas e Receptivas WhatsApp', category: 'Omnichannel', qty: '4.657 msgs', unitPrice: 0.020, total: 93.15 },
          ]
        },
      ],
      transactions: [
        { id: 'tx-001', date: '2026-09-11', description: 'Consumo tarifado de chamadas Asterisk 20', category: 'telephony', type: 'debit', amount: 18.40, balanceAfter: 1450.75 },
        { id: 'tx-002', date: '2026-09-10', description: 'Processamento de voz IA Gemini (MaIA Atendimento)', category: 'ai_tokens', type: 'debit', amount: 12.80, balanceAfter: 1469.15 },
        { id: 'tx-003', date: '2026-09-08', description: 'Disparos de WhatsApp Campanha de Cobrança Q3', category: 'omnichannel', type: 'debit', amount: 35.00, balanceAfter: 1481.95 },
        { id: 'tx-004', date: '2026-09-05', description: 'Recarga de Saldo Pré-pago via PIX Instantâneo', category: 'recharge', type: 'credit', amount: 500.00, balanceAfter: 1516.95 },
        { id: 'tx-005', date: '2026-09-01', description: 'Mensalidade Fixa Ramais PJSIP e WebRTC (30 ramais)', category: 'licenses', type: 'debit', amount: 150.00, balanceAfter: 1016.95 },
        { id: 'tx-006', date: '2026-08-28', description: 'Tarifação minutos de telefonia celular e fixo', category: 'telephony', type: 'debit', amount: 84.50, balanceAfter: 1166.95 },
        { id: 'tx-007', date: '2026-08-20', description: 'Recarga de Créditos Corporativos via Boleto', category: 'recharge', type: 'credit', amount: 1000.00, balanceAfter: 1251.45 },
      ]
    }
  ];

  outboundCampaigns: OutboundCampaign[] = [
    {
      id: 'camp-001',
      tenantId: 'tenant-enlace-matriz',
      name: 'Cobrança de Inadimplentes - Q3',
      type: 'ai_voicebot',
      status: 'running',
      aiAgentId: 'agent-1', // MaIA Cobrança
      totalLeads: 5000,
      processedLeads: 1250,
      successCount: 310, // Acordos gerados
      activeCalls: 12,
      createdAt: '2026-09-08T10:00:00Z',
    },
    {
      id: 'camp-002',
      tenantId: 'tenant-enlace-matriz',
      name: 'Boas-vindas Novos Clientes',
      type: 'power_dialer',
      status: 'paused',
      totalLeads: 300,
      processedLeads: 145,
      successCount: 140,
      activeCalls: 0,
      createdAt: '2026-09-09T09:00:00Z',
    }
  ];

  snapshots: SystemSnapshot[] = [];
  
  takeSnapshot(tenantId: string, name: string): SystemSnapshot {
    const snap = {
      id: `snap-${Date.now()}`,
      tenantId,
      name,
      createdAt: new Date().toISOString(),
      data: JSON.stringify({
        extensions: this.extensions.filter(e => e.tenantId === tenantId),
        trunks: this.trunks.filter(t => t.tenantId === tenantId),
        routes: this.routes.filter(r => r.tenantId === tenantId),
        ringGroups: this.ringGroups.filter(rg => rg.tenantId === tenantId),
        queues: this.queues.filter(q => q.tenantId === tenantId),
      })
    };
    this.snapshots.unshift(snap);
    return snap;
  }

  rollbackSnapshot(snapshotId: string): boolean {
    const snap = this.snapshots.find(s => s.id === snapshotId);
    if (!snap) return false;
    
    try {
      const data = JSON.parse(snap.data);
      const tenantId = snap.tenantId;
      
      // Remove current tenant data
      this.extensions = this.extensions.filter(e => e.tenantId !== tenantId);
      this.trunks = this.trunks.filter(t => t.tenantId !== tenantId);
      this.routes = this.routes.filter(r => r.tenantId !== tenantId);
      this.ringGroups = this.ringGroups.filter(rg => rg.tenantId !== tenantId);
      this.queues = this.queues.filter(q => q.tenantId !== tenantId);
      
      // Restore from snapshot
      this.extensions.push(...data.extensions);
      this.trunks.push(...data.trunks);
      this.routes.push(...data.routes);
      this.ringGroups.push(...data.ringGroups);
      this.queues.push(...data.queues);
      
      return true;
    } catch (e) {
      console.error("Rollback failed", e);
      return false;
    }
  }

  tenants: Tenant[] = [
    {
      id: 'tenant-enlace-matriz',
      name: 'Enlace Telecom — Matriz São Paulo',
      cnpj: '12.345.678/0001-90',
      plan: 'Enterprise Voice & AI Pro',
      maxExtensions: 200,
      maxTrunks: 32,
      aiCreditsUsd: 1500.0,
      createdAt: '2025-01-10T08:00:00Z',
      antiFraud: {
        maxConcurrentCalls: 50,
        maxInternationalPerDay: 5,
        blockInternational: true,
        blockExpensiveDestinations: true,
        maxCallDurationMinutes: 180,
        alertEmail: 'noc@enlacedigital.com.br',
        autoSuspendOnAnomaly: true
      }
    },
    {
      id: 'tenant-hospital-vida',
      name: 'Rede Hospitalar Vida & Saúde',
      cnpj: '98.765.432/0001-11',
      plan: 'Healthcare PBX + AI Agente',
      maxExtensions: 500,
      maxTrunks: 64,
      aiCreditsUsd: 2800.0,
      createdAt: '2025-02-15T10:30:00Z',
      antiFraud: {
        maxConcurrentCalls: 100,
        maxInternationalPerDay: 0,
        blockInternational: true,
        blockExpensiveDestinations: true,
        maxCallDurationMinutes: 60,
        alertEmail: 'ti@hospitalvida.com.br',
        autoSuspendOnAnomaly: false
      }
    },
  ];

  users: User[] = [
    {
      id: 'user-1',
      tenantId: 'tenant-enlace-matriz',
      name: 'Carlos Henrique Silva',
      email: 'carlos.silva@enlacedigital.com.br',
      role: 'super_admin',
      extension: '4101',
      isActive: true,
      lastLogin: '2026-09-10T11:42:00Z',
    },
    {
      id: 'user-2',
      tenantId: 'tenant-enlace-matriz',
      name: 'Mariana Duarte Souza',
      email: 'mariana.souza@enlacedigital.com.br',
      role: 'supervisor',
      extension: '4102',
      isActive: true,
      lastLogin: '2026-09-10T10:15:00Z',
    },
    {
      id: 'user-3',
      tenantId: 'tenant-enlace-matriz',
      name: 'Lucas Barreto',
      email: 'lucas.barreto@enlacedigital.com.br',
      role: 'operador',
      extension: '4103',
      isActive: true,
      lastLogin: '2026-09-10T09:00:00Z',
    },
    {
      id: 'user-auditor',
      tenantId: 'tenant-enlace-matriz',
      name: 'Fernanda Leite (Auditoria LGPD)',
      email: 'auditoria@enlacedigital.com.br',
      role: 'auditor',
      isActive: true,
      lastLogin: '2026-09-09T16:30:00Z',
    },
  ];

  extensions: Extension[] = [
    {
      id: 'ext-4101',
      tenantId: 'tenant-enlace-matriz',
      number: '4101',
      name: 'Central & Operador (Carlos Silva)',
      sipSecret: 'Enlace@4101#Sec',
      context: 'from-internal',
      callerId: '"Carlos Silva" <4101>',
      codecs: ['opus', 'pcma', 'pcmu', 'g722'],
      nat: true,
      webrtc: true,
      recording: 'always',
      voicemail: true,
      dnd: false,
      status: 'online',
      ipAddress: '192.168.10.15:5060',
      allowAiTransfer: true,
    },
    {
      id: 'ext-4102',
      tenantId: 'tenant-enlace-matriz',
      number: '4102',
      name: 'Suporte Técnico N1 (Roberto Mendes)',
      sipSecret: 'Enlace@4102#Sec',
      context: 'from-internal',
      callerId: '"Roberto Mendes" <4102>',
      codecs: ['opus', 'pcma', 'g722'],
      nat: true,
      webrtc: true,
      recording: 'always',
      voicemail: true,
      dnd: false,
      status: 'online',
      ipAddress: '192.168.10.42:5060',
      allowAiTransfer: true,
    },
    {
      id: 'ext-4103',
      tenantId: 'tenant-enlace-matriz',
      number: '4103',
      name: 'Comercial & Vendas (Mariana Costa)',
      sipSecret: 'Enlace@4103#Sec',
      context: 'from-internal',
      callerId: '"Mariana Costa" <4103>',
      codecs: ['opus', 'pcma', 'pcmu'],
      nat: true,
      webrtc: true,
      recording: 'always',
      voicemail: false,
      dnd: false,
      status: 'busy',
      ipAddress: '192.168.10.88:5060',
      allowAiTransfer: true,
    },
    {
      id: 'ext-4201',
      tenantId: 'tenant-enlace-matriz',
      number: '4201',
      name: 'Financeiro e Cobrança',
      sipSecret: 'Enlace@4201#Sec',
      context: 'from-internal',
      callerId: '"Financeiro Enlace" <4201>',
      codecs: ['opus', 'pcma'],
      nat: true,
      webrtc: true,
      recording: 'always',
      voicemail: true,
      dnd: false,
      status: 'online',
      ipAddress: '192.168.10.95:5060',
      allowAiTransfer: true,
    },
    {
      id: 'ext-4301',
      tenantId: 'tenant-enlace-matriz',
      number: '4301',
      name: 'Diretoria Executiva',
      sipSecret: 'Enlace@4301#Sec',
      context: 'from-internal',
      callerId: '"Diretoria" <4301>',
      codecs: ['opus', 'g722'],
      nat: true,
      webrtc: false,
      recording: 'on_demand',
      voicemail: true,
      dnd: false,
      status: 'offline',
      allowAiTransfer: false,
    },
  ];

  trunks: Trunk[] = [
    {
      id: 'trunk-vivo-e1',
      tenantId: 'tenant-enlace-matriz',
      name: 'Vivo Fibra SIP Brasil (Primário)',
      providerName: 'Telefônica Brasil (Vivo Empresas)',
      host: 'sip.vivo.com.br',
      port: 5060,
      username: '1130900100',
      secretMasked: '••••••••••••',
      transport: 'TLS',
      callerId: '1130900100',
      codecs: ['pcma', 'pcmu', 'g722'],
      context: 'from-trunk',
      register: true,
      status: 'registered',
      channelsMax: 30,
      channelsInUse: 4,
    },
    {
      id: 'trunk-claro-0800',
      tenantId: 'tenant-enlace-matriz',
      name: 'Claro Embratel 0800 Nacional',
      providerName: 'Claro Brasil',
      host: 'sip0800.embratel.net.br',
      port: 5060,
      username: '08007702020',
      secretMasked: '••••••••••••',
      transport: 'UDP',
      callerId: '08007702020',
      codecs: ['pcma', 'pcmu'],
      context: 'from-trunk',
      register: true,
      status: 'registered',
      channelsMax: 60,
      channelsInUse: 6,
    },
    {
      id: 'trunk-algar-backup',
      tenantId: 'tenant-enlace-matriz',
      name: 'Algar Telecom Backup',
      providerName: 'Algar Telecom',
      host: 'sip.algartelecom.com.br',
      port: 5060,
      username: '1140028922',
      secretMasked: '••••••••••••',
      transport: 'TCP',
      callerId: '1140028922',
      codecs: ['pcma', 'opus'],
      context: 'from-trunk',
      register: true,
      status: 'registered',
      channelsMax: 15,
      channelsInUse: 0,
    },
  ];

  routes: Route[] = [
    {
      id: 'route-out-sp-local',
      tenantId: 'tenant-enlace-matriz',
      name: 'Saída Local SP (DDD 11)',
      type: 'outbound',
      pattern: '9[2-9]XXXXXXXX',
      prefixRemove: '9',
      trunkId: 'trunk-vivo-e1',
      destinationType: 'trunk',
      destinationId: 'trunk-vivo-e1',
      priority: 1,
      fallbackType: 'human',
      fallbackTarget: '4101',
    },
    {
      id: 'route-out-brasil-ddd',
      tenantId: 'tenant-enlace-matriz',
      name: 'Saída Nacional DDD (0 + DDD + Número)',
      type: 'outbound',
      pattern: '0[1-9][1-9]9XXXXXXXX',
      trunkId: 'trunk-vivo-e1',
      destinationType: 'trunk',
      destinationId: 'trunk-vivo-e1',
      priority: 2,
    },
    {
      id: 'route-in-0800',
      tenantId: 'tenant-enlace-matriz',
      name: 'Entrada 0800 Nacional → Agente Gemini MaIA',
      type: 'inbound',
      pattern: '08007702020',
      destinationType: 'ai_agent',
      destinationId: 'agent-maia-247',
      priority: 1,
      fallbackType: 'queue',
      fallbackTarget: 'queue-suporte-n1',
    },
    {
      id: 'route-in-fixo-matriz',
      tenantId: 'tenant-enlace-matriz',
      name: 'Entrada Fixo SP (11 3090-0100) → URA Principal',
      type: 'inbound',
      pattern: '1130900100',
      destinationType: 'ivr',
      destinationId: 'ivr-principal',
      priority: 2,
    },
  ];

  ringGroups: RingGroup[] = [
    {
      id: 'group-comercial',
      tenantId: 'tenant-enlace-matriz',
      name: 'Grupo Comercial',
      number: '8001',
      strategy: 'roundrobin',
      timeoutSeconds: 25,
      members: ['4101', '4103'],
      failoverDestination: 'queue-suporte-n1',
    },
    {
      id: 'group-plantao',
      tenantId: 'tenant-enlace-matriz',
      name: 'Grupo Plantão Suporte',
      number: '8002',
      strategy: 'ringall',
      timeoutSeconds: 30,
      members: ['4101', '4102', '4103'],
      failoverDestination: 'agent-maia-247',
    },
  ];

  queues: Queue[] = [
    {
      id: 'queue-suporte-n1',
      tenantId: 'tenant-enlace-matriz',
      name: 'Fila de Atendimento e Suporte N1',
      number: '7001',
      strategy: 'leastrecent',
      timeoutSeconds: 180,
      wrapUpTimeSeconds: 15,
      mohSound: 'enlace-bossa-nova',
      slaTargetSeconds: 20,
      members: ['4101', '4102'],
      callsWaiting: 2,
      avgWaitTimeSeconds: 14,
      abandonedToday: 3,
      answeredToday: 78,
    },
    {
      id: 'queue-financeiro',
      tenantId: 'tenant-enlace-matriz',
      name: 'Fila Financeiro & Faturamento',
      number: '7002',
      strategy: 'roundrobin',
      timeoutSeconds: 120,
      wrapUpTimeSeconds: 20,
      mohSound: 'default',
      slaTargetSeconds: 30,
      members: ['4201'],
      callsWaiting: 0,
      avgWaitTimeSeconds: 8,
      abandonedToday: 1,
      answeredToday: 34,
    },
  ];

  ivrs: Ivr[] = [
    {
      id: 'ivr-principal',
      tenantId: 'tenant-enlace-matriz',
      name: 'URA Principal — Enlace Telecom',
      number: '6001',
      audioPrompt: 'Olá! Você ligou para a Enlace Telecom. Para Comercial digite 1. Para Suporte Técnico com Roberto digite 2. Para Financeiro digite 3. Ou digite 9 para falar com nossa atendente de Inteligência Artificial MaIA.',
      timeoutSeconds: 10,
      invalidRetries: 3,
      options: [
        { digit: '1', label: 'Comercial (Mariana)', destinationType: 'extension', destinationTarget: '4103' },
        { digit: '2', label: 'Suporte Técnico (Roberto Mendes)', destinationType: 'queue', destinationTarget: 'queue-suporte-n1' },
        { digit: '3', label: 'Financeiro (Renata)', destinationType: 'queue', destinationTarget: 'queue-financeiro' },
        { digit: '9', label: 'Falar com Agente IA MaIA', destinationType: 'ai_agent', destinationTarget: 'agent-maia-247' },
        { digit: '0', label: 'Operador Humano (Carlos)', destinationType: 'extension', destinationTarget: '4101' },
      ],
      flow: {
        nodes: [
          {
            id: 'node-start',
            type: 'start',
            title: 'Entrada da Chamada (DID 6001)',
            position: { x: 40, y: 160 },
            data: {},
          },
          {
            id: 'node-time',
            type: 'time_condition',
            title: 'Expediente (08:00 - 18:00)',
            position: { x: 300, y: 160 },
            data: {
              timeCondition: {
                openTime: '08:00',
                closeTime: '18:00',
                daysOfWeek: [1, 2, 3, 4, 5],
              },
            },
          },
          {
            id: 'node-audio-welcome',
            type: 'audio',
            title: 'Mensagem de Boas-Vindas',
            position: { x: 580, y: 110 },
            data: {
              audioSource: 'tts',
              audioText: 'Olá! Bem-vindo à Enlace Telecom. Para Comercial digite 1, Suporte 2, Financeiro 3, ou digite 9 para falar com nossa IA MaIA.',
              voiceName: 'pt-BR-FranciscaNeural',
              allowInterrupt: true,
            },
          },
          {
            id: 'node-dtmf-menu',
            type: 'dtmf',
            title: 'Menu de Dígitos DTMF',
            position: { x: 890, y: 110 },
            data: {
              digits: [
                { digit: '1', label: 'Comercial' },
                { digit: '2', label: 'Suporte Técnico' },
                { digit: '3', label: 'Financeiro' },
                { digit: '9', label: 'Atendente IA MaIA' },
                { digit: '0', label: 'Operador Humano' },
              ],
              timeoutSeconds: 8,
              invalidRetries: 3,
              repeatAudioOnInvalid: true,
            },
          },
          {
            id: 'node-ext-comercial',
            type: 'extension',
            title: 'Ramal 4103 (Comercial)',
            position: { x: 1240, y: 20 },
            data: {
              extensionNumber: '4103',
              extensionName: 'Mariana Costa (Comercial)',
            },
          },
          {
            id: 'node-queue-suporte',
            type: 'queue',
            title: 'Fila 5001 (Suporte N1)',
            position: { x: 1240, y: 120 },
            data: {
              queueId: 'queue-suporte-n1',
              queueName: 'Fila Suporte N1 (Asterisk ACD)',
              queueStrategy: 'rrmemory',
            },
          },
          {
            id: 'node-queue-financeiro',
            type: 'queue',
            title: 'Fila 5002 (Financeiro)',
            position: { x: 1240, y: 220 },
            data: {
              queueId: 'queue-financeiro',
              queueName: 'Fila Financeiro & Faturamento',
              queueStrategy: 'leastrecent',
            },
          },
          {
            id: 'node-ai-maia',
            type: 'ai_agent',
            title: 'MaIA (Atendente Virtual IA)',
            position: { x: 1240, y: 320 },
            data: {
              aiAgentId: 'agent-maia-247',
              aiAgentName: 'MaIA — Atendimento & Triagem 24/7',
              aiVoiceModel: 'gemini-flash-latest / Zephyr',
              aiPromptContext: 'Atendimento inicial de clientes, consulta de planos e status de conexão fibra óptica.',
            },
          },
          {
            id: 'node-ext-operador',
            type: 'extension',
            title: 'Ramal 4101 (Operador Carlos)',
            position: { x: 1240, y: 420 },
            data: {
              extensionNumber: '4101',
              extensionName: 'Carlos Silva (Operador Central)',
            },
          },
          {
            id: 'node-audio-closed',
            type: 'audio',
            title: 'Aviso Fora do Expediente',
            position: { x: 580, y: 370 },
            data: {
              audioSource: 'tts',
              audioText: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h. Para urgências, utilize nosso aplicativo ou WhatsApp.',
              voiceName: 'pt-BR-FranciscaNeural',
              allowInterrupt: false,
            },
          },
          {
            id: 'node-hangup-closed',
            type: 'hangup',
            title: 'Desligar Chamada',
            position: { x: 890, y: 370 },
            data: {
              hangupCause: 'normal',
            },
          },
        ],
        connections: [
          { id: 'conn-1', fromNodeId: 'node-start', fromPort: 'out', toNodeId: 'node-time' },
          { id: 'conn-2', fromNodeId: 'node-time', fromPort: 'open', toNodeId: 'node-audio-welcome' },
          { id: 'conn-3', fromNodeId: 'node-time', fromPort: 'closed', toNodeId: 'node-audio-closed' },
          { id: 'conn-4', fromNodeId: 'node-audio-welcome', fromPort: 'out', toNodeId: 'node-dtmf-menu' },
          { id: 'conn-5', fromNodeId: 'node-dtmf-menu', fromPort: '1', toNodeId: 'node-ext-comercial' },
          { id: 'conn-6', fromNodeId: 'node-dtmf-menu', fromPort: '2', toNodeId: 'node-queue-suporte' },
          { id: 'conn-7', fromNodeId: 'node-dtmf-menu', fromPort: '3', toNodeId: 'node-queue-financeiro' },
          { id: 'conn-8', fromNodeId: 'node-dtmf-menu', fromPort: '9', toNodeId: 'node-ai-maia' },
          { id: 'conn-9', fromNodeId: 'node-dtmf-menu', fromPort: '0', toNodeId: 'node-ext-operador' },
          { id: 'conn-10', fromNodeId: 'node-audio-closed', fromPort: 'out', toNodeId: 'node-hangup-closed' },
        ],
      },
    },
  ];

  aiProviders: AiProvider[] = [
    {
      id: 'provider-gemini-live',
      tenantId: 'tenant-enlace-matriz',
      name: 'Google Gemini (Gateway Oficial)',
      providerType: 'gemini_live',
      apiKeyMasked: 'AIza••••••••••••••••••••8F92',
      googleProjectId: 'enlace-telecom-pbx-cloud',
      googleLocation: 'southamerica-east1',
      defaultModel: 'gemini-flash-latest',
      defaultVoice: 'Zephyr',
      defaultTemperature: 0.3,
      isActive: true,
      updatedAt: '2026-09-08T14:20:00Z',
    },
    {
      id: 'provider-9router-1',
      tenantId: 'tenant-enlace-matriz',
      name: '9Router Enterprise AI',
      providerType: '9router',
      apiKeyMasked: '9R-••••••••••••••••••••XYZ',
      defaultModel: '9router-voice-pro',
      defaultVoice: 'Camila (BR)',
      defaultTemperature: 0.5,
      isActive: true,
      updatedAt: '2026-09-09T09:00:00Z',
    },
    {
      id: 'provider-vertex-enterprise',
      tenantId: 'tenant-enlace-matriz',
      name: 'Google Cloud Vertex AI Enterprise',
      providerType: 'vertex_ai',
      apiKeyMasked: 'AIza••••••••••••••••••••3C41',
      googleProjectId: 'enlace-telecom-vertex-prod',
      googleLocation: 'southamerica-east1',
      defaultModel: 'gemini-3.8-flash',
      defaultVoice: 'Kore',
      defaultTemperature: 0.2,
      isActive: true,
      updatedAt: '2026-09-07T11:00:00Z',
    },
  ];

  aiTools: AiTool[] = [
    {
      id: 'tool-consultar-cliente',
      tenantId: 'tenant-enlace-matriz',
      name: 'consultar_cliente',
      description: 'Consulta cadastro do cliente brasileiro pelo CPF/CNPJ ou número de telefone de origem.',
      endpoint: '/api/v1/integrations/crm/customer',
      method: 'GET',
      requiresConfirmation: false,
      schemaJson: {
        type: 'object',
        properties: {
          cpf_cnpj: { type: 'string', description: 'Número do CPF ou CNPJ formatado ou apenas dígitos' },
          telefone: { type: 'string', description: 'Número de telefone do chamador no formato E.164' },
        },
      },
      mockResponse: {
        status: 'encontrado',
        nome: 'Dra. Camila Nogueira',
        plano: 'Fibra Dedicada 600Mbps + 10 Ramais IP',
        status_fatura: 'Em dia',
        protocolo_ativo: null,
      },
    },
    {
      id: 'tool-consultar-fatura',
      tenantId: 'tenant-enlace-matriz',
      name: 'consultar_fatura',
      description: 'Consulta informações da última fatura, código de barras Pix ou código para pagamento.',
      endpoint: '/api/v1/integrations/erp/invoices',
      method: 'GET',
      requiresConfirmation: false,
      schemaJson: {
        type: 'object',
        properties: {
          cpf_cnpj: { type: 'string', description: 'CPF ou CNPJ do titular' },
        },
        required: ['cpf_cnpj'],
      },
      mockResponse: {
        valor: 'R$ 289,90',
        vencimento: '15/09/2026',
        pix_copia_cola: '00020126580014br.gov.bcb.pix0136enlace-telecom-cobranca@enlace.com.br5204000053039865406289.905802BR5914ENLACE TELECOM6009SAO PAULO62070503***6304E8A2',
        status: 'Aberta a vencer',
      },
    },
    {
      id: 'tool-abrir-ticket',
      tenantId: 'tenant-enlace-matriz',
      name: 'abrir_ticket',
      description: 'Abre chamado técnico no sistema de suporte da Enlace Telecom com protocolo gerado.',
      endpoint: '/api/v1/integrations/helpdesk/tickets',
      method: 'POST',
      requiresConfirmation: true,
      schemaJson: {
        type: 'object',
        properties: {
          categoria: { type: 'string', description: 'Categoria do problema: lentidão, sem_conexao, configuracao_ramal' },
          descricao: { type: 'string', description: 'Descrição sucinta relatada pelo cliente' },
          urgencia: { type: 'string', enum: ['baixa', 'media', 'alta', 'critica'] },
        },
        required: ['categoria', 'descricao'],
      },
      mockResponse: {
        protocolo: 'ENL-2026-98124',
        previsao_atendimento: 'Até 4 horas úteis',
        status: 'Aberto na Fila N1',
      },
    },
    {
      id: 'tool-transferir-chamada',
      tenantId: 'tenant-enlace-matriz',
      name: 'transferir_chamada',
      description: 'Transfere a chamada telefônica ativa para um ramal humano ou fila de atendimento do Asterisk via ARI.',
      endpoint: '/api/v1/asterisk/ari/transfer',
      method: 'POST',
      requiresConfirmation: false,
      schemaJson: {
        type: 'object',
        properties: {
          destino: { type: 'string', description: 'Número do ramal (ex: 4101, 4102) ou fila (ex: 7001)' },
          motivo: { type: 'string', description: 'Motivo sucinto para repassar no contexto do atendente' },
        },
        required: ['destino', 'motivo'],
      },
      mockResponse: {
        sucesso: true,
        canal_ari: 'PJSIP/4101-000001a4',
        mensagem: 'Transferência assistida realizada via bridge ARI',
      },
    },
    {
      id: 'tool-encerrar-chamada',
      tenantId: 'tenant-enlace-matriz',
      name: 'encerrar_chamada',
      description: 'Encerra a chamada telefônica após despedida do cliente ou conclusão da solicitação.',
      endpoint: '/api/v1/asterisk/ari/hangup',
      method: 'POST',
      requiresConfirmation: false,
      schemaJson: {
        type: 'object',
        properties: {
          motivo: { type: 'string', description: 'Motivo da finalização' },
        },
      },
      mockResponse: {
        sucesso: true,
        status: 'Chamada finalizada normalmente',
      },
    },
  ];

  aiKnowledge: AiKnowledgeSource[] = [
    {
      id: 'kb-planos-servicos',
      tenantId: 'tenant-enlace-matriz',
      title: 'Planos e Serviços de Telefonia IP Enlace',
      category: 'Comercial',
      content: `A Enlace Telecom oferece soluções corporativas de Telefonia IP brasileira com núcleo Asterisk puro e inteligência artificial Google Gemini.
Nossos planos incluem:
- Plano PME: Até 20 ramais, 4 troncos SIP, gravação em nuvem, URA inteligente, por R$ 249/mês.
- Plano Corporativo: Até 100 ramais, 16 troncos SIP, gravação com transcrição Gemini AI, R$ 790/mês.
- Plano Enterprise Dedicado: Ramais ilimitados, tronco 0800 incluso, agentes de voz com Gemini Live API, SLA 99.98%, sob consulta.
Todos os planos possuem suporte 24/7 com equipe no Brasil e faturamento via Pix ou boleto bancário com D+30.`,
      updatedAt: '2026-09-05T10:00:00Z',
    },
    {
      id: 'kb-suporte-problemas',
      tenantId: 'tenant-enlace-matriz',
      title: 'Guia de Suporte e Diagnóstico de Conexão e Ramais IP',
      category: 'Suporte Técnico',
      content: `Procedimento para clientes com instabilidade no telefone IP ou softphone:
1. Verificar se o LED do aparelho está verde fixo indicando registro no servidor SIP da Enlace.
2. Confirmar se a rede local não está bloqueando as portas SIP (5060 UDP/TCP ou 5061 TLS) e a faixa RTP (10000-20000 UDP).
3. Reiniciar o switch PoE ou adaptador de energia aguardando 60 segundos.
4. Para softphones WebRTC no navegador, garantir que a permissão de microfone foi concedida e que codecs Opus e PCMA estão habilitados.
5. Se o problema persistir por mais de 5 minutos, o atendente deve abrir um ticket com urgência "alta" e transferir para a fila 7001 (Suporte N1).`,
      updatedAt: '2026-09-08T11:30:00Z',
    },
    {
      id: 'kb-horarios-politicas',
      tenantId: 'tenant-enlace-matriz',
      title: 'Horários de Atendimento e Políticas LGPD',
      category: 'Institucional',
      content: `Horários de Atendimento da Enlace Telecom:
- Atendimento Comercial e Financeiro: Segunda a Sexta das 08h00 às 18h00 (horário de Brasília).
- Suporte Técnico N1 e N2: 24 horas por dia, 7 dias por semana, inclusive feriados.
- Atendente Virtual de Voz (MaIA): Disponível 24/7 ininterruptamente para triagem, consulta de faturas, abertura de tickets e encaminhamento.
Políticas de Privacidade (LGPD): Todas as chamadas são gravadas com consentimento prévio para fins de qualidade e segurança jurídica. Os dados de voz e transcrições são armazenados com criptografia em repouso e podem ser excluídos pelo titular mediante requisição formal.`,
      updatedAt: '2026-09-01T09:00:00Z',
    },
  ];

  aiAgents: AiAgent[] = [
    {
      id: 'agent-maia-247',
      tenantId: 'tenant-enlace-matriz',
      name: 'MaIA — Atendimento & Triagem Inteligente 24/7',
      description: 'Agente de voz principal da Enlace Telecom baseada no Google Gemini, com voz feminina fluida, baixa latência e barge-in nativo.',
      providerId: 'provider-gemini-live',
      model: 'gemini-3.8-flash',
      voice: 'Zephyr',
      voiceGender: 'female',
      avatarType: 'female_ai',
      language: 'pt-BR',
      systemInstruction: `Você é a MaIA, assistente virtual inteligente e acolhedora da Enlace Telecom, uma empresa brasileira pioneira em telefonia IP e IA.
Seu tom de voz deve ser profissional, empático, ágil e 100% em português do Brasil.
Suas responsabilidades:
1. Cumprimentar cordialmente o cliente e entender o motivo da ligação.
2. Usar a ferramenta consultar_cliente ou consultar_fatura quando o cliente precisar de dados cadastrais ou 2ª via de conta.
3. Se for um problema técnico simples, orientar conforme o conhecimento da Enlace.
4. Se o cliente solicitar falar com atendente humano ou se o problema for complexo, acione a ferramenta transferir_chamada para o ramal 4102 (Suporte) ou 4101 (Recepção).
5. Nunca invente dados técnicos ou valores financeiros que não venham das suas ferramentas ou base de conhecimento.
6. Mantenha respostas curtas e naturais para telefonia (1 a 3 frases por resposta).`,
      initialGreeting: 'Olá! Sou a MaIA, assistente virtual da Enlace Telecom. Como posso ajudar você hoje?',
      temperature: 0.3,
      tools: ['tool-consultar-cliente', 'tool-consultar-fatura', 'tool-abrir-ticket', 'tool-transferir-chamada', 'tool-encerrar-chamada'],
      knowledgeSources: ['kb-planos-servicos', 'kb-suporte-problemas', 'kb-horarios-politicas'],
      allowBargeIn: true,
      silenceTimeoutSeconds: 5,
      maxSessionMinutes: 15,
      transferExtension: '4102',
      fallbackAction: 'transfer_queue',
      isActive: true,
    },
    {
      id: 'agent-suporte-n1',
      tenantId: 'tenant-enlace-matriz',
      name: 'Roberto Mendes — Suporte N1 & NOC',
      description: 'Agente técnico especialista em incidentes de rede, VoIP e telefones IP, com voz masculina encorpada, firme e acolhedora.',
      providerId: 'provider-gemini-live',
      model: 'gemini-3.8-flash',
      voice: 'Fenrir',
      voiceGender: 'male',
      avatarType: 'male_tech',
      language: 'pt-BR',
      systemInstruction: `Você é o Roberto Mendes, especialista técnico sênior da Enlace Telecom.
Seu tom de voz deve ser calmo, confiante, paciente e técnico, com entonação masculina segura.
Seu objetivo é coletar sintomas de falhas na telefonia (eco, picote de áudio, queda de ligação ou ramal desregistrado), orientar os primeiros passos de diagnóstico e abrir chamado ou transferir com prioridade adequada.`,
      initialGreeting: 'Alô! Aqui é o Roberto do Suporte Técnico Enlace. Qual instabilidade ou problema no seu ramal ou link de rede você está enfrentando?',
      temperature: 0.2,
      tools: ['tool-consultar-cliente', 'tool-abrir-ticket', 'tool-transferir-chamada'],
      knowledgeSources: ['kb-suporte-problemas'],
      allowBargeIn: true,
      silenceTimeoutSeconds: 6,
      maxSessionMinutes: 10,
      transferExtension: '4102',
      fallbackAction: 'transfer_human',
      isActive: true,
    },
  ];

  aiSessions: AiSession[] = [
    {
      id: 'aisess-9021',
      tenantId: 'tenant-enlace-matriz',
      agentId: 'agent-maia-247',
      agentName: 'MaIA — Atendimento 24/7',
      callId: 'call-11998765432-01',
      caller: '(11) 99876-5432',
      channel: 'PJSIP/trunk-vivo-e1-0000021b',
      sessionType: 'voice_live',
      startedAt: '2026-09-10T11:20:00Z',
      endedAt: '2026-09-10T11:22:45Z',
      durationSeconds: 165,
      status: 'transferred',
      transcript: [
        { role: 'system', text: 'Sessão iniciada no Asterisk [from-gemini] via AudioSocket e Gemini Live API.', timestamp: '11:20:00' },
        { role: 'model', text: 'Olá! Sou a MaIA, assistente virtual da Enlace Telecom. Como posso ajudar você hoje?', timestamp: '11:20:02' },
        { role: 'user', text: 'Oi MaIA, estou com uma dúvida na minha fatura que venceu ontem e queria falar com o suporte.', timestamp: '11:20:12' },
        { role: 'model', text: 'Entendi! Posso consultar sua fatura agora mesmo ou te transferir para nossa equipe financeira. Qual é o CNPJ ou CPF da sua empresa?', timestamp: '11:20:18' },
        { role: 'user', text: 'Prefiro falar com alguém do financeiro para renegociar.', timestamp: '11:20:30' },
        { role: 'model', text: 'Sem problemas! Vou transferir sua chamada imediatamente para o setor financeiro. Tenha um excelente dia!', timestamp: '11:20:35' },
        { role: 'tool', text: 'transferir_chamada(destino="4201", motivo="Cliente deseja renegociação de fatura")', timestamp: '11:20:37' },
      ],
      tokensInput: 1420,
      tokensOutput: 380,
      audioSeconds: 42,
      latencyAverageMs: 380,
      transferReason: 'Solicitação de negociação com operador financeiro',
      costEstimateBrl: 0.18,
    },
    {
      id: 'aisess-9022',
      tenantId: 'tenant-enlace-matriz',
      agentId: 'agent-maia-247',
      agentName: 'MaIA — Atendimento 24/7',
      callId: 'call-11987112233-02',
      caller: '(11) 98711-2233',
      channel: 'PJSIP/trunk-claro-0800-0000021c',
      sessionType: 'voice_live',
      startedAt: '2026-09-10T10:45:00Z',
      endedAt: '2026-09-10T10:47:10Z',
      durationSeconds: 130,
      status: 'completed',
      transcript: [
        { role: 'system', text: 'Sessão iniciada com sucesso.', timestamp: '10:45:00' },
        { role: 'model', text: 'Olá! Sou a MaIA, assistente virtual da Enlace Telecom. Como posso ajudar você hoje?', timestamp: '10:45:02' },
        { role: 'user', text: 'Oi, queria saber se os ramais de vocês suportam WebRTC direto no navegador.', timestamp: '10:45:10' },
        { role: 'model', text: 'Sim! O Enlace-PBX possui suporte nativo a WebRTC com codecs Opus e PCMA, permitindo fazer e receber chamadas diretamente pelo navegador sem instalar nada.', timestamp: '10:45:18' },
        { role: 'user', text: 'Excelente, era só isso mesmo, obrigado!', timestamp: '10:45:26' },
        { role: 'model', text: 'Por nada! Qualquer outra dúvida estou à disposição. Até logo!', timestamp: '10:45:30' },
      ],
      tokensInput: 980,
      tokensOutput: 210,
      audioSeconds: 28,
      latencyAverageMs: 340,
      costEstimateBrl: 0.11,
    },
  ];

  cdrs: CdrRecord[] = [
    {
      id: 'cdr-1001',
      tenantId: 'tenant-enlace-matriz',
      uniqueId: '1725969600.104',
      caller: '(11) 99876-5432',
      callee: '08007702020',
      direction: 'inbound',
      startTime: '2026-09-10T11:20:00Z',
      answerTime: '2026-09-10T11:20:02Z',
      endTime: '2026-09-10T11:22:45Z',
      duration: 165,
      billsec: 163,
      disposition: 'ANSWERED',
      recordingUrl: 'https://storage.googleapis.com/enlace-recordings/rec-1725969600.mp3',
      trunkName: 'Claro Embratel 0800',
      extension: '4201',
      aiAgentId: 'agent-maia-247',
      aiSessionId: 'aisess-9021',
      isAiHandled: true,
      isTransferred: true,
      transferredTo: '4201 (Financeiro)',
      ivrPath: 'URA -> Opção 9 (MaIA) -> Transbordo',
      sentiment: 'neutral',
      transcription: 'Chamador solicitou informações sobre fatura vencida e foi transferido pela IA MaIA para o ramal financeiro 4201.',
      summary: 'Atendimento inicial realizado por MaIA. Transferido com sucesso para Ramal 4201 após validação de intenção de renegociação.',
      costBrl: 0.45,
    },
    {
      id: 'cdr-1002',
      tenantId: 'tenant-enlace-matriz',
      uniqueId: '1725967500.102',
      caller: '4101',
      callee: '4102',
      direction: 'internal',
      startTime: '2026-09-10T10:50:00Z',
      answerTime: '2026-09-10T10:50:04Z',
      endTime: '2026-09-10T10:54:20Z',
      duration: 260,
      billsec: 256,
      disposition: 'ANSWERED',
      recordingUrl: 'https://storage.googleapis.com/enlace-recordings/rec-1725967500.mp3',
      extension: '4101',
      isAiHandled: false,
      isTransferred: false,
      sentiment: 'positive',
      costBrl: 0.0,
    },
    {
      id: 'cdr-1003',
      tenantId: 'tenant-enlace-matriz',
      uniqueId: '1725966300.99',
      caller: '(11) 98711-2233',
      callee: '1130900100',
      direction: 'inbound',
      startTime: '2026-09-10T10:45:00Z',
      answerTime: '2026-09-10T10:45:02Z',
      endTime: '2026-09-10T10:47:10Z',
      duration: 130,
      billsec: 128,
      disposition: 'ANSWERED',
      trunkName: 'Vivo Fibra SIP Brasil',
      aiAgentId: 'agent-maia-247',
      aiSessionId: 'aisess-9022',
      isAiHandled: true,
      isTransferred: false,
      ivrPath: 'URA -> Opção 9 (MaIA Autoatendimento)',
      sentiment: 'positive',
      transcription: 'Consulta sobre compatibilidade WebRTC no navegador.',
      summary: 'Dúvida esclarecida satisfatoriamente pela assistente virtual MaIA. Chamada encerrada sem transbordo.',
      costBrl: 0.12,
    },
    {
      id: 'cdr-1004',
      tenantId: 'tenant-enlace-matriz',
      uniqueId: '1725962000.85',
      caller: '4103',
      callee: '11977778899',
      direction: 'outbound',
      startTime: '2026-09-10T09:30:00Z',
      answerTime: '2026-09-10T09:30:15Z',
      endTime: '2026-09-10T09:34:00Z',
      duration: 240,
      billsec: 225,
      disposition: 'ANSWERED',
      trunkName: 'Vivo Fibra SIP Brasil',
      extension: '4103',
      isAiHandled: false,
      isTransferred: false,
      sentiment: 'positive',
      costBrl: 0.38,
    },
    {
      id: 'cdr-1005',
      tenantId: 'tenant-enlace-matriz',
      uniqueId: '1725959000.72',
      caller: '(21) 99123-4567',
      callee: '1130900100',
      direction: 'inbound',
      startTime: '2026-09-10T08:40:00Z',
      endTime: '2026-09-10T08:40:25Z',
      duration: 25,
      billsec: 0,
      disposition: 'NO ANSWER',
      trunkName: 'Vivo Fibra SIP Brasil',
      isAiHandled: false,
      isTransferred: false,
      costBrl: 0.0,
    },
    {
      id: 'cdr-1006',
      tenantId: 'tenant-enlace-matriz',
      uniqueId: '1725958100.61',
      caller: '(19) 98455-6677',
      callee: '1130900100',
      direction: 'inbound',
      startTime: '2026-09-10T08:15:00Z',
      answerTime: '2026-09-10T08:15:05Z',
      endTime: '2026-09-10T08:19:40Z',
      duration: 275,
      billsec: 270,
      disposition: 'ANSWERED',
      recordingUrl: 'https://storage.googleapis.com/enlace-recordings/rec-1725958100.mp3',
      trunkName: 'Vivo Fibra SIP Brasil',
      extension: '4102',
      isAiHandled: false,
      isTransferred: true,
      transferredTo: '7001 (Fila Suporte N1)',
      ivrPath: 'URA -> Opção 2 (Suporte)',
      sentiment: 'neutral',
      transcription: 'Cliente relatou lentidão pontual no link de fibra dedicado. Atendente Roberto Mendes verificou os parâmetros de atenuação óptica e normalizou a conexão.',
      summary: 'Atendimento de suporte técnico. Transferido via URA opção 2 para Fila Suporte N1. Incidente de lentidão resolvido.',
      costBrl: 0.32,
    },
  ];

  webhooks: WebhookConfig[] = [
    {
      id: 'webhook-crm-hub',
      tenantId: 'tenant-enlace-matriz',
      name: 'Integração CRM Comercial',
      url: 'https://api.empresa.com.br/webhooks/enlace-pbx/calls',
      events: ['call.started', 'call.answered', 'call.ended', 'ai.session.ended'],
      secretToken: 'whsec_enlace_981a2bc8',
      isActive: true,
      lastTriggered: '2026-09-10T11:22:46Z',
    },
  ];

  auditLogs: AuditLog[] = [
    {
      id: 'audit-01',
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'UPDATE_AGENT_PROMPT',
      resource: 'ai_agents/agent-maia-247',
      ip: '189.40.122.14',
      timestamp: '2026-09-10T11:00:15Z',
      details: 'Ajuste no prompt do sistema da MaIA para suporte a regras de faturamento.',
    },
    {
      id: 'audit-02',
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-2',
      userName: 'Mariana Duarte Souza',
      action: 'DOWNLOAD_RECORDING',
      resource: 'recordings/rec-1725969600.mp3',
      ip: '189.40.122.18',
      timestamp: '2026-09-10T11:25:00Z',
      details: 'Download autorizado para auditoria de atendimento (Protocolo LGPD registrado).',
    },
    {
      id: 'audit-03',
      tenantId: 'tenant-enlace-matriz',
      userId: 'user-1',
      userName: 'Carlos Henrique Silva',
      action: 'UPDATE_TRUNK',
      resource: 'trunks/trunk-vivo-e1',
      ip: '189.40.122.14',
      timestamp: '2026-09-09T17:40:22Z',
      details: 'Renovação de certificado TLS e verificação de registro SIP.',
    },
  ];

  crmProviders: CrmProvider[] = [
    {
      id: 'crm-hubspot-1',
      tenantId: 'tenant-enlace-matriz',
      name: 'HubSpot Corporativo',
      type: 'hubspot',
      isConnected: true,
      syncedAt: '2026-09-10T11:20:00Z',
      config: { portalId: '1234567' },
    },
    {
      id: 'crm-pipedrive-1',
      tenantId: 'tenant-hospital-vida',
      name: 'Pipedrive Vida & Saúde',
      type: 'pipedrive',
      isConnected: false,
      config: {},
    },
    {
      id: 'crm-suitecrm-1',
      tenantId: 'tenant-enlace-matriz',
      name: 'SuiteCRM (Open Source)',
      type: 'suitecrm',
      isConnected: false,
      config: { url: 'https://crm.meudominio.com.br' },
    },
    {
      id: 'crm-odoo-1',
      tenantId: 'tenant-enlace-matriz',
      name: 'Odoo ERP (Community)',
      type: 'odoo',
      isConnected: false,
      config: { url: 'https://erp.meudominio.com.br' },
    },
    {
      id: 'crm-twenty-1',
      tenantId: 'tenant-enlace-matriz',
      name: 'Twenty CRM',
      type: 'twenty',
      isConnected: false,
      config: { url: 'https://app.twenty.com', apiKey: '' },
    },
    {
      id: 'crm-espocrm-1',
      tenantId: 'tenant-enlace-matriz',
      name: 'EspoCRM',
      type: 'espocrm',
      isConnected: false,
      config: { url: 'https://meu-espo.com', apiKey: '' },
    },
    {
      id: 'crm-basalt-1',
      tenantId: 'tenant-enlace-matriz',
      name: 'BasaltCRM',
      type: 'basaltcrm',
      isConnected: false,
      config: { url: 'https://basalt.meudominio.com.br', apiKey: '' },
    }
  ];

  crmContacts: CrmContact[] = [
    {
      id: 'contact-001',
      tenantId: 'tenant-enlace-matriz',
      name: 'João da Silva',
      phone: '5511999999999',
      email: 'joao@cliente.com',
      crmId: 'hubspot-8291',
      lastInteraction: '2026-09-09T14:00:00Z',
    },
  ];

  customerMemories: CustomerMemory[] = [
    {
      id: 'mem-001',
      tenantId: 'tenant-enlace-matriz',
      contactId: 'contact-001',
      phone: '5511999999999',
      summary: 'Cliente interessado em migrar de plano PME para Corporativo. Reclamou de lentidão na rota internacional.',
      preferences: ['Prefere atendimento via WhatsApp', 'Aprovação de orçamentos apenas na sexta-feira'],
      sentimentHistory: 'neutral',
      churnRisk: 30,
    }
  ];

  omnichannelConversations: OmnichannelConversation[] = [
    {
      id: 'conv-whatsapp-1',
      tenantId: 'tenant-enlace-matriz',
      contactId: 'contact-001',
      channel: 'whatsapp',
      status: 'active',
      createdAt: '2026-09-10T12:00:00Z',
      messages: [
        { id: 'msg-1', sender: 'user', text: 'Olá, preciso de ajuda com o PBX.', timestamp: '2026-09-10T12:00:00Z' },
        { id: 'msg-2', sender: 'bot', text: 'Olá! Um momento, vou transferir para um agente.', timestamp: '2026-09-10T12:00:05Z' }
      ]
    },
  ];

  whatsappConfigs: WhatsappConfig[] = [];

  // -------------------------------------------------------------------------
  // Redes, VPN & Segurança (WireGuard, ZeroTier, Fail2ban)
  // -------------------------------------------------------------------------
  wireguard: {
    interfaceName: string;
    status: 'active' | 'inactive';
    listenPort: number;
    address: string;
    publicKey: string;
    peersCount: number;
    activePeersCount: number;
    bytesTx: number;
    bytesRx: number;
    dns: string;
    peers: {
      id: string;
      name: string;
      publicKey: string;
      presharedKey?: string;
      allowedIps: string;
      endpoint?: string;
      latestHandshake: string;
      transferRx: number;
      transferTx: number;
      persistentKeepalive: number;
      status: 'connected' | 'idle' | 'offline';
      assignedExtension?: string;
      location?: string;
      createdAt: string;
      enabled: boolean;
    }[];
  } = {
    interfaceName: 'wg0',
    status: 'active',
    listenPort: 51820,
    address: '10.10.0.1/24',
    publicKey: 'a7K9xQ2L0zP+enlace+PBX+pure+asterisk+2026+key=',
    peersCount: 4,
    activePeersCount: 3,
    bytesTx: 142085734, // 142 MB
    bytesRx: 98450122,  // 98 MB
    dns: '10.10.0.1, 1.1.1.1',
    peers: [
      {
        id: 'wg-peer-1',
        name: 'Ramal 4101 - iPhone Diretoria (Softphone PJSIP)',
        publicKey: 'v8Jk19MlpQxW+iphone+ramal+4101+enlace=',
        allowedIps: '10.10.0.2/32',
        endpoint: '177.136.212.45:52190',
        latestHandshake: '14 segundos atrás',
        transferRx: 45201980,
        transferTx: 68120400,
        persistentKeepalive: 25,
        status: 'connected',
        assignedExtension: '4101',
        location: 'São Luís / MA (Móvel 5G)',
        createdAt: '2026-08-15T10:00:00Z',
        enabled: true,
      },
      {
        id: 'wg-peer-2',
        name: 'Filial Imperatriz - Gateway Grandstream FXS/PSTN',
        publicKey: 'z3Bn92KlsQwE+gateway+imperatriz+fxs+trunk=',
        allowedIps: '10.10.0.3/32, 192.168.88.0/24',
        endpoint: '200.220.14.88:51820',
        latestHandshake: '42 segundos atrás',
        transferRx: 38902100,
        transferTx: 51403000,
        persistentKeepalive: 20,
        status: 'connected',
        assignedExtension: 'Tronco-Imperatriz',
        location: 'Imperatriz / MA (Fibra Dedicada)',
        createdAt: '2026-08-18T14:30:00Z',
        enabled: true,
      },
      {
        id: 'wg-peer-3',
        name: 'Atendente Home-Office 01 (Softphone Desktop)',
        publicKey: 'c4Np81QweRtY+homeoffice+ramal+4102+desk=',
        allowedIps: '10.10.0.4/32',
        endpoint: '189.40.92.110:48920',
        latestHandshake: '2 minutos atrás',
        transferRx: 14346042,
        transferTx: 22562334,
        persistentKeepalive: 25,
        status: 'connected',
        assignedExtension: '4102',
        location: 'São José de Ribamar / MA',
        createdAt: '2026-09-01T08:00:00Z',
        enabled: true,
      },
      {
        id: 'wg-peer-4',
        name: 'Backup Linha PBX Secundário (Standby)',
        publicKey: 'm9Kp01AsdFgh+standby+node+enlace+dr=',
        allowedIps: '10.10.0.5/32',
        endpoint: '179.184.22.10:51820',
        latestHandshake: '5 horas atrás',
        transferRx: 0,
        transferTx: 0,
        persistentKeepalive: 30,
        status: 'idle',
        location: 'Data Center São Paulo / SP',
        createdAt: '2026-09-05T19:00:00Z',
        enabled: true,
      },
    ],
  };

  zerotier: {
    nodeId: string;
    status: 'online' | 'offline' | 'connecting';
    version: string;
    networks: {
      id: string;
      name: string;
      status: 'OK' | 'ACCESS_DENIED' | 'NOT_FOUND' | 'PORT_ERROR';
      type: 'PRIVATE' | 'PUBLIC';
      assignedIp: string;
      mac: string;
      mtu: number;
      broadcastEnabled: boolean;
      bridge: boolean;
      routes: string[];
    }[];
    peers: {
      nodeId: string;
      role: 'LEAF' | 'PLANET' | 'MOON';
      latencyMs: number;
      physicalAddress: string;
      linkType: 'DIRECT' | 'RELAY';
      version: string;
    }[];
  } = {
    nodeId: 'e3d4c892b1',
    status: 'online',
    version: '1.12.2',
    networks: [
      {
        id: '8056c2e21c000001',
        name: 'Enlace-Telecom-SDWAN-Mesh',
        status: 'OK',
        type: 'PRIVATE',
        assignedIp: '192.168.192.105/24',
        mac: 'e2:a1:88:42:01:1a',
        mtu: 2800,
        broadcastEnabled: true,
        bridge: false,
        routes: ['192.168.192.0/24'],
      },
    ],
    peers: [
      {
        nodeId: '992a7f8041',
        role: 'LEAF',
        latencyMs: 14,
        physicalAddress: '177.136.210.12:9993',
        linkType: 'DIRECT',
        version: '1.12.2',
      },
      {
        nodeId: 'c1b4d0811e',
        role: 'LEAF',
        latencyMs: 28,
        physicalAddress: '200.220.14.88:9993',
        linkType: 'DIRECT',
        version: '1.12.2',
      },
      {
        nodeId: 'cafe000001',
        role: 'PLANET',
        latencyMs: 46,
        physicalAddress: '50.116.37.144:9993',
        linkType: 'DIRECT',
        version: '1.12.0',
      },
    ],
  };

  vpnRouting: {
    primaryTunnel: 'wireguard' | 'zerotier' | 'failover_auto';
    autoFailover: boolean;
    activeTunnel: 'wireguard' | 'zerotier';
    healthCheckIntervalSec: number;
    wireguardHealthy: boolean;
    zerotierHealthy: boolean;
    lastSwitch: string;
    sipPriorityQoS: boolean;
    mtuOptimization: boolean;
  } = {
    primaryTunnel: 'wireguard',
    autoFailover: true,
    activeTunnel: 'wireguard',
    healthCheckIntervalSec: 5,
    wireguardHealthy: true,
    zerotierHealthy: true,
    lastSwitch: new Date().toISOString(),
    sipPriorityQoS: true,
    mtuOptimization: true,
  };

  fail2ban: {
    daemonStatus: 'active' | 'inactive' | 'reloading';
    version: string;
    uptime: string;
    totalJails: number;
    totalBanned: number;
    jails: {
      name: string;
      title: string;
      description: string;
      status: 'active' | 'disabled';
      filter: string;
      port: string;
      protocol: string;
      currentlyFailed: number;
      totalFailed: number;
      currentlyBanned: number;
      totalBanned: number;
      maxRetry: number;
      findTime: number;
      banTime: number;
    }[];
    bannedIps: {
      id: string;
      ip: string;
      jail: string;
      country: string;
      countryCode: string;
      failures: number;
      bannedAt: string;
      expiresAt: string;
      reason: string;
      reverseDns?: string;
    }[];
    whitelist: string[];
    globalRules: {
      maxRetry: number;
      findTimeSeconds: number;
      banTimeSeconds: number;
      destEmail: string;
      action: string;
      logPathAsterisk: string;
      sipRateLimitPps: number;
      blockUdpFlood: boolean;
      autoSyncIptables: boolean;
    };
  } = {
    daemonStatus: 'active',
    version: '1.0.2',
    uptime: '4d 18h 32m',
    totalJails: 4,
    totalBanned: 7,
    jails: [
      {
        name: 'asterisk-pjsip',
        title: 'Asterisk SIP/PJSIP Proteção',
        description: 'Bloqueia ataques de força bruta de registro SIP, flood de INVITE e scanner sipvicious/friendly-scanner na porta 5060/UDP',
        status: 'active',
        filter: 'asterisk',
        port: '5060,5061',
        protocol: 'udp,tcp',
        currentlyFailed: 12,
        totalFailed: 184,
        currentlyBanned: 5,
        totalBanned: 142,
        maxRetry: 3,
        findTime: 600,     // 10 min
        banTime: 86400,    // 24 horas
      },
      {
        name: 'asterisk-ami-ari',
        title: 'Asterisk AMI & ARI API',
        description: 'Protege contra tentativas não autorizadas nas APIs Asterisk Manager Interface (5038) e ARI HTTP/WebSocket (8088)',
        status: 'active',
        filter: 'asterisk-ami',
        port: '5038,8088',
        protocol: 'tcp',
        currentlyFailed: 0,
        totalFailed: 8,
        currentlyBanned: 1,
        totalBanned: 19,
        maxRetry: 4,
        findTime: 300,
        banTime: 43200,    // 12 horas
      },
      {
        name: 'ssh-asterisk',
        title: 'Servidor SSH Linux',
        description: 'Mitigação de ataques de dicionário e força bruta contra acesso ao terminal e CLI do servidor Asterisk 20',
        status: 'active',
        filter: 'sshd',
        port: '22',
        protocol: 'tcp',
        currentlyFailed: 3,
        totalFailed: 92,
        currentlyBanned: 1,
        totalBanned: 64,
        maxRetry: 3,
        findTime: 600,
        banTime: 86400,
      },
      {
        name: 'nginx-sip-wss',
        title: 'WebRTC / WSS Gateway',
        description: 'Controla taxa de requisições de handshake WebSocket (WSS) e Webphone nos endpoints /ws e /api/v1',
        status: 'active',
        filter: 'nginx-limit-req',
        port: '80,443,8089',
        protocol: 'tcp',
        currentlyFailed: 0,
        totalFailed: 15,
        currentlyBanned: 0,
        totalBanned: 8,
        maxRetry: 5,
        findTime: 180,
        banTime: 7200,     // 2 horas
      },
    ],
    bannedIps: [
      {
        id: 'ban-1',
        ip: '185.196.220.14',
        jail: 'asterisk-pjsip',
        country: 'Alemanha',
        countryCode: 'DE',
        failures: 7,
        bannedAt: '2026-09-11T07:14:22Z',
        expiresAt: '2026-09-12T07:14:22Z',
        reason: 'SIPVicious scanner: Tentativa de força bruta REGISTER para ramais 100 a 105',
        reverseDns: 'scanner-node-04.hosted-sec.net',
      },
      {
        id: 'ban-2',
        ip: '194.26.29.112',
        jail: 'asterisk-pjsip',
        country: 'Rússia',
        countryCode: 'RU',
        failures: 5,
        bannedAt: '2026-09-11T08:29:40Z',
        expiresAt: '2026-09-12T08:29:40Z',
        reason: 'INVITE Flood malicioso sem autenticação para rota internacional 00+44',
        reverseDns: 'sip-attack-bot.ru',
      },
      {
        id: 'ban-3',
        ip: '45.154.255.89',
        jail: 'asterisk-pjsip',
        country: 'Holanda',
        countryCode: 'NL',
        failures: 4,
        bannedAt: '2026-09-11T08:45:11Z',
        expiresAt: '2026-09-12T08:45:11Z',
        reason: 'PJSIP 403 Forbidden repetido: Credencial incorreta para endpoint 4101',
        reverseDns: 'vpn-exit-node-nl.anonym.org',
      },
      {
        id: 'ban-4',
        ip: '91.240.118.52',
        jail: 'ssh-asterisk',
        country: 'Polônia',
        countryCode: 'PL',
        failures: 6,
        bannedAt: '2026-09-11T09:02:18Z',
        expiresAt: '2026-09-12T09:02:18Z',
        reason: 'Tentativa de login SSH com usuário root e asterisk',
        reverseDns: 'vps-91-240-pl.cloudhost.eu',
      },
      {
        id: 'ban-5',
        ip: '103.145.13.204',
        jail: 'asterisk-ami-ari',
        country: 'Vietnã',
        countryCode: 'VN',
        failures: 8,
        bannedAt: '2026-09-11T09:12:05Z',
        expiresAt: '2026-09-11T21:12:05Z',
        reason: 'ARI HTTP 401: Força bruta em /ari/channels com senha default',
        reverseDns: 'static.vnpt.vn',
      },
      {
        id: 'ban-6',
        ip: '193.32.162.77',
        jail: 'asterisk-pjsip',
        country: 'Ucrânia',
        countryCode: 'UA',
        failures: 4,
        bannedAt: '2026-09-11T09:30:19Z',
        expiresAt: '2026-09-12T09:30:19Z',
        reason: 'OPTIONS Ping de enumeração SIP sem User-Agent válido',
        reverseDns: 'probe-sip-77.colo.ua',
      },
      {
        id: 'ban-7',
        ip: '77.247.110.18',
        jail: 'asterisk-pjsip',
        country: 'Reino Unido',
        countryCode: 'GB',
        failures: 5,
        bannedAt: '2026-09-11T09:44:50Z',
        expiresAt: '2026-09-12T09:44:50Z',
        reason: 'Envio maciço de SIP CANCEL e BYE anômalos',
        reverseDns: 'relay-pool.london.net',
      },
    ],
    whitelist: [
      '127.0.0.1/8',
      '::1',
      '192.168.0.0/16',
      '10.10.0.0/24',      // Sub-rede WireGuard VPN
      '192.168.192.0/24',  // Sub-rede ZeroTier Mesh
      '200.220.14.88/32',  // IP Fixo Filial Imperatriz
      '177.136.210.0/24',  // Faixa IP Confiável Operadora Enlace
    ],
    globalRules: {
      maxRetry: 3,
      findTimeSeconds: 600,
      banTimeSeconds: 86400,
      destEmail: 'noc@enlacetentelecom.com.br',
      action: '%(action_mwl)s',
      logPathAsterisk: '/var/log/asterisk/messages',
      sipRateLimitPps: 20,
      blockUdpFlood: true,
      autoSyncIptables: true,
    },
  };
}

export const db = new Database();

