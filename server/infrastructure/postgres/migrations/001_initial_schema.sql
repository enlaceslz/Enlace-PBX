-- ====================================================================
-- ENLACE-PBX ENTERPRISE - SCHEMA OFICIAL POSTGRESQL v20.17
-- Source of Truth para Telefonia, Telecomunicações e IA
-- ====================================================================

-- 1. Tenants (Organizações Multi-Tenant)
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(32) UNIQUE,
    plan VARCHAR(64) NOT NULL DEFAULT 'Enterprise Voice & AI Pro',
    max_extensions INT NOT NULL DEFAULT 200,
    max_trunks INT NOT NULL DEFAULT 32,
    ai_credits_usd NUMERIC(12, 4) NOT NULL DEFAULT 1000.0000,
    anti_fraud JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_cnpj ON tenants(cnpj);

-- 2. Roles
CREATE TABLE IF NOT EXISTS roles (
    name VARCHAR(32) PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Permissions
CREATE TABLE IF NOT EXISTS permissions (
    name VARCHAR(64) PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    module VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    role_name VARCHAR(32) REFERENCES roles(name) ON DELETE CASCADE,
    permission_name VARCHAR(64) REFERENCES permissions(name) ON DELETE CASCADE,
    PRIMARY KEY (role_name, permission_name)
);

-- 5. Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL REFERENCES roles(name) DEFAULT 'operator',
    extension VARCHAR(16),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 6. User Roles (Caso o usuário tenha múltiplas permissões ou papéis secundários)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    role_name VARCHAR(32) REFERENCES roles(name) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_name)
);

-- 7. Extensions (Ramais SIP / PJSIP / WebRTC)
CREATE TABLE IF NOT EXISTS extensions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    number VARCHAR(16) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sip_secret VARCHAR(255) NOT NULL,
    context VARCHAR(64) NOT NULL DEFAULT 'from-internal',
    caller_id VARCHAR(128) NOT NULL,
    cli_caller_id VARCHAR(64),
    codecs JSONB NOT NULL DEFAULT '["opus", "alaw", "ulaw"]',
    nat BOOLEAN NOT NULL DEFAULT TRUE,
    webrtc BOOLEAN NOT NULL DEFAULT TRUE,
    recording VARCHAR(32) NOT NULL DEFAULT 'always',
    voicemail BOOLEAN NOT NULL DEFAULT FALSE,
    dnd BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'offline',
    ip_address VARCHAR(64),
    allow_ai_transfer BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_extensions_tenant_number UNIQUE (tenant_id, number)
);

CREATE INDEX IF NOT EXISTS idx_extensions_tenant ON extensions(tenant_id);

