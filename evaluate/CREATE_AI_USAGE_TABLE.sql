-- Create ai_usage table for tracking daily AI requests
CREATE TABLE IF NOT EXISTS ai_usage (
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    requests_made INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (organization_id, usage_date)
);

-- Comment for clarity
COMMENT ON TABLE ai_usage IS 'Tracks total AI requests made by each organization per day';
COMMENT ON COLUMN ai_usage.requests_made IS 'Number of AI requests made on usage_date';

-- Function to atomically increment AI usage
CREATE OR REPLACE FUNCTION increment_ai_usage(org_id TEXT, usage_date_val DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO ai_usage (organization_id, usage_date, requests_made)
    VALUES (org_id, usage_date_val, 1)
    ON CONFLICT (organization_id, usage_date)
    DO UPDATE SET requests_made = ai_usage.requests_made + 1;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for RPC access
GRANT EXECUTE ON FUNCTION increment_ai_usage(TEXT, DATE) TO anon, authenticated;
