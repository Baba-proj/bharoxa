-- Add property interest tracking and a safe image bucket for broker listings.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATION', 'INTERESTED', 'CLOSED', 'LOST'));

ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lead_followups_due ON lead_followups(account_id, due_at) WHERE completed_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_followups_lead_property
  ON lead_followups(lead_id, property_id) WHERE property_id IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Property images are publicly readable" ON storage.objects;
CREATE POLICY "Property images are publicly readable" ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');
DROP POLICY IF EXISTS "Members can upload property images" ON storage.objects;
CREATE POLICY "Members can upload property images" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id::text = (storage.foldername(name))[1]
        AND properties.broker_id = auth.uid()
        AND is_account_member(properties.account_id, 'agent')
    )
  );
DROP POLICY IF EXISTS "Members can update property images" ON storage.objects;
CREATE POLICY "Members can update property images" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-images'
    AND EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id::text = (storage.foldername(name))[1]
        AND properties.broker_id = auth.uid()
        AND is_account_member(properties.account_id, 'agent')
    )
  );
DROP POLICY IF EXISTS "Members can delete property images" ON storage.objects;
CREATE POLICY "Members can delete property images" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images'
    AND EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id::text = (storage.foldername(name))[1]
        AND properties.broker_id = auth.uid()
        AND is_account_member(properties.account_id, 'agent')
    )
  );