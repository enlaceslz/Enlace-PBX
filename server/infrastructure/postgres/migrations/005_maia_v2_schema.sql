-- ====================================================================
-- ENLACE-PBX ENTERPRISE - MIGRATION 005: MaIA V2 ENTERPRISE COGNITIVE SCHEMA
-- Tabelas relacionais completas para Sessões Persistentes de Voz da MaIA,
-- Turns, Execução Auditada de Ferramentas, Eventos de Sessão e RAG Grounding
-- ====================================================================

-- 1. Adaptação / Extensão da tabela de Sessões Persistentes de Voz (ai_sessions)
CREATE TABLE IF NOT EXISTS ai_sessions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) NOT NULL,
    asterisk_channel_id VARCHAR(128),
    asterisk_unique_id VARCHAR(128),
    linked_id VARCHAR(128),
    caller_number VARCHAR(32) NOT NULL DEFAULT 'Desconhecido',
    provider VARCHAR(64) NOT NULL DEFAULT 'gemini',
    model VARCHAR(64) NOT NULL DEFAULT 'gemini-flash-latest',
    routing_profile VARCHAR(32) NOT NULL DEFAULT 'BALANCEADO',
    status VARCHAR(32) NOT NULL DEFAULT 'created',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INT DEFAULT 0,
    user_turns INT DEFAULT 0,
    tool_calls INT DEFAULT 0,
    tokens_input INT DEFAULT 0,
    tokens_output INT DEFAULT 0,
    csat_score NUMERIC(3, 1),
    sentiment VARCHAR(32),
    summary TEXT,
    transfer_reason VARCHAR(255),
    transfer_destination VARCHAR(64),
    meta JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Garantir colunas se tabela ai_sessions já tiver sido criada na migration 001
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='asterisk_channel_id') THEN
        ALTER TABLE ai_sessions ADD COLUMN asterisk_channel_id VARCHAR(128);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='asterisk_unique_id') THEN
        ALTER TABLE ai_sessions ADD COLUMN asterisk_unique_id VARCHAR(128);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='linked_id') THEN
        ALTER TABLE ai_sessions ADD COLUMN linked_id VARCHAR(128);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='provider') THEN
        ALTER TABLE ai_sessions ADD COLUMN provider VARCHAR(64) NOT NULL DEFAULT 'gemini';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='model') THEN
        ALTER TABLE ai_sessions ADD COLUMN model VARCHAR(64) NOT NULL DEFAULT 'gemini-flash-latest';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='routing_profile') THEN
        ALTER TABLE ai_sessions ADD COLUMN routing_profile VARCHAR(32) NOT NULL DEFAULT 'BALANCEADO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='status') THEN
        ALTER TABLE ai_sessions ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'created';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='last_activity_at') THEN
        ALTER TABLE ai_sessions ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='tokens_input') THEN
        ALTER TABLE ai_sessions ADD COLUMN tokens_input INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='tokens_output') THEN
        ALTER TABLE ai_sessions ADD COLUMN tokens_output INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='transfer_reason') THEN
        ALTER TABLE ai_sessions ADD COLUMN transfer_reason VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='transfer_destination') THEN
        ALTER TABLE ai_sessions ADD COLUMN transfer_destination VARCHAR(64);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_sessions' AND column_name='meta') THEN
        ALTER TABLE ai_sessions ADD COLUMN meta JSONB NOT NULL DEFAULT '{}';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_sessions_tenant ON ai_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_status ON ai_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_channel ON ai_sessions(asterisk_channel_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_caller ON ai_sessions(caller_number);

-- 2. Tabela de Turnos de Voz Persistentes (ai_session_turns)
CREATE TABLE IF NOT EXISTS ai_session_turns (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    turn_number INT NOT NULL,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    audio_base64 TEXT,
    latency_ms INT DEFAULT 0,
    tokens_input INT DEFAULT 0,
    tokens_output INT DEFAULT 0,
    provider VARCHAR(64),
    model VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_session_turns_session ON ai_session_turns(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_session_turns_tenant ON ai_session_turns(tenant_id);

-- 3. Tabela de Execuções de Ferramentas Auditadas (ai_tool_executions)
CREATE TABLE IF NOT EXISTS ai_tool_executions (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) REFERENCES ai_sessions(id) ON DELETE SET NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    turn_id VARCHAR(64),
    user_id VARCHAR(64) DEFAULT 'ai-gateway',
    agent_id VARCHAR(64),
    provider VARCHAR(64) NOT NULL DEFAULT 'gemini',
    model VARCHAR(64) NOT NULL DEFAULT 'gemini-flash-latest',
    tool_id VARCHAR(64),
    tool_name VARCHAR(128) NOT NULL,
    risk VARCHAR(16) NOT NULL DEFAULT 'LOW',
    policy_decision VARCHAR(32) NOT NULL DEFAULT 'ALLOW',
    confirmation_required BOOLEAN NOT NULL DEFAULT FALSE,
    confirmation_received BOOLEAN NOT NULL DEFAULT FALSE,
    confirmation_token VARCHAR(128),
    arguments_hash VARCHAR(64) NOT NULL,
    arguments_masked JSONB NOT NULL DEFAULT '{}',
    result_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    result_data JSONB DEFAULT '{}',
    error_message TEXT,
    duration_ms INT DEFAULT 0,
    correlation_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_tool_exec_session ON ai_tool_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_exec_tenant ON ai_tool_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_exec_correlation ON ai_tool_executions(correlation_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_exec_status ON ai_tool_executions(result_status);

-- 4. Tabela de Eventos de Ciclo de Vida da Sessão (ai_session_events)
CREATE TABLE IF NOT EXISTS ai_session_events (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    from_status VARCHAR(32),
    to_status VARCHAR(32),
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_session_events_session ON ai_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_session_events_tenant ON ai_session_events(tenant_id);

-- 5. Atualização da tabela de Conhecimento RAG (ai_knowledge) com metadados obrigatórios
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_knowledge' AND column_name='source_id') THEN
        ALTER TABLE ai_knowledge ADD COLUMN source_id VARCHAR(64);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_knowledge' AND column_name='source_type') THEN
        ALTER TABLE ai_knowledge ADD COLUMN source_type VARCHAR(32) NOT NULL DEFAULT 'document';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_knowledge' AND column_name='version') THEN
        ALTER TABLE ai_knowledge ADD COLUMN version VARCHAR(32) NOT NULL DEFAULT '1.0';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_knowledge' AND column_name='classification') THEN
        ALTER TABLE ai_knowledge ADD COLUMN classification VARCHAR(32) NOT NULL DEFAULT 'OFFICIAL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_knowledge' AND column_name='expires_at') THEN
        ALTER TABLE ai_knowledge ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
