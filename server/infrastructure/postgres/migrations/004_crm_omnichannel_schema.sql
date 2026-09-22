-- ====================================================================
-- ENLACE-PBX ENTERPRISE - MIGRATION 004: CRM, OMNICHANNEL & BILLING TX
-- Tabelas relacionais para contatos CRM, memórias, conversas omnichannel e transações
-- ====================================================================

-- 1. Contatos do CRM (crm_contacts)
CREATE TABLE IF NOT EXISTS crm_contacts (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255),
    crm_id VARCHAR(64),
    last_interaction TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant ON crm_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_phone ON crm_contacts(phone);

-- 2. Memória Cognitiva de Clientes (customer_memories)
CREATE TABLE IF NOT EXISTS customer_memories (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id VARCHAR(64) NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    phone VARCHAR(32) NOT NULL,
    summary TEXT NOT NULL,
    preferences JSONB NOT NULL DEFAULT '[]',
    sentiment_history VARCHAR(16) NOT NULL DEFAULT 'neutral',
    churn_risk INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_memories_tenant ON customer_memories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_memories_contact ON customer_memories(contact_id);

-- 3. Conversas Omnichannel (omnichannel_conversations)
CREATE TABLE IF NOT EXISTS omnichannel_conversations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id VARCHAR(64) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(32) NOT NULL,
    company_name VARCHAR(255),
    channel VARCHAR(32) NOT NULL DEFAULT 'whatsapp',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    sentiment VARCHAR(16) NOT NULL DEFAULT 'neutral',
    tags JSONB NOT NULL DEFAULT '[]',
    messages JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_omnichannel_tenant ON omnichannel_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_status ON omnichannel_conversations(status);

-- 4. Transações de Faturamento (billing_transactions)
CREATE TABLE IF NOT EXISTS billing_transactions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date VARCHAR(32) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'recharge',
    type VARCHAR(16) NOT NULL DEFAULT 'credit',
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_tx_tenant ON billing_transactions(tenant_id);

-- 5. Faturas de Faturamento (billing_invoices)
CREATE TABLE IF NOT EXISTS billing_invoices (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reference_month VARCHAR(32) NOT NULL,
    due_date VARCHAR(32) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    pdf_url VARCHAR(512),
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant ON billing_invoices(tenant_id);

-- 6. Auditorias de Qualidade LLM-as-a-Judge (quality_audits)
CREATE TABLE IF NOT EXISTS quality_audits (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    call_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64),
    score INT NOT NULL DEFAULT 85,
    sentiment VARCHAR(16) NOT NULL DEFAULT 'positive',
    resolution_status VARCHAR(32) NOT NULL DEFAULT 'resolved',
    summary TEXT,
    feedback TEXT,
    compliance_score INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quality_audits_tenant ON quality_audits(tenant_id);
