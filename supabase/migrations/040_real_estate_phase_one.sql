-- Phase 1 real-estate foundation: broker-owned properties, leads, and follow-ups.
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  property_name TEXT NOT NULL,
  property_type TEXT NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'SALE',
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  vastu_direction TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'SOLD', 'INACTIVE')),
  bedrooms INTEGER CHECK (bedrooms IS NULL OR bedrooms >= 0),
  area NUMERIC(12, 2) CHECK (area IS NULL OR area >= 0),
  furnishing TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_properties_account_active
  ON properties(account_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_broker ON properties(broker_id);
CREATE INDEX IF NOT EXISTS idx_properties_search ON properties(account_id, city, property_type);

CREATE TABLE IF NOT EXISTS property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  public_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  broker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  customer_email TEXT,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_channel TEXT NOT NULL DEFAULT 'MANUAL',
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATION', 'CLOSED', 'LOST')),
  hotness TEXT NOT NULL DEFAULT 'WARM' CHECK (hotness IN ('COLD', 'WARM', 'HOT')),
  notes TEXT,
  selected_property_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leads_account_status ON leads(account_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_broker ON leads(broker_id);

CREATE TABLE IF NOT EXISTS lead_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  due_at TIMESTAMPTZ NOT NULL,
  note TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS properties_account_access ON properties;
CREATE POLICY properties_account_access ON properties FOR SELECT
  USING (is_account_member(account_id, 'viewer'));
DROP POLICY IF EXISTS properties_broker_insert ON properties;
CREATE POLICY properties_broker_insert ON properties FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') AND broker_id = auth.uid());
DROP POLICY IF EXISTS properties_broker_update ON properties;
CREATE POLICY properties_broker_update ON properties FOR UPDATE
  USING (is_account_member(account_id, 'agent') AND broker_id = auth.uid())
  WITH CHECK (is_account_member(account_id, 'agent') AND broker_id = auth.uid());

DROP POLICY IF EXISTS property_images_account_access ON property_images;
CREATE POLICY property_images_account_access ON property_images FOR ALL
  USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = property_images.property_id AND is_account_member(properties.account_id, 'agent')))
  WITH CHECK (EXISTS (SELECT 1 FROM properties WHERE properties.id = property_images.property_id AND is_account_member(properties.account_id, 'agent')));

DROP POLICY IF EXISTS leads_account_access ON leads;
CREATE POLICY leads_account_access ON leads FOR SELECT
  USING (is_account_member(account_id, 'viewer'));
DROP POLICY IF EXISTS leads_agent_write ON leads;
CREATE POLICY leads_agent_write ON leads FOR ALL
  USING (is_account_member(account_id, 'agent') AND (broker_id IS NULL OR broker_id = auth.uid()))
  WITH CHECK (is_account_member(account_id, 'agent') AND (broker_id IS NULL OR broker_id = auth.uid()));

DROP POLICY IF EXISTS lead_followups_account_access ON lead_followups;
CREATE POLICY lead_followups_account_access ON lead_followups FOR ALL
  USING (is_account_member(account_id, 'agent') AND broker_id = auth.uid())
  WITH CHECK (is_account_member(account_id, 'agent') AND broker_id = auth.uid());