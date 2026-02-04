-- setup.sql
-- Subapase Schema DDL for Data Operations Portal

-- 1. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT organizations_admin_email_key UNIQUE (admin_email)
);

-- 2. SECTIONS MASTER TABLE
CREATE TABLE IF NOT EXISTS sections (
  name TEXT,
  organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (name, organization_id)
);

-- 3. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  section_name TEXT NOT NULL,
  organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c',
  difficulty TEXT NOT NULL,
  text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option CHAR(1) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (section_name, organization_id) REFERENCES sections(name, organization_id) ON UPDATE CASCADE
);

-- 4. RESULTS TABLE
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c',
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  total_time_taken_sec INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  attempted_count INTEGER NOT NULL,
  missed_count INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  avg_time_per_answered_sec DECIMAL NOT NULL,
  score_percent DECIMAL NOT NULL,
  answers_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c',
  candidate_email TEXT NOT NULL,
  interviewer_name TEXT NOT NULL,
  level TEXT NOT NULL,
  ratings JSONB NOT NULL,
  notes JSONB NOT NULL,
  final_outcome TEXT NOT NULL,
  final_comments TEXT,
  submitted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
  key TEXT,
  organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c',
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (key, organization_id)
);

-- 7. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c',
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('super_admin', 'admin')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT REFERENCES organizations(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT DEFAULT 'Registered',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, organization_id)
);

-- Disable Row Level Security (RLS)
ALTER TABLE sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