-- 8. Trunks (Troncos SIP / Provedores VoIP)
CREATE TABLE IF NOT EXISTS trunks (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider_name VARCHAR(128) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL DEFAULT 5060,
    username VARCHAR(128) NOT NULL DEFAULT '',
    secret_masked VARCHAR(255) NOT NULL DEFAULT '',
    transport VARCHAR(16) NOT NULL DEFAULT 'UDP',
    caller_id VARCHAR(64) NOT NULL DEFAULT '',
    codecs JSONB NOT NULL DEFAULT '["alaw", "ulaw", "g729"]',
    context VARCHAR(64) NOT NULL DEFAULT 'from-trunk',
    register BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'unregistered',
    channels_max INT NOT NULL DEFAULT 30,
    channels_in_use INT NOT NULL DEFAULT 0,
    auth_mode VARCHAR(32) NOT NULL DEFAULT 'ip',
    authorized_ips JSONB NOT NULL DEFAULT '[]',
    inbound_context VARCHAR(64) DEFAULT 'from-trunk',
    send_pai BOOLEAN DEFAULT FALSE,
    send_rpid BOOLEAN DEFAULT FALSE,
    direct_media BOOLEAN DEFAULT FALSE,
    dtmf_mode VARCHAR(32) DEFAULT 'rfc4733',
    from_domain VARCHAR(255),
    from_user VARCHAR(128),
    qualify_frequency INT DEFAULT 60,
    outbound_proxy VARCHAR(255),
    caller_id_mode VARCHAR(32) DEFAULT 'from',
    failover_trunk_id VARCHAR(64),
    last_ping_latency_ms INT,
    last_ping_status VARCHAR(64),
    last_ping_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trunks_tenant ON trunks(tenant_id);

-- 9. Trunk Authorized IPs (Identificação IP para SBCs / TIP Brasil)
CREATE TABLE IF NOT EXISTS trunk_ips (
    id SERIAL PRIMARY KEY,
    trunk_id VARCHAR(64) NOT NULL REFERENCES trunks(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    label VARCHAR(128),
    status VARCHAR(32) DEFAULT 'active',
    last_checked TIMESTAMP WITH TIME ZONE,
    latency_ms INT,
    CONSTRAINT uq_trunk_ip UNIQUE (trunk_id, ip_address)
);

-- 10. DIDs (Números Virtuais de Entrada)
CREATE TABLE IF NOT EXISTS dids (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    did VARCHAR(32) NOT NULL,
    normalized_number VARCHAR(32) NOT NULL,
    presented_number VARCHAR(32) NOT NULL,
    operator_name VARCHAR(128) NOT NULL,
    trunk_id VARCHAR(64) NOT NULL REFERENCES trunks(id) ON DELETE RESTRICT,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    assigned_company VARCHAR(255),
    assigned_cnpj VARCHAR(32),
    assigned_user VARCHAR(128),
    monthly_fee NUMERIC(10, 2) DEFAULT 0.00,
    billing_cycle_day INT DEFAULT 10,
    destination_type VARCHAR(32) NOT NULL,
    destination_id VARCHAR(64) NOT NULL,
    destination_label VARCHAR(128),
    time_condition_enabled BOOLEAN DEFAULT FALSE,
    time_schedule JSONB,
    after_hours_dest_type VARCHAR(32),
    after_hours_dest_id VARCHAR(64),
    fallback_type VARCHAR(32),
    fallback_target VARCHAR(64),
    did_source_header VARCHAR(32) DEFAULT 'to',
    custom_header_name VARCHAR(64),
    unknown_did_action VARCHAR(32) DEFAULT 'reject_404',
    channels_in_use INT DEFAULT 0,
    total_calls_received INT DEFAULT 0,
    last_call_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dids_tenant_did UNIQUE (tenant_id, did)
);

CREATE INDEX IF NOT EXISTS idx_dids_tenant ON dids(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dids_normalized ON dids(normalized_number);

-- 11. Routes (Rotas de Saída e LCR)
CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    pattern VARCHAR(128) NOT NULL,
    trunk_id VARCHAR(64) NOT NULL REFERENCES trunks(id) ON DELETE RESTRICT,
    failover_trunk_id VARCHAR(64) REFERENCES trunks(id) ON DELETE SET NULL,
    priority INT NOT NULL DEFAULT 1,
    strip_digits INT NOT NULL DEFAULT 0,
    prepend_digits VARCHAR(32) DEFAULT '',
    caller_id_override VARCHAR(64),
    is_cli_itx BOOLEAN DEFAULT FALSE,
    extension_overrides JSONB DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_routes_tenant ON routes(tenant_id);

-- 12. Queues (Filas ACD)
CREATE TABLE IF NOT EXISTS queues (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    number VARCHAR(16) NOT NULL,
    strategy VARCHAR(32) NOT NULL DEFAULT 'ringall',
    timeout_seconds INT NOT NULL DEFAULT 30,
    wrap_up_time_seconds INT NOT NULL DEFAULT 15,
    moh_sound VARCHAR(64) NOT NULL DEFAULT 'default',
    sla_target_seconds INT NOT NULL DEFAULT 20,
    members JSONB NOT NULL DEFAULT '[]',
    calls_waiting INT DEFAULT 0,
    avg_wait_time_seconds INT DEFAULT 0,
    abandoned_today INT DEFAULT 0,
    answered_today INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_queues_tenant_number UNIQUE (tenant_id, number)
);

CREATE INDEX IF NOT EXISTS idx_queues_tenant ON queues(tenant_id);

-- 13. Ring Groups (Grupos de Chamada)
CREATE TABLE IF NOT EXISTS ring_groups (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    number VARCHAR(16) NOT NULL,
    strategy VARCHAR(32) NOT NULL DEFAULT 'ringall',
    timeout_seconds INT NOT NULL DEFAULT 25,
    extensions JSONB NOT NULL DEFAULT '[]',
    fallback_type VARCHAR(32) NOT NULL DEFAULT 'voicemail',
    fallback_target VARCHAR(64) NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ring_groups_tenant_number UNIQUE (tenant_id, number)
);

-- 14. IVRs (URAs de Atendimento)
CREATE TABLE IF NOT EXISTS ivrs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    number VARCHAR(16) NOT NULL,
    audio_prompt TEXT NOT NULL,
    timeout_seconds INT NOT NULL DEFAULT 10,
    invalid_retries INT NOT NULL DEFAULT 3,
    options JSONB NOT NULL DEFAULT '[]',
    flow JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ivrs_tenant_number UNIQUE (tenant_id, number)
);

-- 15. IVR Nodes (Nós visuais da URA para suporte a grafos complexos)
CREATE TABLE IF NOT EXISTS ivr_nodes (
    id VARCHAR(64) PRIMARY KEY,
    ivr_id VARCHAR(64) NOT NULL REFERENCES ivrs(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL,
    title VARCHAR(128) NOT NULL,
    position JSONB NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. AI Agents (Agentes de Voz MaIA / Gemini)
CREATE TABLE IF NOT EXISTS ai_agents (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    provider_id VARCHAR(64) NOT NULL DEFAULT 'gemini-official',
    model VARCHAR(64) NOT NULL DEFAULT 'gemini-flash-latest',
    voice VARCHAR(64) NOT NULL DEFAULT 'pt-BR-Wavenet-A',
    voice_gender VARCHAR(16) DEFAULT 'female',
    avatar_type VARCHAR(32) DEFAULT 'octopus_ai',
    language VARCHAR(16) NOT NULL DEFAULT 'pt-BR',
    system_instruction TEXT NOT NULL,
    initial_greeting TEXT NOT NULL,
    temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.70,
    tools JSONB NOT NULL DEFAULT '[]',
    knowledge_sources JSONB NOT NULL DEFAULT '[]',
    allow_barge_in BOOLEAN DEFAULT TRUE,
    silence_timeout_seconds INT DEFAULT 3,
    max_session_minutes INT DEFAULT 15,
    transfer_extension VARCHAR(16) DEFAULT '4101',
    fallback_action VARCHAR(32) DEFAULT 'transfer_human',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_tenant ON ai_agents(tenant_id);

-- 17. AI Tools (Ferramentas autorizadas com Policy RBAC)
CREATE TABLE IF NOT EXISTS ai_tools (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(16) NOT NULL DEFAULT 'POST',
    requires_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
    schema_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. AI Sessions (Sessões de diálogo telefônico da MaIA)
CREATE TABLE IF NOT EXISTS ai_sessions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    channel_id VARCHAR(128) NOT NULL,
    caller_number VARCHAR(32) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INT DEFAULT 0,
    user_turns INT DEFAULT 0,
    tool_calls INT DEFAULT 0,
    csat_score NUMERIC(3, 1),
    sentiment VARCHAR(32),
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. CDR (Call Detail Record - Oficial e Imutável do Asterisk)
CREATE TABLE IF NOT EXISTS cdr (
    id VARCHAR(64) PRIMARY KEY,
    uniqueid VARCHAR(128) NOT NULL UNIQUE,
    linkedid VARCHAR(128),
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    caller VARCHAR(64) NOT NULL,
    callee VARCHAR(64) NOT NULL,
    direction VARCHAR(16) NOT NULL, -- inbound, outbound, internal
    trunk VARCHAR(64),
    extension VARCHAR(16),
    queue VARCHAR(64),
    ivr VARCHAR(64),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    answer_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INT NOT NULL DEFAULT 0,
    billsec INT NOT NULL DEFAULT 0,
    disposition VARCHAR(32) NOT NULL, -- ANSWERED, NO ANSWER, BUSY, FAILED
    hangup_cause INT,
    recording_file VARCHAR(255),
    ai_agent_id VARCHAR(64) REFERENCES ai_agents(id) ON DELETE SET NULL,
    cost_brl NUMERIC(10, 4) DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cdr_tenant ON cdr(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cdr_start_time ON cdr(start_time);
CREATE INDEX IF NOT EXISTS idx_cdr_caller ON cdr(caller);
CREATE INDEX IF NOT EXISTS idx_cdr_callee ON cdr(callee);

-- 20. CEL (Channel Event Logging para rastreabilidade de chamadas do Asterisk)
CREATE TABLE IF NOT EXISTS cel (
    id SERIAL PRIMARY KEY,
    eventtype VARCHAR(32) NOT NULL,
    eventtime TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cid_name VARCHAR(80),
    cid_num VARCHAR(80),
    cid_ani VARCHAR(80),
    cid_rdnis VARCHAR(80),
    cid_dnid VARCHAR(80),
    exten VARCHAR(80),
    context VARCHAR(80),
    channame VARCHAR(80),
    appname VARCHAR(80),
    appdata VARCHAR(512),
    amaflags INT,
    accountcode VARCHAR(20),
    peeraccount VARCHAR(20),
    uniqueid VARCHAR(128) NOT NULL,
    linkedid VARCHAR(128),
    userfield VARCHAR(255),
    peer VARCHAR(80)
);

CREATE INDEX IF NOT EXISTS idx_cel_uniqueid ON cel(uniqueid);
CREATE INDEX IF NOT EXISTS idx_cel_eventtime ON cel(eventtime);

-- 21. Recordings (Gravações Oficiais de Chamadas)
CREATE TABLE IF NOT EXISTS recordings (
    id VARCHAR(64) PRIMARY KEY,
    uniqueid VARCHAR(128) NOT NULL REFERENCES cdr(uniqueid) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    file_path VARCHAR(512) NOT NULL,
    file_size_bytes BIGINT,
    format VARCHAR(16) NOT NULL DEFAULT 'wav',
    duration_seconds INT NOT NULL DEFAULT 0,
    transcript TEXT,
    sentiment VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 22. Audit Logs (Trilha de Auditoria e Conformidade LGPD)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(128) NOT NULL,
    resource VARCHAR(128) NOT NULL,
    ip VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    category VARCHAR(32) DEFAULT 'SYSTEM',
    severity VARCHAR(16) DEFAULT 'INFO',
    sha256_hash VARCHAR(64) NOT NULL,
    payload JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- 23. Billing (Faturamento, Saldos e Faturas)
CREATE TABLE IF NOT EXISTS billing (
    tenant_id VARCHAR(64) PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    plan VARCHAR(32) NOT NULL DEFAULT 'prepaid',
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(8) NOT NULL DEFAULT 'BRL',
    current_month_telephony NUMERIC(10, 2) DEFAULT 0.00,
    current_month_ai_tokens NUMERIC(10, 2) DEFAULT 0.00,
    current_month_omnichannel NUMERIC(10, 2) DEFAULT 0.00,
    current_month_licenses NUMERIC(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 24. System Settings (Parâmetros Globais de Infraestrutura)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(128) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- SEED DATA ESSENCIAL: ROLES E PERMISSIONS INICIAIS
-- ====================================================================
INSERT INTO roles (name, description) VALUES
    ('super_admin', 'Administrador Global com acesso ilimitado a todos os tenants e telecom'),
    ('admin', 'Administrador do Tenant com controle total de ramais, troncos e configurações'),
    ('supervisor', 'Supervisor de atendimento com acesso a filas, whisper, monitoramento e relatórios'),
    ('operator', 'Operador de telefonia com acesso ao webphone e gestão de contatos'),
    ('agent', 'Agente de atendimento'),
    ('readonly', 'Acesso de leitura restrita para auditoria e relatórios')
ON CONFLICT (name) DO NOTHING;
