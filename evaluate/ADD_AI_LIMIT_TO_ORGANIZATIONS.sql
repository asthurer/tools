-- Add ai_limit column to organizations table
-- Default value is 0 (no free AI requests)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS ai_limit INTEGER DEFAULT 0;

-- Comment on column for clarity
COMMENT ON COLUMN organizations.ai_limit IS 'Total number of free AI requests allowed for this organization';
