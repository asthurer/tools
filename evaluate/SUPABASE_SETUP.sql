
-- Supabase Schema for Data Operations Portal

-- 1. SECTIONS MASTER TABLE
CREATE TABLE IF NOT EXISTS sections (
  name TEXT PRIMARY KEY,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial sections
INSERT INTO sections (name) 
VALUES ('SQL Basics'), ('IQ'), ('Behavioural'), ('Analytical Ability')
ON CONFLICT (name) DO NOTHING;

-- 2. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL REFERENCES sections(name) ON UPDATE CASCADE,
  difficulty TEXT NOT NULL,
  text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option CHAR(1) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RESULTS TABLE
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
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

-- 4. EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
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

-- 5. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Disable Row Level Security (RLS)
ALTER TABLE sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
