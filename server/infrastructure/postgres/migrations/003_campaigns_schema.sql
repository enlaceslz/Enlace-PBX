-- 003_campaigns_schema.sql
-- Tabela de Campanhas Outbound (Power Dialer / AI Voicebot)

CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'ai_voicebot',
    status VARCHAR(32) NOT NULL DEFAULT 'paused',
    ai_agent_id VARCHAR(64),
    total_leads INT DEFAULT 0,
    processed_leads INT DEFAULT 0,
    success_count INT DEFAULT 0,
    active_calls INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id ON campaigns(tenant_id);
