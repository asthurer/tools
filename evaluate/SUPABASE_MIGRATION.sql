-- Migration to Normalized Schema
-- Run this in Supabase SQL Editor

-- 1. Ensure candidates table exists (Prerequisite)
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT DEFAULT 'Registered',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, organization_id)
);

-- 2. Update RESULTS table
-- Add columns if missing
ALTER TABLE results ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(id);
ALTER TABLE results ADD COLUMN IF NOT EXISTS is_deleted INTEGER DEFAULT 0;

-- Drop redundant columns
ALTER TABLE results DROP COLUMN IF EXISTS candidate_name;
ALTER TABLE results DROP COLUMN IF EXISTS candidate_email;


-- 3. Update EVALUATIONS table
-- Add columns if missing
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(id);
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS is_deleted INTEGER DEFAULT 0;

-- Drop redundant columns
ALTER TABLE evaluations DROP COLUMN IF EXISTS candidate_email;
-- Note: 'interviewer_name' was removed in your setup file, dropping it here too if you intend to remove it. 
-- However, make sure you have a way to track the interviewer (e.g. user_id) if you do this. 
-- Uncomment the next line if you are sure:
-- ALTER TABLE evaluations DROP COLUMN IF EXISTS interviewer_name;
