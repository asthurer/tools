-- seed.sql
-- Initial Data Seeding

-- 1. Ensure the default organization exists
INSERT INTO organizations (id, name, admin_name, admin_email)
VALUES ('55147170-54ed-4fdd-840b-66f81cbc1883', 'Default Organization', 'System Admin', 'admin@default.com')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed initial sections
-- Note: sections table uses a composite key (name, organization_id).
-- The DEFAULT for organization_id is '55147170-54ed-4fdd-840b-66f81cbc1883'.
-- We explicitly must handle the conflict on the composite key.

INSERT INTO sections (name, organization_id) 
VALUES 
  ('SQL Basics', '55147170-54ed-4fdd-840b-66f81cbc1883'), 
  ('IQ', '55147170-54ed-4fdd-840b-66f81cbc1883'), 
  ('Behavioural', '55147170-54ed-4fdd-840b-66f81cbc1883'), 
  ('Analytical Ability', '55147170-54ed-4fdd-840b-66f81cbc1883')
ON CONFLICT (name, organization_id) DO NOTHING;
