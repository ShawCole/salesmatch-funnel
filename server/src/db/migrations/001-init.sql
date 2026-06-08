-- Role hierarchy: admin > meta_partner > partner > tenant
CREATE TYPE user_role AS ENUM ('admin', 'meta_partner', 'partner', 'tenant');
CREATE TYPE platform_type AS ENUM ('meta', 'google', 'tiktok', 'linkedin', 'dsp', 'email');
CREATE TYPE funnel_stage AS ENUM (
  'impression', 'click', 'pixel_fire', 'intent_match',
  'audience_sync', 'retarget', 'micro_conversion', 'macro_conversion'
);

-- Tenant hierarchy: admin org at top, meta-partners own partners, partners own tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'tenant',
  parent_id UUID REFERENCES tenants(id),
  -- White-label config
  brand_name VARCHAR(255),
  brand_logo_url TEXT,
  brand_primary_color VARCHAR(7) DEFAULT '#a855f7',
  brand_bg_color VARCHAR(7) DEFAULT '#030712',
  custom_domain VARCHAR(255),
  -- Settings
  lookback_days INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tenants_parent ON tenants(parent_id);
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- Users belong to a tenant, inherit its role
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- Pipelines: a tenant's named funnel (e.g., "Sales Hires", "CSM Hires")
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pipelines_tenant ON pipelines(tenant_id);

-- Campaigns: linked to a pipeline, sourced from an ad platform
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  platform platform_type NOT NULL,
  platform_campaign_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  daily_budget_cents INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaigns_pipeline ON campaigns(pipeline_id);
CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_platform ON campaigns(platform, platform_campaign_id);

-- Funnel events: the core attribution data
CREATE TABLE funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  campaign_id UUID REFERENCES campaigns(id),
  pipeline_id UUID REFERENCES pipelines(id),
  stage funnel_stage NOT NULL,
  platform platform_type,
  count INT NOT NULL DEFAULT 1,
  spend_cents INT DEFAULT 0,
  event_date DATE NOT NULL,
  hour_bucket SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_funnel_events_tenant_date ON funnel_events(tenant_id, event_date DESC);
CREATE INDEX idx_funnel_events_stage ON funnel_events(tenant_id, stage, event_date DESC);
CREATE INDEX idx_funnel_events_campaign ON funnel_events(campaign_id, stage, event_date DESC);
CREATE INDEX idx_funnel_events_pipeline ON funnel_events(pipeline_id, stage, event_date DESC);

-- Widget layouts: per-user dashboard customization
CREATE TABLE widget_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  layout JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Conversion events: micro and macro conversion definitions per tenant
CREATE TABLE conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  event_key VARCHAR(100) NOT NULL,
  is_macro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversion_events_tenant ON conversion_events(tenant_id);

-- NOTE on tenant isolation:
-- Isolation is currently enforced at the APPLICATION layer via services/scoping.ts
-- (visibleTenantIds + scopeWhere), which constrains every query to the caller's
-- visible tenant subtree. We intentionally do NOT enable Postgres ROW LEVEL
-- SECURITY here: the app connects as the table owner, so RLS (without FORCE +
-- per-request `SET LOCAL app.tenant_id` + a non-owner role) would be bypassed and
-- give a false sense of DB-level isolation. True RLS (FORCE policies reading
-- current_setting('app.tenant_id') with a dedicated app role) is deferred to the
-- multi-tenant hardening pass in Plan 4.
