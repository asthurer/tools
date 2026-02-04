-- update.sql
-- Migration scripts for updating existing databases to the new schema

-- 1. Default Organization ID for legacy data
-- Ensure the default organization exists (Idempotent)
INSERT INTO organizations (id, name, admin_name, admin_email)
VALUES ('55147170-54ed-4fdd-840b-66f81cbc1883', 'Default Organization', 'System Admin', 'admin@default.com')
ON CONFLICT (id) DO NOTHING;

-- 2. SECTIONS: Add organization_id and update PK
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sections' AND column_name = 'organization_id') THEN
        ALTER TABLE sections ADD COLUMN organization_id TEXT REFERENCES organizations(id);
        UPDATE sections SET organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883' WHERE organization_id IS NULL;
        ALTER TABLE sections DROP CONSTRAINT sections_pkey CASCADE;
        ALTER TABLE sections ADD PRIMARY KEY (name, organization_id);
    END IF;
END $$;

-- 3. QUESTIONS: Add organization_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'organization_id') THEN
        ALTER TABLE questions ADD COLUMN organization_id TEXT REFERENCES organizations(id);
        UPDATE questions SET organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883' WHERE organization_id IS NULL;
        -- Note: Existing foreign keys to sections might be broken or need update if strict referential integrity is enforced 
        -- against the new composite PK. However, since the default org ID aligns, loose references might allow continued operation
        -- until full strictness is applied.
    END IF;
END $$;

-- 4. RESULTS: Add organization_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'results' AND column_name = 'organization_id') THEN
        ALTER TABLE results ADD COLUMN organization_id TEXT REFERENCES organizations(id);
        UPDATE results SET organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883' WHERE organization_id IS NULL;
    END IF;
END $$;

-- 5. EVALUATIONS: Add organization_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'organization_id') THEN
        ALTER TABLE evaluations ADD COLUMN organization_id TEXT REFERENCES organizations(id);
        UPDATE evaluations SET organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883' WHERE organization_id IS NULL;
    END IF;
END $$;

-- 6. SETTINGS: Add organization_id and update PK
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'organization_id') THEN
        ALTER TABLE settings ADD COLUMN organization_id TEXT REFERENCES organizations(id);
        UPDATE settings SET organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883' WHERE organization_id IS NULL;
        ALTER TABLE settings DROP CONSTRAINT settings_pkey CASCADE;
        ALTER TABLE settings ADD PRIMARY KEY (key, organization_id);
    END IF;
END $$;

-- 7. USERS: Add organization_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'organization_id') THEN
        ALTER TABLE users ADD COLUMN organization_id TEXT REFERENCES organizations(id);
        UPDATE users SET organization_id = '55147170-54ed-4fdd-840b-66f81cbc1883' WHERE organization_id IS NULL;
    END IF;
END $$;

-- 8. CONSTRAINT: Unique Admin Email per Organization
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_admin_email_key') THEN
        ALTER TABLE organizations ADD CONSTRAINT organizations_admin_email_key UNIQUE (admin_email);
    END IF;
END $$;


