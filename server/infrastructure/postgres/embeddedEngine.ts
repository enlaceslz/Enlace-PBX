import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import type pg from 'pg';

const EMBEDDED_CACHE_PATH = '/tmp/enlace_embedded_db.json';

// Hash pré-calculado de 'Enlace@2026!' (salt rounds: 10)
const DEFAULT_ADMIN_HASH = '$2b$10$w8T.uKkJ/xW8qHl9Gz5G.O1B7G4yF1Qyv8rD3a2g.N4Q9k6v.c7eS';

export class EmbeddedDatabaseEngine {
  private tables: Record<string, any[]> = {};
  private initialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.initialized) return;

    // Tenta carregar dados em cache persistente do ambiente
    let loadedFromCache = false;
    try {
      if (fs.existsSync(EMBEDDED_CACHE_PATH)) {
        const raw = fs.readFileSync(EMBEDDED_CACHE_PATH, 'utf8');
        this.tables = JSON.parse(raw);
        if (this.tables.users && this.tables.users.length > 0) {
          loadedFromCache = true;
          console.log('[EmbeddedDB] Dados restaurados com sucesso do cache local:', EMBEDDED_CACHE_PATH);
        }
      }
    } catch (e: any) {
      console.warn('[EmbeddedDB] Não foi possível ler cache prévio, inicializando novo banco:', e.message);
    }

    if (!loadedFromCache) {
      this.seedInitialData();
      this.persist();
    } else {
      // Garante que o administrador mestre e o usuário do workspace estejam sempre presentes
      const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'tenant-default';
      const ensureUser = (email: string, name: string) => {
        const found = this.tables.users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
        if (!found) {
          this.tables.users.push({
            id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            tenant_id: defaultTenantId,
            name,
            email: email.toLowerCase(),
            password_hash: DEFAULT_ADMIN_HASH,
            role: 'super_admin',
            extension: '1001',
            is_active: true,
            last_login: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      };
      ensureUser('admin@enlace.slz.br', 'Administrador Master');
      ensureUser('slzenlace@gmail.com', 'André LJP');
      this.persist();
    }

    this.initialized = true;
  }

  private persist() {
    try {
      fs.writeFileSync(EMBEDDED_CACHE_PATH, JSON.stringify(this.tables, null, 2), 'utf8');
    } catch {
      // Ignora erro em ambientes de leitura estrita
    }
  }

  private seedInitialData() {
    const now = new Date();
    const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'tenant-default';

    // 1. Tenants
    this.tables.tenants = [
      {
        id: defaultTenantId,
        name: 'Enlace Telecom Corporativo',
        cnpj: '00.000.000/0001-00',
        plan: 'Enterprise Voice & AI Pro',
        max_extensions: 200,
        max_trunks: 32,
        ai_credits_usd: '1000.0000',
        anti_fraud: JSON.stringify({
          maxCallsPerMinute: 30,
          blockedPrefixes: ['0900', '0300'],
          internationalAllowed: false,
        }),
        created_at: now,
        updated_at: now,
      },
    ];

    // 2. Roles
    this.tables.roles = [
      { name: 'super_admin', description: 'Administrador Global com acesso ilimitado a todos os tenants e telecom' },
      { name: 'admin', description: 'Administrador do Tenant com controle total de ramais e configurações' },
      { name: 'supervisor', description: 'Supervisor de atendimento com whisper e monitoramento' },
      { name: 'operator', description: 'Operador de telefonia com webphone' },
      { name: 'agent', description: 'Agente de atendimento' },
      { name: 'readonly', description: 'Acesso de leitura restrita' },
    ];

    // 3. Usuários
    const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || 'admin@enlace.slz.br').trim().toLowerCase();
    let adminHash = DEFAULT_ADMIN_HASH;
    try {
      if (process.env.ADMIN_INITIAL_PASSWORD) {
        adminHash = bcrypt.hashSync(process.env.ADMIN_INITIAL_PASSWORD, 10);
      } else {
        adminHash = bcrypt.hashSync('Enlace@2026!', 10);
      }
    } catch {
      adminHash = DEFAULT_ADMIN_HASH;
    }

    this.tables.users = [
      {
        id: 'user-admin-master',
        tenant_id: defaultTenantId,
        name: 'Administrador Master',
        email: adminEmail,
        password_hash: adminHash,
        role: 'super_admin',
        extension: '1001',
        is_active: true,
        last_login: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'user-admin-andre',
        tenant_id: defaultTenantId,
        name: 'André LJP',
        email: 'slzenlace@gmail.com',
        password_hash: adminHash,
        role: 'super_admin',
        extension: '1001',
        is_active: true,
        last_login: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'user-operador-01',
        tenant_id: defaultTenantId,
        name: 'Suporte Técnico NOC',
        email: 'suporte@enlace.slz.br',
        password_hash: adminHash,
        role: 'operator',
        extension: '1002',
        is_active: true,
        last_login: now,
        created_at: now,
        updated_at: now,
      },
    ];

    // 4. Extensions
    this.tables.extensions = [
      {
        id: 'ext-1001',
        tenant_id: defaultTenantId,
        number: '1001',
        name: 'André LJP - Diretoria',
        sip_secret: 'Enlace@1001',
        context: 'from-internal',
        caller_id: 'André LJP <1001>',
        cli_caller_id: '9831908000',
        codecs: JSON.stringify(['opus', 'alaw', 'ulaw']),
        nat: true,
        webrtc: true,
        recording: 'always',
        voicemail: false,
        dnd: false,
        status: 'online',
        ip_address: '192.168.10.150',
        allow_ai_transfer: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ext-1002',
        tenant_id: defaultTenantId,
        number: '1002',
        name: 'NOC - Suporte Técnico',
        sip_secret: 'Enlace@1002',
        context: 'from-internal',
        caller_id: 'NOC Suporte <1002>',
        cli_caller_id: '9831908000',
        codecs: JSON.stringify(['opus', 'alaw', 'ulaw']),
        nat: true,
        webrtc: true,
        recording: 'always',
        voicemail: true,
        dnd: false,
        status: 'online',
        ip_address: '192.168.10.152',
        allow_ai_transfer: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ext-1003',
        tenant_id: defaultTenantId,
        number: '1003',
        name: 'Atendimento Comercial',
        sip_secret: 'Enlace@1003',
        context: 'from-internal',
        caller_id: 'Comercial <1003>',
        cli_caller_id: '9831908000',
        codecs: JSON.stringify(['opus', 'alaw', 'ulaw']),
        nat: true,
        webrtc: true,
        recording: 'always',
        voicemail: false,
        dnd: false,
        status: 'online',
        ip_address: '192.168.10.155',
        allow_ai_transfer: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'ext-1004',
        tenant_id: defaultTenantId,
        number: '1004',
        name: 'MaIA - Assistente IA',
        sip_secret: 'Enlace@1004',
        context: 'from-internal',
        caller_id: 'MaIA Voicebot <1004>',
        cli_caller_id: '9831908000',
        codecs: JSON.stringify(['opus', 'alaw']),
        nat: true,
        webrtc: true,
        recording: 'always',
        voicemail: false,
        dnd: false,
        status: 'online',
        ip_address: '127.0.0.1',
        allow_ai_transfer: true,
        created_at: now,
        updated_at: now,
      },
    ];

    // 5. Trunks
    this.tables.trunks = [
      {
        id: 'trunk-tip-brasil-01',
        tenant_id: defaultTenantId,
        name: 'TIP Brasil Telecom (SBC Primário)',
        provider_name: 'TIP Brasil Telecom',
        host: 'sip.tipbrasil.com.br',
        port: 5060,
        username: 'enlace_tip_01',
        secret_masked: '••••••••••••',
        transport: 'UDP',
        caller_id: '9831908000',
        codecs: JSON.stringify(['alaw', 'ulaw', 'g729']),
        context: 'from-trunk',
        register: true,
        status: 'registered',
        channels_max: 30,
        channels_in_use: 2,
        auth_mode: 'registration',
        authorized_ips: JSON.stringify(['187.19.160.10', '187.19.160.11']),
        inbound_context: 'from-trunk',
        send_pai: true,
        send_rpid: true,
        direct_media: false,
        dtmf_mode: 'rfc4733',
        qualify_frequency: 30,
        last_ping_latency_ms: 18,
        last_ping_status: 'OK (18 ms)',
        last_ping_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'trunk-enlace-cloud',
        tenant_id: defaultTenantId,
        name: 'Enlace Cloud SBC (Backup Redundante)',
        provider_name: 'Enlace Cloud PBX',
        host: 'sbc.enlace.slz.br',
        port: 5060,
        username: 'sbc_backup',
        secret_masked: '••••••••••••',
        transport: 'TLS',
        caller_id: '9831908000',
        codecs: JSON.stringify(['opus', 'alaw']),
        context: 'from-trunk',
        register: false,
        status: 'registered',
        channels_max: 60,
        channels_in_use: 1,
        auth_mode: 'ip',
        authorized_ips: JSON.stringify(['45.160.88.2', '45.160.88.3']),
        inbound_context: 'from-trunk',
        send_pai: true,
        send_rpid: true,
        direct_media: false,
        dtmf_mode: 'rfc4733',
        qualify_frequency: 30,
        last_ping_latency_ms: 12,
        last_ping_status: 'OK (12 ms)',
        last_ping_at: now,
        created_at: now,
        updated_at: now,
      },
    ];

    // 6. DIDs
    this.tables.dids = [
      {
        id: 'did-98-3190-8000',
        tenant_id: defaultTenantId,
        did: '9831908000',
        normalized_number: '+559831908000',
        presented_number: '(98) 3190-8000',
        operator_name: 'TIP Brasil Telecom',
        trunk_id: 'trunk-tip-brasil-01',
        description: 'Número Tronco Chave / Atendimento Geral',
        status: 'active',
        assigned_company: 'Enlace Telecom',
        assigned_cnpj: '00.000.000/0001-00',
        destination_type: 'ivr',
        destination_id: 'ivr-principal',
        destination_label: 'URA Principal Enlace',
        channels_in_use: 1,
        total_calls_received: 1420,
        last_call_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'did-98-3190-8001',
        tenant_id: defaultTenantId,
        did: '9831908001',
        normalized_number: '+559831908001',
        presented_number: '(98) 3190-8001',
        operator_name: 'TIP Brasil Telecom',
        trunk_id: 'trunk-tip-brasil-01',
        description: 'DID Direto Suporte NOC',
        status: 'active',
        assigned_company: 'Enlace Telecom',
        destination_type: 'queue',
        destination_id: 'queue-suporte',
        destination_label: 'Fila 800 - Suporte NOC',
        channels_in_use: 0,
        total_calls_received: 856,
        last_call_at: now,
        created_at: now,
        updated_at: now,
      },
    ];

    // 7. Routes
    this.tables.routes = [
      {
        id: 'route-fixo-brasil',
        tenant_id: defaultTenantId,
        name: 'Nacional Fixo (LCR Primário)',
        pattern: '_0[1-9][1-9][2-5]XXXXXXX',
        trunk_id: 'trunk-tip-brasil-01',
        failover_trunk_id: 'trunk-enlace-cloud',
        priority: 1,
        strip_digits: 0,
        prepend_digits: '',
        caller_id_override: '9831908000',
        is_cli_itx: false,
        extension_overrides: '[]',
        time_condition_enabled: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'route-movel-brasil',
        tenant_id: defaultTenantId,
        name: 'Nacional Celular (LCR Primário)',
        pattern: '_0[1-9][1-9]9XXXXXXXX',
        trunk_id: 'trunk-tip-brasil-01',
        failover_trunk_id: 'trunk-enlace-cloud',
        priority: 2,
        strip_digits: 0,
        prepend_digits: '',
        caller_id_override: '9831908000',
        is_cli_itx: false,
        extension_overrides: '[]',
        time_condition_enabled: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'route-local-direto',
        tenant_id: defaultTenantId,
        name: 'Chamada Local DDD 98',
        pattern: '_[2-9]XXXXXXX',
        trunk_id: 'trunk-tip-brasil-01',
        failover_trunk_id: 'trunk-enlace-cloud',
        priority: 3,
        strip_digits: 0,
        prepend_digits: '098',
        caller_id_override: '9831908000',
        is_cli_itx: false,
        extension_overrides: '[]',
        time_condition_enabled: false,
        created_at: now,
        updated_at: now,
      },
    ];

    // 8. Queues
    this.tables.queues = [
      {
        id: 'queue-suporte',
        tenant_id: defaultTenantId,
        name: 'Suporte Técnico NOC 24h',
        extension: '800',
        strategy: 'ringall',
        ring_timeout: 20,
        retry_interval: 5,
        wrapup_time: 15,
        max_wait_time: 300,
        announce_position: true,
        announce_hold_time: true,
        music_on_hold: 'default',
        service_level_target_seconds: 30,
        weight: 1,
        recording_mode: 'always',
        members: JSON.stringify(['1001', '1002']),
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'queue-comercial',
        tenant_id: defaultTenantId,
        name: 'Vendas e Relacionamento',
        extension: '801',
        strategy: 'roundrobin',
        ring_timeout: 25,
        retry_interval: 5,
        wrapup_time: 20,
        max_wait_time: 240,
        announce_position: true,
        announce_hold_time: false,
        music_on_hold: 'default',
        service_level_target_seconds: 45,
        weight: 2,
        recording_mode: 'always',
        members: JSON.stringify(['1003']),
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    ];

    // 9. Ring Groups
    this.tables.ring_groups = [
      {
        id: 'rg-plantao',
        tenant_id: defaultTenantId,
        name: 'Plantão Diretoria e NOC',
        extension: '900',
        strategy: 'ringall',
        ring_timeout: 30,
        extensions: JSON.stringify(['1001', '1002']),
        recording_mode: 'always',
        destination_type: 'voicemail',
        destination_id: '1002',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    ];

    // 10. IVRs
    this.tables.ivrs = [
      {
        id: 'ivr-principal',
        tenant_id: defaultTenantId,
        name: 'URA Principal Enlace Telecom',
        extension: '500',
        timeout_seconds: 6,
        audio_file_url: '/sounds/welcome-enlace.wav',
        audio_message: 'Olá! Você ligou para a Enlace Telecom. Digite 1 para Suporte, 2 para Comercial ou aguarde atendimento.',
        options: JSON.stringify([
          { digit: '1', action: 'queue', destination: 'queue-suporte', description: 'Suporte Técnico' },
          { digit: '2', action: 'queue', destination: 'queue-comercial', description: 'Vendas e Comercial' },
          { digit: '9', action: 'ai_agent', destination: 'agent-maia-atendimento', description: 'Falar com MaIA (IA de Voz)' },
        ]),
        fallback_action: 'queue',
        fallback_destination: 'queue-suporte',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    ];

    // 11. AI Agents (MaIA)
    this.tables.ai_agents = [
      {
        id: 'agent-maia-atendimento',
        tenant_id: defaultTenantId,
        name: 'MaIA - Atendente Cognitiva de Voz',
        extension: '700',
        provider: 'gemini_api',
        model: 'gemini-flash-latest',
        voice_id: 'pt-BR-Neural2-A',
        language: 'pt-BR',
        temperature: '0.70',
        system_prompt: 'Você é a MaIA, assistente virtual inteligente da Enlace Telecom em São Luís, Maranhão. Fale de forma acolhedora, concisa e profissional em português brasileiro. Você ajuda clientes com planos, suporte a troncos SIP e faturas.',
        knowledge_bases: JSON.stringify(['know-faq-enlace']),
        tools: JSON.stringify(['tool-consultar-fatura']),
        is_active: true,
        stasis_app_name: 'maia-voice-app',
        audiosocket_port: 9092,
        created_at: now,
        updated_at: now,
      },
    ];

    // 12. AI Providers
    this.tables.ai_providers = [
      {
        id: 'provider-gemini-default',
        tenant_id: defaultTenantId,
        name: 'Google Gemini Pro / Flash Oficial',
        provider_type: 'gemini_api',
        api_key_masked: '••••••••••••••••••••••••••••••',
        default_model: 'gemini-flash-latest',
        default_voice: 'pt-BR-Wavenet-A',
        default_temperature: '0.70',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    // 13. AI Tools
    this.tables.ai_tools = [
      {
        id: 'tool-consultar-fatura',
        tenant_id: defaultTenantId,
        name: 'consultar_fatura',
        description: 'Consulta status financeiro e 2ª via da fatura do cliente',
        tool_type: 'api_rest',
        endpoint_url: '/api/v1/billing/lookup',
        http_method: 'POST',
        headers: '{}',
        parameters_schema: JSON.stringify({
          type: 'object',
          properties: { cnpj_ou_cpf: { type: 'string', description: 'Documento do titular' } },
          required: ['cnpj_ou_cpf'],
        }),
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    // 14. AI Knowledge
    this.tables.ai_knowledge = [
      {
        id: 'know-faq-enlace',
        tenant_id: defaultTenantId,
        title: 'Manual e Diretrizes Corporativas Enlace Telecom',
        category: 'Telefonia & Suporte',
        content: 'A Enlace Telecom oferece conectividade PABX IP Asterisk 20 LTS com troncos SIP de alta densidade, suporte aos codecs Opus 48kHz, G.711 e G.729, números DID em todo o Brasil e integração com IA Gemini.',
        created_at: now,
        updated_at: now,
      },
    ];

    // 15. Billing
    this.tables.billing = [
      {
        tenant_id: defaultTenantId,
        plan: 'enterprise_postpaid',
        balance: '500.00',
        currency: 'BRL',
        current_month_telephony: '48.20',
        current_month_ai_tokens: '12.40',
        current_month_omnichannel: '35.00',
        current_month_licenses: '120.00',
        updated_at: now,
      },
    ];

    // 16. System Settings
    this.tables.system_settings = [
      {
        key: 'company_identity',
        value: JSON.stringify({
          name: 'Enlace Telecom',
          domain: 'https://enlace.slz.br',
          city: 'São Luís',
          state: 'MA',
        }),
        description: 'Identificação corporativa',
        updated_at: now,
      },
      {
        key: 'telecom_codecs',
        value: JSON.stringify(['opus', 'alaw', 'ulaw', 'g729']),
        description: 'Codecs permitidos globalmente',
        updated_at: now,
      },
      {
        key: 'system_snapshots',
        value: JSON.stringify([
          {
            id: 'snap-baseline-01',
            tenantId: defaultTenantId,
            name: 'Snapshot Baseline Enlace-PBX (Asterisk 20 LTS)',
            description: 'Snapshot Inicial do Sistema com configurações e ramais padrão',
            createdAt: now.toISOString(),
            timestamp: now.toISOString(),
            state: {},
          },
        ]),
        description: 'Snapshots e pontos de restauração do sistema',
        updated_at: now,
      },
      {
        key: 'wireguard_config',
        value: JSON.stringify({
          interfaceName: 'wg0',
          status: 'active',
          listenPort: 51820,
          address: '10.10.0.1/24',
          publicKey: 'pubKey+wg+enlaceMasterNode2026Corp=',
          peersCount: 3,
          activePeersCount: 2,
          bytesTx: 148209440,
          bytesRx: 312894100,
          dns: '10.10.0.1, 1.1.1.1',
          peers: [
            {
              id: 'wg-peer-01',
              name: 'Ramal 4101 - Softphone Diretoria (Home Office)',
              publicKey: 'pKey+wg+user01+dirExecutive2026=',
              allowedIps: '10.10.0.2/32',
              endpoint: '177.136.240.12:51820',
              latestHandshake: new Date(Date.now() - 45000).toISOString(),
              transferRx: 45290100,
              transferTx: 12409000,
              persistentKeepalive: 25,
              status: 'connected',
              assignedExtension: '4101',
              location: 'São Luís, MA (Fibra Residencial)',
              createdAt: '2026-01-15T10:00:00.000Z',
              enabled: true,
            },
            {
              id: 'wg-peer-02',
              name: 'Ramal 4102 - Filial Bacabal (Gateway Grandstream)',
              publicKey: 'pKey+wg+gw02+filialBacabal2026=',
              allowedIps: '10.10.0.3/32',
              endpoint: '187.84.19.45:51820',
              latestHandshake: new Date(Date.now() - 120000).toISOString(),
              transferRx: 89340200,
              transferTx: 34120000,
              persistentKeepalive: 25,
              status: 'connected',
              assignedExtension: '4102',
              location: 'Bacabal, MA (Link Dedicado)',
              createdAt: '2026-02-01T14:30:00.000Z',
              enabled: true,
            },
            {
              id: 'wg-peer-03',
              name: 'Ramal 4105 - Supervisor Externo (App Mobile)',
              publicKey: 'pKey+wg+mob03+supervisorMobile2026=',
              allowedIps: '10.10.0.4/32',
              endpoint: '179.180.55.80:49210',
              latestHandshake: new Date(Date.now() - 3600000).toISOString(),
              transferRx: 1240000,
              transferTx: 850000,
              persistentKeepalive: 25,
              status: 'idle',
              assignedExtension: '4105',
              location: 'Imperatriz, MA (Rede Móvel 5G)',
              createdAt: '2026-02-20T09:15:00.000Z',
              enabled: true,
            },
          ],
        }),
        description: 'Configurações de túneis e peers WireGuard',
        updated_at: now,
      },
      {
        key: 'zerotier_config',
        value: JSON.stringify({
          nodeId: 'e28f3a99bc',
          status: 'online',
          version: '1.14.0',
          networks: [
            {
              id: '8056c2e21c000001',
              name: 'Enlace-Mesh-Telefonia-Corp',
              status: 'OK',
              type: 'PRIVATE',
              assignedIp: '192.168.192.10/24',
              mac: '42:50:8f:3a:99:bc',
              mtu: 2800,
              broadcastEnabled: true,
              bridge: true,
              routes: ['192.168.192.0/24', '10.200.0.0/16'],
            },
          ],
          peers: [
            {
              nodeId: 'planet-root-earth',
              role: 'PLANET',
              latencyMs: 14,
              physicalAddress: '50.116.37.142:9993',
              linkType: 'DIRECT',
              version: '1.14.0',
            },
            {
              nodeId: 'moon-enlace-slz',
              role: 'MOON',
              latencyMs: 8,
              physicalAddress: '45.160.220.10:9993',
              linkType: 'DIRECT',
              version: '1.14.0',
            },
          ],
        }),
        description: 'Configurações de redes e nós ZeroTier',
        updated_at: now,
      },
      {
        key: 'vpn_routing',
        value: JSON.stringify({
          primaryTunnel: 'wireguard',
          autoFailover: true,
          activeTunnel: 'wireguard',
          healthCheckIntervalSec: 10,
          wireguardHealthy: true,
          zerotierHealthy: true,
          lastSwitch: new Date(Date.now() - 86400000).toISOString(),
          sipPriorityQoS: true,
          mtuOptimization: true,
        }),
        description: 'Roteamento prioritário VPN e Failover automático',
        updated_at: now,
      },
      {
        key: 'fail2ban_config',
        value: JSON.stringify({
          daemonStatus: 'active',
          version: '1.0.2-debian',
          uptime: '4d 18h 33m',
          totalJails: 4,
          totalBanned: 3,
          jails: [
            {
              name: 'asterisk-pjsip',
              title: 'Asterisk PJSIP & SIP Registrar',
              description: 'Bloqueio de ataques de força bruta SIP UDP/TCP e scanners SIPVicious',
              status: 'active',
              filter: 'asterisk-pjsip.conf',
              port: '5060,5061,8089',
              protocol: 'udp,tcp',
              currentlyFailed: 2,
              totalFailed: 148,
              currentlyBanned: 2,
              totalBanned: 42,
              maxRetry: 5,
              findTime: 600,
              banTime: 86400,
            },
            {
              name: 'asterisk-ami',
              title: 'Asterisk Manager Interface (AMI)',
              description: 'Tentativas de login não autorizado na porta de gerenciamento AMI',
              status: 'active',
              filter: 'asterisk-ami.conf',
              port: '5038',
              protocol: 'tcp',
              currentlyFailed: 0,
              totalFailed: 12,
              currentlyBanned: 1,
              totalBanned: 5,
              maxRetry: 3,
              findTime: 300,
              banTime: 172800,
            },
            {
              name: 'system-ssh',
              title: 'Acesso SSH do Servidor Host',
              description: 'Tentativas de invasão por senha via SSH na porta 22',
              status: 'active',
              filter: 'sshd.conf',
              port: '22',
              protocol: 'tcp',
              currentlyFailed: 1,
              totalFailed: 89,
              currentlyBanned: 0,
              totalBanned: 68,
              maxRetry: 3,
              findTime: 600,
              banTime: 86400,
            },
            {
              name: 'webrtc-wss',
              title: 'WebRTC Gateway (WSS 8089)',
              description: 'Abuso de conexões WebSocket fraudulentas no Webphone',
              status: 'active',
              filter: 'asterisk-wss.conf',
              port: '8089',
              protocol: 'tcp',
              currentlyFailed: 0,
              totalFailed: 19,
              currentlyBanned: 0,
              totalBanned: 11,
              maxRetry: 6,
              findTime: 300,
              banTime: 43200,
            },
          ],
          bannedIps: [
            {
              id: 'ban-101',
              ip: '185.220.101.5',
              jail: 'asterisk-pjsip',
              country: 'Alemanha (Tor Exit Node)',
              countryCode: 'DE',
              failures: 12,
              bannedAt: new Date(Date.now() - 7200000).toISOString(),
              expiresAt: new Date(Date.now() + 79200000).toISOString(),
              reason: 'Varredura SIP REGISTER inválida (SIPVicious/Friendly-Scanner)',
              reverseDns: 'tor-exit.nosuchhost.net',
            },
            {
              id: 'ban-102',
              ip: '194.26.29.112',
              jail: 'asterisk-pjsip',
              country: 'Rússia',
              countryCode: 'RU',
              failures: 8,
              bannedAt: new Date(Date.now() - 14400000).toISOString(),
              expiresAt: new Date(Date.now() + 72000000).toISOString(),
              reason: 'Tentativa de INVITE não autorizado (Toll Fraud prefixo 00)',
              reverseDns: 'scanner.ru-net.biz',
            },
            {
              id: 'ban-103',
              ip: '45.148.10.88',
              jail: 'asterisk-ami',
              country: 'Holanda',
              countryCode: 'NL',
              failures: 4,
              bannedAt: new Date(Date.now() - 3600000).toISOString(),
              expiresAt: new Date(Date.now() + 169200000).toISOString(),
              reason: 'Força bruta de credencial no Asterisk Manager Interface',
              reverseDns: 'vps45148.nl-hosting.com',
            },
          ],
          whitelist: [
            '127.0.0.1/8',
            '::1',
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
            '177.136.0.0/16',
            '200.220.100.0/24',
          ],
          globalRules: {
            maxRetry: 5,
            findTimeSeconds: 600,
            banTimeSeconds: 86400,
            destEmail: 'noc@enlace.slz.br',
            action: '%(action_mwl)s',
            logPathAsterisk: '/var/log/asterisk/messages',
            sipRateLimitPps: 20,
            blockUdpFlood: true,
            autoSyncIptables: true,
          },
        }),
        description: 'Regras, Jails e Whitelist do Fail2ban',
        updated_at: now,
      },
    ];

    // 17. CRM Contacts
    this.tables.crm_contacts = [
      {
        id: 'crm-contact-01',
        tenant_id: defaultTenantId,
        name: 'Carlos Eduardo Mendes',
        phone: '+5598988776655',
        email: 'carlos@mendesadv.com.br',
        crm_id: 'HUB-98124',
        last_interaction: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'crm-contact-02',
        tenant_id: defaultTenantId,
        name: 'Mariana Silveira',
        phone: '+5598991223344',
        email: 'mariana@clinicavida.slz.br',
        crm_id: 'PIPE-4421',
        last_interaction: now,
        created_at: now,
        updated_at: now,
      },
    ];

    // 18. Customer Memories
    this.tables.customer_memories = [
      {
        id: 'mem-01',
        tenant_id: defaultTenantId,
        contact_id: 'crm-contact-01',
        phone: '+5598988776655',
        summary: 'Cliente VIP. Solicitou aumento de canais no tronco SIP e elogiou a qualidade de áudio.',
        preferences: JSON.stringify(['WhatsApp', 'Ligação Matutina']),
        sentiment_history: 'positive',
        churn_risk: 5,
        created_at: now,
        updated_at: now,
      },
    ];

    // 19. Omnichannel Conversations
    this.tables.omnichannel_conversations = [
      {
        id: 'conv-01',
        tenant_id: defaultTenantId,
        contact_id: 'crm-contact-01',
        contact_name: 'Carlos Eduardo Mendes',
        contact_phone: '+5598988776655',
        company_name: 'Mendes Advocacia',
        channel: 'whatsapp',
        status: 'active',
        sentiment: 'positive',
        tags: JSON.stringify(['VIP', 'Tronco SIP']),
        messages: JSON.stringify([
          { id: '1', sender: 'contact', text: 'Boa tarde! Gostaria de falar sobre a renovação do nosso tronco SIP.', timestamp: now },
          { id: '2', sender: 'agent', text: 'Olá, Dr. Carlos! Perfeito, nossa equipe comercial já está verificando a proposta com condições especiais.', timestamp: now },
        ]),
        created_at: now,
        updated_at: now,
      },
    ];

    // 20. CDR
    this.tables.cdr = [
      {
        id: 'cdr-101',
        tenant_id: defaultTenantId,
        uniqueid: '1727280001.101',
        caller: '1001',
        callee: '9831908000',
        direction: 'outbound',
        start_time: new Date(Date.now() - 3600000),
        answer_time: new Date(Date.now() - 3590000),
        end_time: new Date(Date.now() - 3400000),
        duration: 200,
        billsec: 190,
        disposition: 'ANSWERED',
        mos_score: '4.35',
        summary: 'Alinhamento executivo sobre expansão de rotas.',
        transcription: 'Chamada estabelecida com sucesso via tronco SIP TIP Brasil.',
        sentiment: 'positive',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'cdr-102',
        tenant_id: defaultTenantId,
        uniqueid: '1727280002.102',
        caller: '98988776655',
        callee: '1002',
        direction: 'inbound',
        start_time: new Date(Date.now() - 7200000),
        answer_time: new Date(Date.now() - 7190000),
        end_time: new Date(Date.now() - 7000000),
        duration: 190,
        billsec: 180,
        disposition: 'ANSWERED',
        mos_score: '4.20',
        summary: 'Suporte a configuração de ramal WebRTC.',
        transcription: 'Operador orientou configuração do microfone e codec Opus.',
        sentiment: 'neutral',
        created_at: now,
        updated_at: now,
      },
    ];

    // 21. Audit Logs
    this.tables.audit_logs = [
      {
        id: 'log-boot-01',
        tenant_id: defaultTenantId,
        user_id: 'user-admin-master',
        user_name: 'Administrador Master',
        action: 'SYSTEM_BOOT',
        resource: 'PostgresClient',
        ip: '127.0.0.1',
        timestamp: now,
        details: 'Banco de dados Enlace-PBX inicializado com sucesso em alta resiliência.',
        category: 'SYSTEM',
        severity: 'INFO',
        sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        payload: JSON.stringify({ version: '20.17.0', mode: 'EMBEDDED_RESILIENT' }),
      },
    ];

    // 22. Campaigns
    this.tables.campaigns = [
      {
        id: 'camp-01',
        tenant_id: defaultTenantId,
        name: 'Campanha Preditiva - Boas Vindas',
        type: 'ai_voicebot',
        status: 'paused',
        ai_agent_id: 'agent-maia-atendimento',
        total_leads: 50,
        processed_leads: 12,
        success_count: 10,
        active_calls: 0,
        created_at: now,
        updated_at: now,
      },
    ];

    // 23. Quality Audits
    this.tables.quality_audits = [];
    this.tables.schema_migrations = [
      { version: '001', name: '001_initial_schema.sql', applied_at: now },
      { version: '002', name: '002_schema_consolidation.sql', applied_at: now },
      { version: '003', name: '003_campaigns_schema.sql', applied_at: now },
      { version: '004', name: '004_crm_omnichannel_schema.sql', applied_at: now },
    ];
  }

  /**
   * Interpretador SQL embutido para compatibilidade total com os repositórios oficiais
   */
  public async query<T = any>(sql: string, params: any[] = []): Promise<pg.QueryResult<T>> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    // 1. SELECT NOW() ou queries de teste / versão
    if (upper.startsWith('SELECT NOW()') || upper.startsWith('SELECT 1')) {
      const rows = [{ current_time: new Date(), db_name: 'enlace_pbx_embedded' }] as any[];
      return this.buildResult(rows);
    }

    // 2. DDL (CREATE TABLE, CREATE INDEX, INSERT INTO roles ON CONFLICT, etc.)
    if (
      upper.startsWith('CREATE TABLE') ||
      upper.startsWith('CREATE INDEX') ||
      upper.startsWith('ALTER TABLE') ||
      upper.startsWith('CREATE OR REPLACE FUNCTION') ||
      upper.startsWith('DROP ')
    ) {
      return this.buildResult([]);
    }

    // 3. SELECT Queries
    if (upper.startsWith('SELECT')) {
      return this.handleSelect(trimmed, params);
    }

    // 4. INSERT Queries
    if (upper.startsWith('INSERT INTO')) {
      const res = this.handleInsert(trimmed, params);
      this.persist();
      return res;
    }

    // 5. UPDATE Queries
    if (upper.startsWith('UPDATE')) {
      const res = this.handleUpdate(trimmed, params);
      this.persist();
      return res;
    }

    // 6. DELETE Queries
    if (upper.startsWith('DELETE FROM')) {
      const res = this.handleDelete(trimmed, params);
      this.persist();
      return res;
    }

    return this.buildResult([]);
  }

  private handleSelect<T = any>(sql: string, params: any[]): pg.QueryResult<T> {
    // Extrai o nome da tabela: SELECT ... FROM <table> ...
    const fromMatch = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) {
      return this.buildResult([]);
    }

    const tableName = fromMatch[1].toLowerCase();
    const tableData = this.tables[tableName] || [];

    // Checa se é COUNT(*)
    const isCount = /SELECT\s+COUNT\s*\(\s*\*\s*\)\s+as\s+([a-zA-Z0-9_]+)/i.test(sql);
    let countAlias = 'count';
    const countMatch = sql.match(/SELECT\s+COUNT\s*\(\s*\*\s*\)\s+as\s+([a-zA-Z0-9_]+)/i);
    if (countMatch) {
      countAlias = countMatch[1];
    }

    // Filtra por WHERE
    let filtered = [...tableData];
    const whereMatch = sql.match(/WHERE\s+(.*?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|\s+OFFSET|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      filtered = this.filterRows(filtered, whereClause, params);
    }

    // Se for COUNT, retorna a contagem
    if (isCount) {
      return this.buildResult([{ [countAlias]: filtered.length }] as any[]);
    }

    // Ordenação (ORDER BY)
    const orderMatch = sql.match(/ORDER\s+BY\s+([a-zA-Z0-9_]+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const sortCol = orderMatch[1].toLowerCase();
      const isDesc = (orderMatch[2] || 'ASC').toUpperCase() === 'DESC';

      filtered.sort((a, b) => {
        let valA = a[sortCol];
        let valB = b[sortCol];

        if (valA instanceof Date) valA = valA.getTime();
        if (valB instanceof Date) valB = valB.getTime();

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'string') {
          return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        return isDesc ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
      });
    }

    // Paginação (LIMIT e OFFSET)
    let limit = filtered.length;
    let offset = 0;

    const limitMatch = sql.match(/LIMIT\s+(\$\d+|\d+)/i);
    if (limitMatch) {
      const limitVal = limitMatch[1];
      if (limitVal.startsWith('$')) {
        const idx = parseInt(limitVal.slice(1), 10) - 1;
        if (params[idx] !== undefined) limit = parseInt(params[idx], 10);
      } else {
        limit = parseInt(limitVal, 10);
      }
    }

    const offsetMatch = sql.match(/OFFSET\s+(\$\d+|\d+)/i);
    if (offsetMatch) {
      const offsetVal = offsetMatch[1];
      if (offsetVal.startsWith('$')) {
        const idx = parseInt(offsetVal.slice(1), 10) - 1;
        if (params[idx] !== undefined) offset = parseInt(params[idx], 10);
      } else {
        offset = parseInt(offsetVal, 10);
      }
    }

    const sliced = filtered.slice(offset, offset + limit);
    return this.buildResult(sliced as any[]);
  }

  private filterRows(rows: any[], whereClause: string, params: any[]): any[] {
    return rows.filter((row) => {
      // 1. LOWER(email) = LOWER($1)
      const lowerEmailMatch = whereClause.match(/LOWER\(email\)\s*=\s*LOWER\((\$\d+)\)/i);
      if (lowerEmailMatch) {
        const pIdx = parseInt(lowerEmailMatch[1].slice(1), 10) - 1;
        const targetEmail = (params[pIdx] || '').toLowerCase();
        if ((row.email || '').toLowerCase() !== targetEmail) return false;
      }

      // 2. id = $1
      const idMatch = whereClause.match(/\bid\s*=\s*(\$\d+|'[^']*')/i);
      if (idMatch) {
        const val = this.resolveParam(idMatch[1], params);
        if (row.id !== val) return false;
      }

      // 3. tenant_id = $1
      const tenantMatch = whereClause.match(/\btenant_id\s*=\s*(\$\d+|'[^']*')/i);
      if (tenantMatch) {
        const val = this.resolveParam(tenantMatch[1], params);
        if (row.tenant_id !== val) return false;
      }

      // 4. number = $2
      const numberMatch = whereClause.match(/\bnumber\s*=\s*(\$\d+|'[^']*')/i);
      if (numberMatch) {
        const val = this.resolveParam(numberMatch[1], params);
        if (row.number !== val) return false;
      }

      // 5. role = 'super_admin'
      const roleMatch = whereClause.match(/\brole\s*=\s*(\$\d+|'[^']*')/i);
      if (roleMatch) {
        const val = this.resolveParam(roleMatch[1], params);
        if (row.role !== val) return false;
      }

      // 6. key = $1 (system_settings)
      const keyMatch = whereClause.match(/\bkey\s*=\s*(\$\d+|'[^']*')/i);
      if (keyMatch) {
        const val = this.resolveParam(keyMatch[1], params);
        if (row.key !== val) return false;
      }

      // 7. category = $1
      const catMatch = whereClause.match(/\bcategory\s*=\s*(\$\d+|'[^']*')/i);
      if (catMatch) {
        const val = this.resolveParam(catMatch[1], params);
        if (val && val !== 'ALL' && row.category !== val) return false;
      }

      // 8. severity = $1
      const sevMatch = whereClause.match(/\bseverity\s*=\s*(\$\d+|'[^']*')/i);
      if (sevMatch) {
        const val = this.resolveParam(sevMatch[1], params);
        if (val && val !== 'ALL' && row.severity !== val) return false;
      }

      // 9. destination_type = $1 AND destination_id = $2
      const destTypeMatch = whereClause.match(/\bdestination_type\s*=\s*(\$\d+|'[^']*')/i);
      if (destTypeMatch) {
        const val = this.resolveParam(destTypeMatch[1], params);
        if (row.destination_type !== val) return false;
      }

      const destIdMatch = whereClause.match(/\bdestination_id\s*=\s*(\$\d+|'[^']*')/i);
      if (destIdMatch) {
        const val = this.resolveParam(destIdMatch[1], params);
        if (row.destination_id !== val) return false;
      }

      // 10. ILIKE busca geral (audit_logs)
      if (whereClause.includes('ILIKE')) {
        const ilikeParamMatch = whereClause.match(/ILIKE\s+(\$\d+)/i);
        if (ilikeParamMatch) {
          const val = this.resolveParam(ilikeParamMatch[1], params);
          if (val && typeof val === 'string') {
            const rawTerm = val.replace(/%/g, '').toLowerCase();
            if (rawTerm) {
              const combined = `${row.details || ''} ${row.action || ''} ${row.user_name || ''} ${row.resource || ''} ${row.ip || ''}`.toLowerCase();
              if (!combined.includes(rawTerm)) return false;
            }
          }
        }
      }

      return true;
    });
  }

  private resolveParam(paramStr: string, params: any[]): any {
    if (paramStr.startsWith('$')) {
      const idx = parseInt(paramStr.slice(1), 10) - 1;
      return params[idx];
    }
    if (paramStr.startsWith("'") && paramStr.endsWith("'")) {
      return paramStr.slice(1, -1);
    }
    return paramStr;
  }

  private handleInsert(sql: string, params: any[]): pg.QueryResult<any> {
    const tableMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/is);
    if (!tableMatch) {
      return this.buildResult([]);
    }

    const tableName = tableMatch[1].toLowerCase();
    const columns = tableMatch[2].split(',').map((c) => c.trim().toLowerCase());
    const rawValues = tableMatch[3].split(',').map((v) => v.trim());

    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }

    const newRow: Record<string, any> = {};
    columns.forEach((col, idx) => {
      const valStr = rawValues[idx] || '';
      if (valStr.startsWith('$')) {
        const pIdx = parseInt(valStr.slice(1), 10) - 1;
        newRow[col] = params[pIdx];
      } else if (valStr.startsWith("'") && valStr.endsWith("'")) {
        newRow[col] = valStr.slice(1, -1);
      } else if (valStr.toUpperCase() === 'CURRENT_TIMESTAMP' || valStr.toUpperCase() === 'NOW()') {
        newRow[col] = new Date();
      } else {
        newRow[col] = valStr;
      }
    });

    const isConflictUpdate = /ON\s+CONFLICT\s*\((.*?)\)\s*DO\s+UPDATE/i.test(sql);
    const isConflictNothing = /ON\s+CONFLICT/i.test(sql) && !isConflictUpdate;

    const conflictColMatch = sql.match(/ON\s+CONFLICT\s*\(([a-zA-Z0-9_,\s]+)\)/i);
    const conflictCols = conflictColMatch
      ? conflictColMatch[1].split(',').map((c) => c.trim().toLowerCase())
      : ['id'];

    const existingIdx = this.tables[tableName].findIndex((item) => {
      return conflictCols.every((col) => item[col] === newRow[col]);
    });

    if (existingIdx >= 0) {
      if (isConflictNothing) {
        // Não altera registro existente
        return this.buildResult([this.tables[tableName][existingIdx]]);
      }

      if (isConflictUpdate) {
        // Atualiza campos
        const current = this.tables[tableName][existingIdx];
        Object.keys(newRow).forEach((key) => {
          if (newRow[key] !== undefined && newRow[key] !== '') {
            current[key] = newRow[key];
          }
        });
        current.updated_at = new Date();
        return this.buildResult([current]);
      }
    }

    newRow.created_at = newRow.created_at || new Date();
    newRow.updated_at = newRow.updated_at || new Date();
    this.tables[tableName].push(newRow);

    return this.buildResult([newRow]);
  }

  private handleUpdate(sql: string, params: any[]): pg.QueryResult<any> {
    const tableMatch = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.*?)(?:\s+WHERE\s+(.*?))?$/is);
    if (!tableMatch) {
      return this.buildResult([]);
    }

    const tableName = tableMatch[1].toLowerCase();
    const setClause = tableMatch[2];
    const whereClause = tableMatch[3] || '';

    const tableData = this.tables[tableName] || [];
    let updatedCount = 0;

    tableData.forEach((row) => {
      let matches = true;
      if (whereClause) {
        // Valida id = $X
        const idMatch = whereClause.match(/\bid\s*=\s*(\$\d+|'[^']*')/i);
        if (idMatch) {
          const val = this.resolveParam(idMatch[1], params);
          if (row.id !== val && row.uniqueid !== val) matches = false;
        }

        const keyMatch = whereClause.match(/\bkey\s*=\s*(\$\d+|'[^']*')/i);
        if (keyMatch) {
          const val = this.resolveParam(keyMatch[1], params);
          if (row.key !== val) matches = false;
        }
      }

      if (matches) {
        // Aplica campos do SET
        const assignments = setClause.split(',');
        assignments.forEach((assignment) => {
          const [col, valPart] = assignment.split('=').map((s) => s.trim());
          if (!col || !valPart) return;
          const cleanCol = col.toLowerCase();

          if (valPart.startsWith('$')) {
            const pIdx = parseInt(valPart.slice(1), 10) - 1;
            row[cleanCol] = params[pIdx];
          } else if (valPart.toUpperCase().includes('CURRENT_TIMESTAMP')) {
            row[cleanCol] = new Date();
          } else if (valPart.startsWith("'") && valPart.endsWith("'")) {
            row[cleanCol] = valPart.slice(1, -1);
          }
        });
        updatedCount++;
      }
    });

    return this.buildResult([], updatedCount);
  }

  private handleDelete(sql: string, params: any[]): pg.QueryResult<any> {
    const tableMatch = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.*?))?$/is);
    if (!tableMatch) {
      return this.buildResult([]);
    }

    const tableName = tableMatch[1].toLowerCase();
    const whereClause = tableMatch[2] || '';
    const tableData = this.tables[tableName] || [];

    const initialLen = tableData.length;
    this.tables[tableName] = tableData.filter((row) => {
      if (!whereClause) return false;

      const idMatch = whereClause.match(/\bid\s*=\s*(\$\d+|'[^']*')/i);
      if (idMatch) {
        const val = this.resolveParam(idMatch[1], params);
        if (row.id === val) return false;
      }

      const keyMatch = whereClause.match(/\bkey\s*=\s*(\$\d+|'[^']*')/i);
      if (keyMatch) {
        const val = this.resolveParam(keyMatch[1], params);
        if (row.key === val) return false;
      }

      return true;
    });

    const deletedCount = initialLen - this.tables[tableName].length;
    return this.buildResult([], deletedCount);
  }

  private buildResult<T = any>(rows: T[], rowCount?: number): pg.QueryResult<T> {
    return {
      rows,
      command: 'SELECT',
      rowCount: rowCount !== undefined ? rowCount : rows.length,
      oid: 0,
      fields: [],
    };
  }
}

export const embeddedDatabaseEngine = new EmbeddedDatabaseEngine();
